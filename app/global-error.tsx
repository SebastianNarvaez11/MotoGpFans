"use client";

/**
 * Última red de seguridad de Next.js.
 *
 * Se activa solo cuando falla el propio layout raíz, es decir, cuando el
 * `error.tsx` de la ruta no llegó ni a montarse. Por eso trae su propio
 * `<html>` y `<body>`, y por eso no usa traducciones ni componentes del
 * proyecto: si algo de eso estuviera roto, esta pantalla también lo estaría.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08080b",
          color: "#f4f4f6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "24rem" }}>
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "20px",
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Algo salió mal
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: 14, opacity: 0.6 }}>
            No pudimos cargar la página.
            {error.digest ? ` (ref: ${error.digest})` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#e0182e",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
