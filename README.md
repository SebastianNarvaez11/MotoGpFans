# MotoGP Fans

Los horarios de MotoGP en **tu** hora local.

Si eres aficionado y no vives en Europa, sabes el problema: el calendario
oficial publica las sesiones en la hora del circuito y toca hacer la cuenta cada
fin de semana. Este sitio hace esa conversión por ti, y de paso muestra el
calendario completo, la clasificación del campeonato y los resultados.

> Proyecto de aficionados, sin relación oficial con Dorna Sports ni MotoGP™.
> Sin ánimo de lucro y sin publicidad.

---

## Qué hace

- **Horarios en tu zona horaria.** Se detecta la del dispositivo y puedes
  cambiarla desde cualquier pantalla; la elección se recuerda.
- **Calendario** de los 22 Grandes Premios de la temporada.
- **Clasificación** del campeonato de pilotos en MotoGP, Moto2 y Moto3.
- **Resultados** de las sesiones ya corridas.
- Español e inglés, y diseño pensado primero para el móvil.

## Cómo está hecho

| Capa               | Elección                                        |
| ------------------ | ----------------------------------------------- |
| Framework          | Next.js 16 (App Router) · React 19 · TypeScript |
| Estilos            | Tailwind CSS v4                                 |
| Idiomas            | next-intl                                       |
| Base de datos      | PostgreSQL (Neon) con Prisma                    |
| Despliegue         | Vercel                                          |
| Ingesta programada | GitHub Actions                                  |

### De dónde salen los datos

No hay scraping. La web de motogp.com consume un backend JSON propio
(`api.motogp.pulselive.com`) que es público y sin autenticación, y **este
proyecto pide los datos al mismo sitio**. No se interpreta HTML, así que un
rediseño de su web no rompe nada.

Como es una API sin documentar y puede cambiar sin aviso, **nada llega a la base
de datos sin validarse** antes contra un esquema propio ([`lib/motogp/schemas.ts`](lib/motogp/schemas.ts)).
Si el contrato cambia, la ingesta falla de forma ruidosa en lugar de guardar
datos corruptos. Esa capa ya evitó dos errores reales: puntos con decimales que
se habrían truncado, y eventos sin circuito mezclados en el calendario.

```
API de MotoGP  →  Validación (Zod)  →  Traductores  →  PostgreSQL
                  ¿tiene la forma?     su forma →       instantes
                  si no: falla ya      la nuestra       en UTC
```

### El detalle que lo sostiene todo: las horas

**Toda marca temporal se guarda en UTC.** La conversión a la hora de cada
visitante ocurre solo al renderizar, con `Intl.DateTimeFormat`. Así "hora de
Colombia" no es un caso especial: es una zona más entre cientos.

La zona elegida viaja en una **cookie**, no en `localStorage`, para que el
servidor ya envíe el HTML con las horas correctas. Sin ese detalle, la primera
pintura mostraría una hora equivocada y saltaría al corregirse.

### Cuándo se actualizan los datos

Dos ritmos, ambos disparados por GitHub Actions:

- **Diario** (04:30 UTC) — calendario, pilotos, clasificación y resultados.
- **Sábados y domingos, cada hora** — solo clasificación y resultados.

La cadencia sale de los datos: en toda la temporada **no hay ni una sesión en
lunes**, y jueves y viernes solo tienen entrenamientos, que no reparten puntos.
Las sesiones que mueven el campeonato son el Sprint (sábado) y la Carrera
(domingo).

Antes de descargar nada, la ingesta comprueba **en la propia base de datos** si
ha terminado alguna sesión puntuable desde la última vez. En los ~30 fines de
semana del año sin Gran Premio, la ejecución termina en milisegundos sin llamar
ni una vez a la API.

Todas las escrituras son _upserts_ sobre claves naturales, así que la ingesta es
**idempotente**: ejecutarla mil veces deja exactamente el mismo estado.

---

## Ponerlo en marcha

Necesitas Node 20+ y Docker.

```bash
git clone <este-repo> && cd MotoGpFans
npm install

cp .env.example .env          # y genera un secreto:  openssl rand -base64 32

docker compose up -d          # PostgreSQL local en el puerto 5433
npm run db:deploy             # aplica las migraciones
npm run db:seed               # siembra las categorías

npm run dev                   # http://localhost:3000
```

La base arranca vacía. Para llenarla con la temporada real:

```bash
curl -X POST "http://localhost:3000/api/ingest?preset=full" \
  -H "Authorization: Bearer $(grep INGEST_SECRET .env | cut -d'"' -f2)"
```

### Comandos

| Comando              | Qué hace                                            |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                              |
| `npm run verify`     | Formato + lint + tipos + tests (lo que corre en CI) |
| `npm run test`       | Solo los tests                                      |
| `npm run db:studio`  | Explorador visual de la base de datos               |
| `npm run db:migrate` | Crear una migración nueva                           |

### Variables de entorno

Documentadas en [`.env.example`](.env.example). Se validan al arrancar
([`lib/env.ts`](lib/env.ts)): si falta alguna, el proceso falla de inmediato con
un mensaje claro en vez de romperse más tarde de forma opaca.

---

## Decisiones que conviene conocer

**Por qué no se rellena el histórico de resultados.** Sincronizar la temporada
entera eran unas 290 peticiones encadenadas, más de quince minutos: inviable
frente al límite de duración de una función serverless. La ingesta trae solo el
último Gran Premio corrido y la base se va llenando carrera a carrera.

**Por qué las páginas no son estáticas.** Serían más rápidas, pero obligarían a
convertir las horas en el navegador: habría un parpadeo mostrando la hora del
circuito antes de corregirse, y sin JavaScript no se vería ninguna hora. En un
sitio que existe para dar horarios, eso no compensa. En su lugar **se cachean
los datos, no la página**: las consultas se reutilizan entre visitas y se
renuevan cuando corre la ingesta. Diez visitas seguidas provocan cero consultas
a la base de datos.

**Por qué claves naturales y no los UUID de la fuente.** La API expone **tres
espacios de identificadores distintos** para las mismas entidades: el del
calendario, el de resultados y el de pilotos usan UUID diferentes para MotoGP.
La identidad real en la base de datos son el año, el acrónimo y el código de
tres letras; cada UUID se guarda como columna puente.

## Licencia y marcas

Código bajo licencia MIT. Las marcas, nombres, imágenes y datos deportivos de
MotoGP™ pertenecen a Dorna Sports S.L. Este proyecto no está afiliado,
patrocinado ni respaldado por ellos.
