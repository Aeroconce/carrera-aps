// Reportes (doc 13 F8; doc 16): índice con los nueve reportes y el panel de alertas, un reporte con
// "Situación al" y los tres alcances, y las descargas XLSX, CSV y PDF con auditoría EXPORTAR.
// Sesión del ADMIN de demostración (SEED_ADMIN_* en .env); en serie.

import "dotenv/config";
import { writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const capturas = process.env.E2E_CAPTURAS === "1";

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

async function sinViolacionesAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(resultado.violations, JSON.stringify(resultado.violations, null, 2)).toEqual([]);
}

async function capturar(page: Page, nombre: string, proyecto: string) {
  if (capturas) await page.screenshot({ path: `test-results/capturas/reportes-${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("reportes", () => {
  test.describe.configure({ mode: "serial" });

  let contexto: BrowserContext;
  let page: Page;
  let proyecto = "";
  const errores: string[] = [];

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    proyecto = testInfo.project.name;
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

  test.afterEach(() => {
    expect(errores, "errores de página").toEqual([]);
  });

  test("el índice lista los nueve reportes y el panel de alertas", async () => {
    await page.goto("/reportes");
    await expect(page.getByRole("heading", { name: "Reportes", level: 1 })).toBeVisible();
    for (const nombre of [
      "Nómina de funcionarios",
      "Resumen de carrera funcionaria",
      "Experiencia y bienios reconocidos",
      "Historial de capacitaciones",
      "Cambios de nivel",
      "Resultados de calificaciones",
      "Proyección de cambios de nivel",
      "Reportes históricos a fechas determinadas",
      "Nómina con asignación de mérito",
      "Panel de alertas",
    ]) {
      await expect(page.getByRole("heading", { name: nombre, exact: true })).toBeVisible();
    }
    await capturar(page, "indice", proyecto);
    await sinViolacionesAxe(page);
  });

  test("resumen de carrera: situación al día y a una fecha pasada", async () => {
    await page.goto("/reportes/carrera");
    await expect(page.getByRole("heading", { name: "2. Resumen de carrera funcionaria" })).toBeVisible();
    await expect(page.getByText(/^Situación al \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
    // María Pérez (doc 14): 129 puntos hoy, nivel 9
    const maria = page.getByRole("row").filter({ hasText: "Pérez Soto" });
    await expect(maria).toContainText("129");
    await capturar(page, "carrera", proyecto);
    await sinViolacionesAxe(page);

    // A la fecha de apertura: 105 puntos, nivel 10, con las reglas vigentes entonces
    await page.goto("/reportes/carrera?alcance=dotacion&fecha=2024-12-31");
    await expect(page.getByText("Situación al 31/12/2024")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Pérez Soto" })).toContainText("105");
  });

  test("alcance por funcionario y por establecimiento", async () => {
    const maria = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Pérez" } }, include: { establecimiento: true } });
    await page.goto(`/reportes/nomina?alcance=funcionario&funcionario=${maria.id}`);
    await expect(page.getByText(`Funcionario: ${maria.nombres} ${maria.apellidos}`)).toBeVisible();
    await expect(page.locator("dd").filter({ hasText: /· 1 funcionario$/ })).toBeVisible();

    await page.goto(`/reportes/nomina?alcance=establecimiento&establecimiento=${maria.establecimientoId}`);
    await expect(page.getByText(`Establecimiento: ${maria.establecimiento.nombre}`)).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Pérez Soto" })).toBeVisible();
  });

  test("descargas XLSX, CSV y PDF con auditoría EXPORTAR", async () => {
    const antes = await prisma.auditoria.count({ where: { accion: "EXPORTAR" } });
    const base = "/reportes/carrera/exportar?alcance=dotacion&fecha=2026-09-21";

    const xlsx = await page.request.get(`${base}&formato=xlsx`);
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    expect(xlsx.headers()["content-disposition"]).toContain("carrera_al_2026-09-21.xlsx");
    const cuerpoXlsx = await xlsx.body();
    expect(cuerpoXlsx.subarray(0, 2).toString("latin1")).toBe("PK");
    if (capturas) writeFileSync(`test-results/capturas/reportes-carrera-${proyecto}.xlsx`, cuerpoXlsx);

    const csv = await page.request.get(`${base}&formato=csv`);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const texto = await csv.text();
    expect(texto).toContain("RUT;Nombre;Categoría");
    expect(texto).toContain("Pérez Soto");

    const pdf = await page.request.get(`${base}&formato=pdf`, { timeout: 90_000 });
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    const cuerpoPdf = await pdf.body();
    expect(cuerpoPdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(cuerpoPdf.length).toBeGreaterThan(5_000);
    if (capturas) writeFileSync(`test-results/capturas/reportes-carrera-${proyecto}.pdf`, cuerpoPdf);

    const despues = await prisma.auditoria.count({ where: { accion: "EXPORTAR" } });
    expect(despues - antes).toBe(3);
  });

  test("la vista de impresión rechaza un token inválido", async () => {
    const respuesta = await page.request.get("/imprimir/reportes/carrera?token=abc.def");
    expect(respuesta.status()).toBe(404);
  });

  test("panel de alertas dentro de reportes", async () => {
    await page.goto("/reportes/alertas");
    await expect(page.getByRole("heading", { name: "Panel de alertas" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Fecha del hito" })).toBeVisible();
    await capturar(page, "alertas", proyecto);
  });
});
