// Configuración de Vitest (doc 16). Tests unitarios en tests/**, entorno Node; el alias @ apunta a src/
// igual que en tsconfig.json. Los tests de componentes (jsdom) y los E2E (Playwright) se agregan en sus fases.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
