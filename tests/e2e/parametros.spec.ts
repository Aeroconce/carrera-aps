// Parámetros (doc 05 §10, doc 13 F12, BT 5): nueva versión de una regla con vigencia (la anterior se cierra),
// establecimientos. Deshace al final lo que creó. Sesión del ADMIN de demostración; en serie.

import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const capturas = process.env.E2E_CAPTURAS === "1";
const FUENTE_E2E = "Decreto E2E parámetros";
const ESTABLECIMIENTO_E2E = "Posta E2E";

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
  const creada = await prisma.reglaCarrera.findFirst({ where: { fuente: FUENTE_E2E } });
  if (creada) {
    // Reabre la versión que se cerró el día anterior a la nueva vigencia
    const cierre = new Date(creada.vigenteDesde.getTime() - 86_400_000);
    await prisma.reglaCarrera.updateMany({ where: { institucionId: creada.institucionId, tipo: creada.tipo, categoria: creada.categoria, vigenteHasta: cierre }, data: { vigenteHasta: null } });
    await prisma.reglaCarrera.delete({ where: { id: creada.id } });
  }
  await prisma.establecimiento.deleteMany({ where: { nombre: ESTABLECIMIENTO_E2E } });
}

test.describe("parámetros", () => {
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

  test("muestra las reglas vigentes con su historial", async () => {
    await page.goto("/parametros");
    await expect(page.getByRole("heading", { name: "Parámetros", level: 1 })).toBeVisible();
    const tope = page.locator("li").filter({ has: page.getByRole("heading", { name: "Tope anual de capacitación" }) });
    await expect(tope).toContainText("tope");
    await expect(tope).toContainText("10");
    await expect(tope.getByText(/Historial de versiones \(2\)/)).toBeVisible();
    await capturar(page, "parametros", proyecto);
    await sinViolacionesAxe(page);
  });

  test("nueva versión de una regla con vigencia futura y validación de parámetros", async () => {
    await page.goto("/parametros");
    const tope = page.locator("li").filter({ has: page.getByRole("heading", { name: "Tope anual de capacitación" }) });
    await tope.getByRole("button", { name: "Nueva versión" }).click();
    const dialogo = page.getByRole("dialog", { name: "Nueva versión: Tope anual de capacitación" });
    await expect(dialogo.getByText("los reportes a fechas anteriores no cambian")).toBeVisible();

    // Parámetros inválidos: el servidor los rechaza con el detalle del campo
    await dialogo.getByLabel("Vigente desde").fill("01/01/2027");
    await dialogo.getByLabel("Fuente").fill(FUENTE_E2E);
    await dialogo.getByLabel("Parámetros (JSON)").fill('{ "tope": "doce" }');
    await dialogo.getByRole("button", { name: "Guardar versión" }).click();
    await expect(dialogo.getByText(/tope:/)).toBeVisible();

    await dialogo.getByLabel("Parámetros (JSON)").fill('{ "tope": 12 }');
    await capturar(page, "parametros-nueva-version", proyecto);
    await dialogo.getByRole("button", { name: "Guardar versión" }).click();
    await expect(page.getByText("Nueva versión de la regla guardada")).toBeVisible();

    await expect(tope.getByText(/Historial de versiones \(3\)/)).toBeVisible();
    const creada = await prisma.reglaCarrera.findFirstOrThrow({ where: { fuente: FUENTE_E2E } });
    expect(creada.vigenteDesde.toISOString().slice(0, 10)).toBe("2027-01-01");
    const anterior = await prisma.reglaCarrera.findFirst({ where: { tipo: "TOPE_CAPACITACION_ANUAL", categoria: null, vigenteHasta: new Date("2026-12-31T00:00:00.000Z") } });
    expect(anterior).not.toBeNull();
    // Auditado como CAMBIO_REGLA
    const cambio = await prisma.auditoria.findFirst({ where: { accion: "CAMBIO_REGLA", entidadId: creada.id } });
    expect(cambio).not.toBeNull();
  });

  test("establecimientos: crear y desactivar", async () => {
    await page.goto("/parametros");
    await page.getByRole("button", { name: "Nuevo establecimiento" }).click();
    const dialogo = page.getByRole("dialog", { name: "Nuevo establecimiento" });
    await dialogo.getByLabel("Nombre").fill(ESTABLECIMIENTO_E2E);
    await dialogo.getByLabel("Tipo").selectOption("POSTA");
    await dialogo.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText("Establecimiento creado")).toBeVisible();
    const fila = page.getByRole("row").filter({ hasText: ESTABLECIMIENTO_E2E });
    await expect(fila).toContainText("Posta");
    await expect(fila).toContainText("Activo");

    await fila.getByRole("button", { name: "Editar" }).click();
    const editar = page.getByRole("dialog", { name: "Editar establecimiento" });
    await editar.getByRole("checkbox", { name: /Activo/ }).uncheck();
    await editar.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Establecimiento guardado")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: ESTABLECIMIENTO_E2E })).toContainText("Inactivo");
  });
});
