// Capturas de las pantallas principales con la sesión del ADMIN de demostración (SEED_ADMIN_* en .env), para
// revisión visual durante la construcción. Se activa con E2E_CAPTURAS=1; guarda en test-results/capturas/.
// No es una prueba de regresión (doc 09 las descartó): no compara imágenes, solo las produce.
// Entra una sola vez por proyecto (el límite de intentos es por IP) y limpia el contador antes.

import "dotenv/config";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const activo = process.env.E2E_CAPTURAS === "1";
const rutas = (process.env.E2E_RUTAS ?? "/,/funcionarios").split(",").map((r) => r.trim()).filter(Boolean);

async function entrarComoAdmin(page: Page) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Faltan SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env");
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("capturas", () => {
  test.skip(!activo, "Solo con E2E_CAPTURAS=1");
  test.describe.configure({ mode: "serial" });

  let contexto: BrowserContext;
  let page: Page;
  const errores: string[] = [];

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    await prisma.rateLimit.deleteMany();
    contexto = await browser.newContext(testInfo.project.use);
    page = await contexto.newPage();
    page.on("pageerror", (e) => errores.push(e.message));
    await entrarComoAdmin(page);
  });

  test.afterAll(async () => {
    await contexto?.close();
    await prisma.$disconnect();
  });

  for (const ruta of rutas) {
    test(`captura de ${ruta}`, async ({}, testInfo) => {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      const nombre = ruta === "/" ? "inicio" : ruta.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
      await page.screenshot({ path: `test-results/capturas/${nombre}-${testInfo.project.name}.png`, fullPage: true });
      expect(errores, "errores de página").toEqual([]);
    });
  }
});
