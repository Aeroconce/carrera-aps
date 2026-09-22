// Alertas (doc 13 F7, subcriterios 8 y 13) y bitácora (doc 13 F10, subcriterio 14): sincronización, atender con
// nota, descartar con motivo, coherencia con el panel de Reportes, auditoría con valor anterior y nuevo,
// exportación de la bitácora y registro de accesos. Sesión del ADMIN de demostración; en serie.
// Al final devuelve a ACTIVA las alertas que cerró, para no alterar la demostración.

import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const capturas = process.env.E2E_CAPTURAS === "1";
const NOTA_ATENDER = "Decreto en trámite (prueba E2E)";
const NOTA_DESCARTAR = "Certificado en papel en la carpeta (prueba E2E)";

async function entrarComoAdmin(page: Page) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Faltan SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env");
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  // Arranque en frío del servidor de desarrollo: la primera entrada compila varias rutas
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function sinViolacionesAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(resultado.violations, JSON.stringify(resultado.violations, null, 2)).toEqual([]);
}

async function capturar(page: Page, nombre: string, proyecto: string) {
  if (capturas) await page.screenshot({ path: `capturas/${nombre}-${proyecto}.png`, fullPage: true });
}

async function restaurarAlertasDePrueba() {
  await prisma.alerta.updateMany({
    where: { resolucionNota: { in: [NOTA_ATENDER, NOTA_DESCARTAR] } },
    data: { estado: "ACTIVA", atendidaEl: null, atendidaPorId: null, resolucionNota: null },
  });
}

test.describe("alertas y auditoría", () => {
  test.describe.configure({ mode: "serial" });

  let contexto: BrowserContext;
  let page: Page;
  let proyecto = "";
  let mensajeDescartado = "";
  const errores: string[] = [];

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    proyecto = testInfo.project.name;
    await prisma.rateLimit.deleteMany();
    await restaurarAlertasDePrueba();
    contexto = await browser.newContext(testInfo.project.use);
    page = await contexto.newPage();
    page.on("pageerror", (e) => errores.push(e.message));
    await entrarComoAdmin(page);
  });

  test.afterAll(async () => {
    await contexto?.close();
    await restaurarAlertasDePrueba();
    await prisma.$disconnect();
  });

  test.afterEach(() => {
    expect(errores, "errores de página").toEqual([]);
  });

  test("el módulo sincroniza con el cálculo y lista las alertas activas", async () => {
    await page.goto("/alertas");
    await expect(page.getByRole("heading", { name: "Alertas", level: 1 })).toBeVisible();
    // Carmen (doc 14): bienio 10 cumplido el 01/06/2025 sin decreto
    const fila = page.locator("tr, li").filter({ visible: true }).filter({ hasText: "Riquelme Vidal" }).filter({ hasText: "Bienio sin reconocer" });
    await expect(fila.first()).toBeVisible();
    await expect(page.getByText(/^\d+ alertas activas$/)).toBeVisible();
    await capturar(page, "alertas", proyecto);
    await sinViolacionesAxe(page);
  });

  test("atender una alerta con nota", async () => {
    await page.goto("/alertas?q=Riquelme&tipo=BIENIO_PENDIENTE_RECONOCER");
    const fila = page.locator("tr, li").filter({ visible: true }).filter({ hasText: "Riquelme Vidal" }).first();
    await fila.getByRole("button", { name: "Atender" }).click();
    const dialogo = page.getByRole("dialog", { name: "Atender alerta" });
    await dialogo.getByLabel("Nota").fill(NOTA_ATENDER);
    await capturar(page, "alertas-atender", proyecto);
    await dialogo.getByRole("button", { name: "Atender", exact: true }).click();
    await expect(page.getByText("Alerta atendida")).toBeVisible();
    await expect(dialogo).toBeHidden();

    await page.goto("/alertas?q=Riquelme&estado=ATENDIDA");
    const atendida = page.locator("tr, li").filter({ visible: true }).filter({ hasText: NOTA_ATENDER });
    await expect(atendida.first()).toBeVisible();
    await expect(atendida.first()).toContainText("Atendida");
  });

  test("descartar una alerta con motivo y que el panel de Reportes la omita", async () => {
    // Cualquier alerta activa de documento faltante de la demo (la dotación cambia con el seed)
    const alerta = await prisma.alerta.findFirstOrThrow({ where: { tipo: "DOCUMENTO_FALTANTE", estado: "ACTIVA" }, include: { funcionario: true } });
    mensajeDescartado = alerta.mensaje;
    await page.goto(`/alertas?q=${encodeURIComponent(alerta.funcionario.apellidos.split(" ")[0]!)}&tipo=DOCUMENTO_FALTANTE`);
    const fila = page.locator("tr, li").filter({ visible: true }).filter({ hasText: mensajeDescartado }).first();
    await expect(fila).toBeVisible();
    await fila.getByRole("button", { name: "Descartar" }).click();
    const dialogo = page.getByRole("dialog", { name: "Descartar alerta" });
    await dialogo.getByLabel("Motivo").fill(NOTA_DESCARTAR);
    await dialogo.getByRole("button", { name: "Descartar", exact: true }).click();
    await expect(page.getByText("Alerta descartada")).toBeVisible();

    await page.goto(`/alertas?q=${encodeURIComponent(alerta.funcionario.apellidos.split(" ")[0]!)}&estado=DESCARTADA`);
    await expect(page.locator("tr, li").filter({ visible: true }).filter({ hasText: NOTA_DESCARTAR }).first()).toBeVisible();

    await page.goto("/reportes/alertas?alcance=dotacion");
    await expect(page.getByRole("heading", { name: "Panel de alertas" })).toBeVisible();
    await expect(page.getByText(mensajeDescartado, { exact: true })).toHaveCount(0);
  });

  test("sincronizar ahora informa el resultado", async () => {
    await page.goto("/alertas");
    await page.getByRole("button", { name: "Sincronizar ahora" }).click();
    await expect(page.getByText(/^Alertas sincronizadas:/)).toBeVisible();
    // La alerta atendida a mano no vuelve a activarse mientras el hecho no cambie
    await page.goto("/alertas?q=Riquelme&tipo=BIENIO_PENDIENTE_RECONOCER");
    await expect(page.locator("tr, li").filter({ visible: true }).filter({ hasText: "Riquelme Vidal" }).filter({ hasText: "Bienio sin reconocer" })).toHaveCount(0);
  });

  test("la bitácora muestra el valor anterior y el nuevo, y se exporta", async () => {
    await page.goto("/auditoria?entidad=Alerta&accion=EDITAR");
    await expect(page.getByRole("heading", { name: "Auditoría", level: 1 })).toBeVisible();
    const fila = page.locator("tr, li").filter({ visible: true }).filter({ hasText: `Atendida: ${NOTA_ATENDER}` }).first();
    await expect(fila).toBeVisible();
    await fila.getByRole("button", { name: "Ver cambios" }).click();
    const dialogo = page.getByRole("dialog", { name: /Edición · Alerta/ });
    await expect(dialogo).toBeVisible();
    const filaEstado = dialogo.getByRole("row").filter({ hasText: "Estado" });
    await expect(filaEstado).toContainText("ACTIVA");
    await expect(filaEstado).toContainText("ATENDIDA");
    await expect(dialogo.getByRole("row").filter({ hasText: "Nota de resolución" })).toContainText(NOTA_ATENDER);
    await capturar(page, "auditoria-detalle", proyecto);
    await sinViolacionesAxe(page);
    await dialogo.getByRole("button", { name: "Cerrar" }).click();

    const csv = await page.request.get("/auditoria/exportar?entidad=Alerta&accion=EDITAR&formato=csv");
    expect(csv.status()).toBe(200);
    const texto = await csv.text();
    expect(texto).toContain("Fecha;Usuario;Acción");
    expect(texto).toContain(NOTA_ATENDER);

    const xlsx = await page.request.get("/auditoria/exportar?formato=xlsx");
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
  });

  test("filtro por funcionario y registro de accesos", async () => {
    const carmen = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Riquelme" } } });
    await page.goto(`/auditoria?funcionario=${carmen.id}`);
    await expect(page.locator("tr, li").filter({ visible: true }).filter({ hasText: "Riquelme Vidal" }).first()).toBeVisible();
    await expect(page.locator("tr, li").filter({ visible: true }).filter({ hasText: "Pérez Soto" })).toHaveCount(0);

    await page.goto("/auditoria/accesos");
    await expect(page.getByRole("heading", { name: "Registro de accesos" })).toBeVisible();
    await expect(page.locator("tr").filter({ hasText: "Exitoso" }).first()).toBeVisible();
    await capturar(page, "accesos", proyecto);
  });
});
