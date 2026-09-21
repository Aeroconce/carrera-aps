// Módulo Carrera (doc 05 §3, doc 13 F4.6: reconocimiento masivo) y módulo Capacitaciones (doc 05 §4).
// Sesión del ADMIN de demostración; en serie. Deshace al final lo que registró para no alterar la demo.

import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const capturas = process.env.E2E_CAPTURAS === "1";
const DECRETO_E2E = "D-E2E-MASIVO";
const CURSO_E2E = "Curso E2E desde el módulo";

async function entrarComoAdmin(page: Page) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Faltan SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env");
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function sinViolacionesAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(resultado.violations, JSON.stringify(resultado.violations, null, 2)).toEqual([]);
}

async function capturar(page: Page, nombre: string, proyecto: string) {
  if (capturas) await page.screenshot({ path: `capturas/${nombre}-${proyecto}.png`, fullPage: true });
}

async function deshacer() {
  await prisma.bienio.deleteMany({ where: { decretoNumero: DECRETO_E2E } });
  const cursos = await prisma.capacitacion.findMany({ where: { nombre: CURSO_E2E }, select: { id: true, funcionarioId: true } });
  await prisma.capacitacion.deleteMany({ where: { nombre: CURSO_E2E } });
  for (const c of cursos) {
    // Vuelve a repartir los puntajes del funcionario sin la actividad borrada
    await prisma.excedenteCapacitacion.deleteMany({ where: { funcionarioId: c.funcionarioId } });
  }
}

test.describe("carrera y capacitaciones", () => {
  test.describe.configure({ mode: "serial" });

  let contexto: BrowserContext;
  let page: Page;
  let proyecto = "";
  const errores: string[] = [];

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    proyecto = testInfo.project.name;
    await prisma.rateLimit.deleteMany();
    await deshacer();
    contexto = await browser.newContext(testInfo.project.use);
    page = await contexto.newPage();
    page.on("pageerror", (e) => errores.push(e.message));
    await entrarComoAdmin(page);
  });

  test.afterAll(async () => {
    await contexto?.close();
    await deshacer();
    await prisma.$disconnect();
  });

  test.afterEach(() => {
    expect(errores, "errores de página").toEqual([]);
  });

  test("carrera: bienios por reconocer, ascensos y proyecciones", async () => {
    await page.goto("/carrera");
    await expect(page.getByRole("heading", { name: "Carrera", level: 1 })).toBeVisible();
    // Carmen: bienio 10 cumplido el 01/06/2025; Pedro: bienio 4 cumplido el 01/03/2026 (doc 14)
    const visibles = page.locator("tr, li").filter({ visible: true });
    await expect(visibles.filter({ hasText: "Riquelme Vidal" }).filter({ hasText: "01/06/2025" }).first()).toBeVisible();
    await expect(visibles.filter({ hasText: "Lagos Muñoz" }).filter({ hasText: "01/03/2026" }).first()).toBeVisible();
    await capturar(page, "carrera-bienios", proyecto);
    await sinViolacionesAxe(page);

    await page.getByRole("tab", { name: /Cumplen requisitos de ascenso/ }).click();
    await expect(page.getByRole("row").filter({ hasText: "Lagos Muñoz" })).toContainText("10");
    await capturar(page, "carrera-ascensos", proyecto);

    await page.getByRole("tab", { name: "Proyecciones" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Pérez Soto" })).toContainText("11");
  });

  test("carrera: reconocimiento masivo con un mismo decreto", async () => {
    await page.goto("/carrera");
    await page.getByRole("checkbox", { name: /Seleccionar Pedro Antonio Lagos Muñoz, bienio 4/ }).check();
    await expect(page.getByText("1 seleccionado")).toBeVisible();
    await page.getByRole("button", { name: "Reconocer seleccionados" }).click();
    const dialogo = page.getByRole("dialog", { name: "Reconocer bienios con un mismo decreto" });
    await dialogo.getByLabel("Número de decreto").fill(DECRETO_E2E);
    await dialogo.getByLabel("Fecha del decreto").fill("15/03/2026");
    await capturar(page, "carrera-masivo", proyecto);
    await dialogo.getByRole("button", { name: "Reconocer", exact: true }).click();
    await expect(page.getByText("1 bienio reconocido")).toBeVisible();
    await expect(page.locator("tr, li").filter({ visible: true }).filter({ hasText: "Lagos Muñoz" }).filter({ hasText: "01/03/2026" })).toHaveCount(0);
    const bienio = await prisma.bienio.findFirst({ where: { decretoNumero: DECRETO_E2E } });
    expect(bienio?.numero).toBe(4);

    await page.getByRole("button", { name: "Recalcular" }).click();
    await expect(page.getByText(/^Cálculo actualizado/)).toBeVisible();
  });

  test("capacitaciones: listado, por período y registro desde el módulo", async () => {
    await page.goto("/capacitaciones");
    await expect(page.getByRole("heading", { name: "Capacitaciones", level: 1 })).toBeVisible();
    await expect(page.locator("tr, li").filter({ visible: true }).filter({ hasText: "Diplomado en cuidados de enfermería" }).first()).toBeVisible();
    await capturar(page, "capacitaciones", proyecto);
    await sinViolacionesAxe(page);

    await page.goto("/capacitaciones?pestana=periodo&resumen=2025");
    await expect(page.getByText("Resumen del período 2025")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Lagos Muñoz" })).toBeVisible();

    await page.goto("/capacitaciones");
    await page.getByRole("button", { name: "Registrar capacitación" }).click();
    const dialogo = page.getByRole("dialog", { name: "Registrar capacitación" });
    const maria = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Pérez" } }, select: { id: true } });
    await dialogo.getByLabel("Funcionario").selectOption(maria.id);
    await dialogo.getByLabel("Nombre de la actividad").fill(CURSO_E2E);
    await dialogo.getByLabel("Institución que la dicta").fill("Instituto E2E");
    await dialogo.getByLabel("Horas").fill("24");
    await dialogo.getByLabel("Fecha de inicio").fill("01/06/2026");
    await dialogo.getByLabel("Fecha de término").fill("05/06/2026");
    await dialogo.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(page.getByText("Capacitación registrada")).toBeVisible();
    await expect(page.locator("tr, li").filter({ visible: true }).filter({ hasText: CURSO_E2E }).first()).toBeVisible();
  });
});
