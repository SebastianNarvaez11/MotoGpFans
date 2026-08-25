/**
 * Nombre de la cookie donde se recuerda la zona horaria elegida.
 *
 * Vive en su propio módulo —sin `server-only`— porque lo necesitan los dos
 * lados: el servidor para leerla al renderizar y el selector, que corre en el
 * navegador, para escribirla.
 */
export const TIMEZONE_COOKIE = "mgpf_tz";
