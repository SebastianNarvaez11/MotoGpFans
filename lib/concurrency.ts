/**
 * Recorre una lista ejecutando `worker` sobre cada elemento con un número
 * máximo de tareas en vuelo.
 *
 * Se usa para las descargas de clasificaciones: en serie son cientos de
 * peticiones encadenadas (minutos), y sin límite serían cientos simultáneas
 * contra un servidor ajeno y gratuito. El punto medio es un puñado a la vez.
 *
 * Conserva el orden de la entrada en el resultado.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]!, index);
      }
    },
  );

  await Promise.all(runners);
  return results;
}
