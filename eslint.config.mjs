import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Accesibilidad: requisito production-ready, no un extra opcional.
      // eslint-config-next ya registra el plugin jsx-a11y y activa un subconjunto
      // de reglas; aquí se aplica el conjunto "recommended" completo. Se copian
      // solo las reglas —no el config entero— porque redeclarar un plugin ya
      // registrado es un error en flat config.
      ...jsxA11y.flatConfigs.recommended.rules,
      // Las variables sin usar prefijadas con _ son intencionales.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "app/generated/**",
    "artboards-de-dise-o-motorsport/**",
  ]),
]);

export default eslintConfig;
