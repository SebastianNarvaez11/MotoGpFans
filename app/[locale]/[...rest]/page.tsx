import { notFound } from "next/navigation";

/**
 * Captura cualquier ruta desconocida dentro de un idioma.
 *
 * Next.js solo renderiza `not-found.tsx` cuando alguien llama a `notFound()`,
 * no ante cualquier URL inexistente. Sin esta ruta comodín, `/es/lo-que-sea`
 * mostraría la pantalla genérica de Next: fondo blanco, en inglés y fuera del
 * diseño.
 *
 * Limitación conocida y asumida: la respuesta sale con estado 200 en lugar de
 * 404 ("404 blando"). Un `not-found.tsx` anidado bajo [locale] renderiza pero
 * no puede fijar el estado, y la alternativa oficial de Next 16
 * (`global-not-found.tsx`, tras bandera experimental) tampoco lo consigue aquí
 * porque esta ruta captura primero — se probó y se descartó. Se acepta porque
 * nadie enlaza a direcciones inexistentes y los buscadores detectan estos casos.
 */
export default function CatchAllPage(): never {
  notFound();
}
