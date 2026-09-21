// Importar (doc 08, doc 13 F13, BT 15): plantilla descargable, planilla con errores (informe por fila y columna,
// nada se importa) y planilla válida (vista previa, confirmación, apertura auditada). Borra lo que creó.

import "dotenv/config";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { prisma } from "../../src/lib/db/prisma";
import { COLUMNAS_CARGA } from "../../src/lib/importacion/plantilla";
import { generarRutConDv } from "../../src/lib/rut";

const RUTS = [generarRutConDv(99_990_101), generarRutConDv(99_990_102), generarRutConDv(99_990_103)];

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

async function planilla(ruta: string, filas: Array<Record<string, string | number>>) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Carga inicial");
  hoja.columns = COLUMNAS_CARGA.map((c) => ({ header: c.encabezado, key: c.clave, width: 18 }));
  for (const f of filas) hoja.addRow(f);
  await libro.xlsx.writeFile(ruta);
}

const base = (rut: string, nombres: string, apellidos: string, extra: Record<string, string | number> = {}) => ({
  rut,
  nombres,
  apellidos,
  categoria: "C",
  establecimiento: "CECOSF de Colcura",
  tipoContrato: "Titular",
  fechaIngreso: "01/03/2016",
  grado: 12,
  gradoDesde: "01/03/2024",
  puntajeExperiencia: 40,
  puntajeCapacitacion: 18,
  puntajeTotal: 58,
  fechaUltimoBienio: "01/03/2024",
  bieniosReconocidos: 4,
  jornadaHoras: 44,
  cargo: "Prueba E2E importación",
  ...extra,
});

async function borrarCreados() {
  const creados = await prisma.funcionario.findMany({ where: { rut: { in: RUTS } }, select: { id: true } });
  for (const f of creados) {
    const where = { funcionarioId: f.id };
    await prisma.alerta.deleteMany({ where });
    await prisma.excedenteCapacitacion.deleteMany({ where });
    await prisma.capacitacion.deleteMany({ where });
    await prisma.bienio.deleteMany({ where });
    await prisma.estudio.deleteMany({ where });
    await prisma.nivelHistorico.deleteMany({ where });
    await prisma.experiencia.deleteMany({ where });
    await prisma.apertura.deleteMany({ where });
    await prisma.funcionario.delete({ where: { id: f.id } });
  }
}

test.beforeEach(async () => {
  await prisma.rateLimit.deleteMany();
  await borrarCreados();
});

test.afterAll(async () => {
  await borrarCreados();
  await prisma.$disconnect();
});

test("plantilla, planilla con errores y carga válida", async ({ page }) => {
  await entrarComoAdmin(page);
  const carpeta = await mkdtemp(path.join(os.tmpdir(), "carrera-e2e-"));

  const plantilla = await page.request.get("/importar/plantilla");
  expect(plantilla.status()).toBe(200);
  expect(plantilla.headers()["content-type"]).toContain("spreadsheetml");

  await page.goto("/importar");
  await expect(page.getByRole("heading", { name: "Importar", level: 1 })).toBeVisible();

  // 1) Con errores: RUT inválido, establecimiento inexistente y grado fuera de rango; nada se importa
  const conErrores = path.join(carpeta, "con-errores.xlsx");
  await planilla(conErrores, [
    base("11.111.111-9", "Error", "Uno"),
    base(RUTS[1]!, "Error", "Dos", { establecimiento: "Posta inexistente", grado: 40 }),
    base(RUTS[2]!, "Válida", "Tres"),
  ]);
  await page.getByLabel("Planilla (.xlsx)").setInputFiles(conErrores);
  await page.getByRole("button", { name: "Validar planilla" }).click();
  await expect(page.getByText(/^3 errores en 3 filas/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("row").filter({ hasText: "RUT inválido" })).toContainText("2");
  await expect(page.getByRole("row").filter({ hasText: "No existe un establecimiento" })).toContainText("3");
  await expect(page.getByRole("row").filter({ hasText: "según la regla Niveles" })).toBeVisible();
  expect(await prisma.funcionario.count({ where: { rut: { in: RUTS } } })).toBe(0);

  // 2) Válida: vista previa, confirmación, funcionario con apertura y auditoría
  const valida = path.join(carpeta, "valida.xlsx");
  await planilla(valida, [base(RUTS[0]!, "Ana", "Importada Uno"), base(RUTS[1]!, "Beatriz", "Importada Dos", { puntajeExperiencia: "", puntajeCapacitacion: "" }), base(RUTS[2]!, "Carla", "Importada Tres")]);
  await page.getByLabel("Planilla (.xlsx)").setInputFiles(valida);
  await page.getByLabel("Fecha de los saldos").fill("2024-12-31");
  await page.getByRole("button", { name: "Validar planilla" }).click();
  await expect(page.getByText("Vista previa: 3 filas válidas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("row").filter({ hasText: "Importada Dos" })).toContainText("sin desglose");
  await page.getByRole("button", { name: "Importar 3 funcionarios" }).click();
  await expect(page.getByText("3 funcionarios creados").first()).toBeVisible({ timeout: 60_000 });

  const creados = await prisma.funcionario.findMany({ where: { rut: { in: RUTS } }, include: { apertura: true, niveles: true } });
  expect(creados).toHaveLength(3);
  const ana = creados.find((f) => f.nombres === "Ana")!;
  expect(ana.apertura?.puntajeTotal.toString()).toBe("58");
  expect(ana.apertura?.desglosado).toBe(true);
  expect(ana.apertura?.fecha.toISOString().slice(0, 10)).toBe("2024-12-31");
  expect(ana.niveles[0]?.nivel).toBe(12);
  expect(ana.niveles[0]?.motivo).toBe("APERTURA");
  const beatriz = creados.find((f) => f.nombres === "Beatriz")!;
  expect(beatriz.apertura?.desglosado).toBe(false);
  const importar = await prisma.auditoria.findFirst({ where: { accion: "IMPORTAR" }, orderBy: { fecha: "desc" } });
  expect(importar?.detalle).toContain("valida.xlsx: 3 creados");

  // La ficha muestra el saldo de apertura y el riel
  await page.goto(`/funcionarios/${ana.id}`);
  await expect(page.getByText("Saldo de apertura")).toBeVisible();
  await expect(page.getByText("Planilla")).toBeHidden();
  await rm(carpeta, { recursive: true, force: true });
});
