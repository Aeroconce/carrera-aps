// Pruebas de extremo a extremo (doc 16): los flujos del doc 13 en tres viewports, todos en Chromium.
// Los descriptores de iPad e iPhone aportan viewport, escala, táctil y user agent; el motor lo fija browserName.
// La preparación global (tests/e2e/global-setup.ts) deja un usuario de prueba con contraseña aleatoria en
// process.env, así ninguna credencial vive en el repositorio ni en la salida de las pruebas.

import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // El límite de intentos de inicio de sesión es por IP: los casos corren en serie, en un solo worker
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], browserName: "chromium" },
    },
    {
      name: "celular",
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
