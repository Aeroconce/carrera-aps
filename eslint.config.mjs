import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Escrituras de Prisma que deben pasar por conAuditoria (src/lib/db/auditado.ts), doc 15.
const METODOS_DE_ESCRITURA =
  "/^(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)$/";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cliente Prisma generado
    "src/generated/**",
  ]),
  {
    // Reglas propias del proyecto (doc 15: calidad automática)
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Ninguna escritura fuera de src/lib/db: se hacen dentro del callback de conAuditoria, con el cliente `tx`.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `CallExpression > MemberExpression.callee[property.name=${METODOS_DE_ESCRITURA}] > MemberExpression.object[object.name="prisma"]`,
          message:
            "Las escrituras en la base van dentro de conAuditoria (src/lib/db/auditado.ts) usando el cliente `tx` (doc 15).",
        },
        {
          selector: `CallExpression > MemberExpression.callee[object.name="prisma"][property.name=/^\\$(transaction|executeRaw|executeRawUnsafe|queryRawUnsafe)$/]`,
          message:
            "Las transacciones y el SQL de escritura van en src/lib/db, detrás de conAuditoria (doc 15).",
        },
      ],
    },
  },
]);

export default eslintConfig;
