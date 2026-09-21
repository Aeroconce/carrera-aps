// Flujos de la ficha (doc 13: F2 alta con saldo de apertura, F3 capacitación, F4 reconocer bienio, F5 cambio de
// nivel; doc 05 módulo 2: editar y dar de baja). Corre con la sesión del ADMIN de demostración (SEED_ADMIN_* en
// .env), en serie, y crea un funcionario de prueba que borra al final para no ensuciar la demostración.
// Con E2E_CAPTURAS=1 además guarda capturas de cada diálogo en test-results/capturas/.

import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";
import { generarRutConDv } from "../../src/lib/rut";

const RUT_PRUEBA = generarRutConDv(99_990_001);
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

async function borrarFuncionarioDePrueba() {
  const f = await prisma.funcionario.findFirst({ where: { rut: RUT_PRUEBA } });
  if (!f) return;
  const where = { funcionarioId: f.id };
  await prisma.excedenteCapacitacion.deleteMany({ where });
  await prisma.capacitacion.deleteMany({ where });
  await prisma.bienio.deleteMany({ where });
  await prisma.estudio.deleteMany({ where });
  await prisma.nivelHistorico.deleteMany({ where });
  await prisma.experiencia.deleteMany({ where });
  await prisma.apertura.deleteMany({ where });
  await prisma.funcionario.delete({ where: { id: f.id } });
}

async function sinViolacionesAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(resultado.violations, JSON.stringify(resultado.violations, null, 2)).toEqual([]);
}

async function capturar(page: Page, nombre: string, proyecto: string) {
  if (capturas) await page.screenshot({ path: `test-results/capturas/ficha-${nombre}-${proyecto}.png`, fullPage: true });
}

test.describe("ficha del funcionario", () => {
  test.describe.configure({ mode: "serial" });

  let contexto: BrowserContext;
  let page: Page;
  let proyecto = "";
  let fichaUrl = "";
  const errores: string[] = [];

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    proyecto = testInfo.project.name;
    await prisma.rateLimit.deleteMany();
    await borrarFuncionarioDePrueba();
    contexto = await browser.newContext(testInfo.project.use);
    page = await contexto.newPage();
    page.on("pageerror", (e) => errores.push(e.message));
    await entrarComoAdmin(page);
  });

  test.afterAll(async () => {
    await contexto?.close();
    await borrarFuncionarioDePrueba();
    await prisma.$disconnect();
  });

  test.afterEach(() => {
    expect(errores, "errores de página").toEqual([]);
  });

  test("F2: alta con saldo de apertura", async () => {
    await page.goto("/funcionarios/nuevo");
    await expect(page.getByRole("heading", { name: "Nuevo funcionario" })).toBeVisible();

    // Validación en el servidor: sin datos, marca los campos obligatorios
    await page.getByRole("button", { name: "Crear funcionario" }).click();
    await expect(page.getByText("El RUT no es válido. Revisa el dígito verificador.")).toBeVisible();
    await expect(page.getByText("Escribe la fecha como dd/mm/aaaa.").first()).toBeVisible();

    await page.getByLabel("RUT").fill(RUT_PRUEBA);
    await page.getByLabel("Nombres").fill("Prueba");
    await page.getByLabel("Apellidos").fill("E2E Ficha");
    await page.getByLabel("Categoría").selectOption("C");
    await page.getByLabel("Tipo de contrato").selectOption("TITULAR");
    await page.getByLabel("Fecha de ingreso").fill("01/03/2015");
    await page.getByLabel("Establecimiento").selectOption({ index: 1 });
    await page.getByLabel("Cargo").fill("Enfermera");
    await page.getByLabel("Jornada (horas)").fill("44");

    await page.getByRole("checkbox", { name: "Ingresa con puntaje y nivel reconocidos (saldo de apertura)" }).check();
    await page.getByLabel("Saldos al").fill("31/12/2024");
    await page.getByLabel("Fuente").fill("Planilla de prueba E2E");
    await page.getByLabel("Grado (nivel) vigente").fill("12");
    await page.getByLabel("Rige desde").fill("01/03/2023");
    await page.getByLabel("Puntaje total vigente").fill("62");
    await page.getByLabel("Puntaje de experiencia").fill("40");
    await page.getByLabel("Puntaje de capacitación").fill("22");
    await page.getByLabel("Fecha del último bienio reconocido").fill("01/03/2023");
    await page.getByLabel("N° de bienios reconocidos").fill("4");
    await capturar(page, "alta", proyecto);
    await sinViolacionesAxe(page);

    await page.getByRole("button", { name: "Crear funcionario" }).click();
    await expect(page).toHaveURL(/\/funcionarios\/[0-9a-f-]+$/);
    fichaUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: "Prueba E2E Ficha" })).toBeVisible();
    await expect(page.getByText("Funcionario creado")).toBeVisible();
    // El riel refleja el saldo (62) más el bienio 5 cumplido el 01/03/2025 (10): 72 puntos
    await expect(page.getByText("72 puntos").first()).toBeVisible();
    await capturar(page, "creado", proyecto);
  });

  test("F3: registrar capacitación con puntaje calculado", async () => {
    await page.goto(`${fichaUrl}?pestana=capacitaciones`);
    await page.getByRole("button", { name: "Registrar capacitación" }).click();
    const dialogo = page.getByRole("dialog", { name: "Registrar capacitación" });
    await expect(dialogo).toBeVisible();

    // Errores por campo desde el servidor
    await dialogo.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(dialogo.getByText("Este campo es obligatorio.").first()).toBeVisible();

    await dialogo.getByLabel("Nombre de la actividad").fill("Curso de prueba E2E");
    await dialogo.getByLabel("Institución que la dicta").fill("Universidad de prueba");
    await dialogo.getByLabel("Tipo").selectOption("CURSO");
    await dialogo.getByLabel("Horas").fill("40");
    await dialogo.getByLabel("Nota o evaluación").fill("6,5");
    await dialogo.getByLabel("Fecha de inicio").fill("02/03/2026");
    await dialogo.getByLabel("Fecha de término").fill("30/03/2026");
    await capturar(page, "capacitacion", proyecto);
    await sinViolacionesAxe(page);
    await dialogo.getByRole("button", { name: "Registrar", exact: true }).click();

    await expect(page.getByText("Capacitación registrada")).toBeVisible();
    await expect(dialogo).toBeHidden();
    const fila = page.getByRole("row").filter({ hasText: "Curso de prueba E2E" });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText("2026");
    await capturar(page, "capacitacion-registrada", proyecto);
  });

  test("F4: reconocer el bienio cumplido después de la apertura", async () => {
    await page.goto(`${fichaUrl}?pestana=experiencia`);
    // Ingreso 01/03/2015 y último bienio reconocido 01/03/2023 (bienio 4): el 5 se cumplió el 01/03/2025
    const fila = page.getByRole("row").filter({ hasText: "01/03/2025" });
    await expect(fila).toContainText("Cumplido, sin reconocer");
    await fila.getByRole("button", { name: "Reconocer" }).click();
    const dialogo = page.getByRole("dialog", { name: "Reconocer bienio 5" });
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel("Número de decreto").fill("D-123/2026");
    await dialogo.getByLabel("Fecha del decreto").fill("15/03/2025");
    await capturar(page, "bienio", proyecto);
    await dialogo.getByRole("button", { name: "Reconocer", exact: true }).click();

    await expect(page.getByText("Bienio reconocido")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "D-123/2026" })).toContainText("Reconocido");
  });

  test("F5: registrar cambio de nivel por decreto", async () => {
    await page.goto(`${fichaUrl}?pestana=nivel`);
    await page.getByRole("button", { name: "Registrar cambio de nivel" }).click();
    const dialogo = page.getByRole("dialog", { name: "Registrar cambio de nivel" });
    await expect(dialogo).toBeVisible();

    // Fecha anterior al nivel vigente: rechazada con mensaje en el campo
    await dialogo.getByLabel("Nivel nuevo").fill("11");
    await dialogo.getByLabel("Rige desde").fill("01/01/2020");
    await dialogo.getByLabel("Número de decreto").fill("D-200/2026");
    await dialogo.getByLabel("Fecha del decreto").fill("10/04/2026");
    await dialogo.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(dialogo.getByText("La fecha debe ser posterior a la del nivel vigente.")).toBeVisible();

    await dialogo.getByLabel("Rige desde").fill("01/04/2026");
    await capturar(page, "nivel", proyecto);
    await dialogo.getByRole("button", { name: "Registrar", exact: true }).click();
    await expect(page.getByText("Nivel actualizado")).toBeVisible();
    await expect(page.getByText("11 · desde 01/04/2026")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "D-200/2026" })).toContainText("Ascenso");
  });

  test("editar datos y dar de baja", async () => {
    await page.goto(fichaUrl);
    await page.getByRole("button", { name: "Editar datos" }).click();
    const dialogo = page.getByRole("dialog", { name: "Editar datos del funcionario" });
    await dialogo.getByLabel("Cargo").fill("Enfermera coordinadora");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Datos guardados")).toBeVisible();
    await expect(page.getByText("Enfermera coordinadora").first()).toBeVisible();

    await page.getByRole("button", { name: "Dar de baja" }).click();
    const baja = page.getByRole("dialog", { name: "Dar de baja" });
    await baja.getByLabel("Fecha de egreso").fill("30/06/2026");
    await baja.getByLabel("Motivo").fill("Renuncia voluntaria (prueba E2E)");
    await capturar(page, "baja", proyecto);
    await baja.getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText("Funcionario dado de baja")).toBeVisible();
    await expect(page.getByText("Inactivo").first()).toBeVisible();
    // Un funcionario inactivo ya no ofrece acciones
    await expect(page.getByRole("button", { name: "Editar datos" })).toHaveCount(0);

    // El historial muestra los actos registrados
    await page.goto(`${fichaUrl}?pestana=historial`);
    await expect(page.getByRole("row").filter({ hasText: "APERTURA" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "ELIMINAR" })).toBeVisible();
    await capturar(page, "historial", proyecto);
  });
});
