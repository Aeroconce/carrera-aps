// Exportación integral (doc 06, subcriterio 12, BT 6): el ZIP se genera en línea con dump, diccionario, un
// libro por funcionario, consolidado, documentos y README con hashes; queda auditado como EXPORTAR.

import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { prisma } from "../../src/lib/db/prisma";

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

test.beforeEach(async () => {
  await prisma.rateLimit.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("genera el ZIP completo y lo registra", async ({ page }) => {
  test.setTimeout(300_000);
  await entrarComoAdmin(page);
  await page.goto("/exportacion-integral");
  await expect(page.getByRole("heading", { name: "Exportación integral", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Generar exportación" })).toBeVisible();

  const antes = await prisma.auditoria.count({ where: { accion: "EXPORTAR", entidadId: "exportacion-integral" } });
  const respuesta = await page.request.get("/exportacion-integral/descargar", { timeout: 240_000 });
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()["content-type"]).toBe("application/zip");
  expect(respuesta.headers()["content-disposition"]).toMatch(/exportacion-integral_\d{4}-\d{2}-\d{2}\.zip/);
  const cuerpo = await respuesta.body();
  expect(cuerpo.length).toBeGreaterThan(200_000);

  const entradas = unzipSync(new Uint8Array(cuerpo));
  const rutas = Object.keys(entradas);
  expect(rutas).toContain("README.txt");
  expect(rutas).toContain("bd/dump.sql.gz");
  expect(rutas).toContain("bd/diccionario-de-datos.xlsx");
  expect(rutas).toContain("consolidado.xlsx");
  const funcionarios = await prisma.funcionario.count();
  expect(rutas.filter((r) => r.startsWith("funcionarios/") && r.endsWith(".xlsx")).length).toBe(funcionarios);
  const documentos = await prisma.documento.count();
  expect(rutas.filter((r) => r.startsWith("documentos/")).length).toBe(documentos);
  const readme = new TextDecoder().decode(entradas["README.txt"]);
  expect(readme).toContain("Exportación integral");
  expect(readme).toContain("consolidado.xlsx");
  expect(readme).not.toContain("Advertencias");
  expect(entradas["bd/dump.sql.gz"]!.length).toBeGreaterThan(10_000);

  const despues = await prisma.auditoria.count({ where: { accion: "EXPORTAR", entidadId: "exportacion-integral" } });
  expect(despues - antes).toBe(1);
  await page.reload();
  await expect(page.getByRole("row").nth(1)).toContainText(String(rutas.length));
});
