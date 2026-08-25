import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // `server-only` lanza al importarse fuera de un Server Component. El
      // propio paquete trae un módulo vacío para esos entornos (es el que usa
      // Next.js con la condición "react-server"), pero su mapa de `exports` no
      // publica ese subpath, así que se referencia por ruta absoluta. Así se
      // pueden testear los módulos de servidor sin renunciar a la marca en
      // producción.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["lib/**", "components/**"],
    },
  },
});
