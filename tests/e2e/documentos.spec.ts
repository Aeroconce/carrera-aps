// Documentos (BT 4.8, doc 05 §7): subida con vínculo desde la ficha, listado del módulo, descarga autenticada
// y prohibición para un funcionario de descargar documentos ajenos. Borra lo que creó.

import "dotenv/config";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";
import { pdfMinimo } from "../../src/lib/documentos/almacenamiento";

const NOMBRE_E2E = "Certificado E2E.pdf";

async function entrar(page: Page, email: string | undefined, password: string | undefined, destino: RegExp) {
  if (!email || !password) throw new Error("Faltan credenciales en .env");
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(destino, { timeout: 30_000 });
}

async function borrarCreados() {
  const docs = await prisma.documento.findMany({ where: { nombre: NOMBRE_E2E } });
  for (const d of docs) {
    await prisma.capacitacion.updateMany({ where: { documentoId: d.id }, data: { documentoId: null } });
    await prisma.documento.delete({ where: { id: d.id } });
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

test("subir con vínculo, listar, descargar y proteger", async ({ page, browser }) => {
  await entrar(page, process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, /\/$/);
  const carmen = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Riquelme" } }, include: { capacitaciones: { where: { documentoId: null }, take: 1 } } });
  const capacitacion = carmen.capacitaciones[0]!;
  const carpeta = await mkdtemp(path.join(os.tmpdir(), "carrera-e2e-doc-"));
  const archivo = path.join(carpeta, NOMBRE_E2E);
  await writeFile(archivo, pdfMinimo("Certificado de prueba E2E"));

  await page.goto(`/funcionarios/${carmen.id}?pestana=documentos`);
  await page.getByRole("button", { name: "Subir documento" }).click();
  const dialogo = page.getByRole("dialog", { name: "Subir documento" });
  await dialogo.getByLabel("Archivo").setInputFiles(archivo);
  await dialogo.getByLabel("Tipo de documento").selectOption("CERTIFICADO_CAPACITACION");
  await dialogo.getByLabel("Respalda a").selectOption(`capacitacion:${capacitacion.id}`);
  await dialogo.getByRole("button", { name: "Subir", exact: true }).click();
  await expect(page.getByText("Documento subido")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: NOMBRE_E2E })).toBeVisible();

  const documento = await prisma.documento.findFirstOrThrow({ where: { nombre: NOMBRE_E2E } });
  expect(documento.mime).toBe("application/pdf");
  expect(documento.hash).toMatch(/^[0-9a-f]{64}$/);
  const vinculada = await prisma.capacitacion.findUniqueOrThrow({ where: { id: capacitacion.id } });
  expect(vinculada.documentoId).toBe(documento.id);

  // Descarga autenticada y listado del módulo
  const descarga = await page.request.get(`/documentos/${documento.id}/descargar`);
  expect(descarga.status()).toBe(200);
  expect(descarga.headers()["content-type"]).toBe("application/pdf");
  expect((await descarga.body()).subarray(0, 4).toString("latin1")).toBe("%PDF");
  await page.goto("/documentos?q=Riquelme");
  await expect(page.getByRole("row").filter({ hasText: NOMBRE_E2E })).toContainText("Certificado de capacitación");

  // Un archivo que no es PDF/JPG/PNG se rechaza por su contenido
  const falso = path.join(carpeta, "falso.pdf");
  await writeFile(falso, "esto no es un pdf");
  await page.getByRole("button", { name: "Subir documento" }).click();
  const dialogo2 = page.getByRole("dialog", { name: "Subir documento" });
  await dialogo2.getByLabel("Archivo").setInputFiles(falso);
  await dialogo2.getByRole("button", { name: "Subir", exact: true }).click();
  await expect(dialogo2.getByText("Tipo de archivo no permitido")).toBeVisible();

  // El funcionario de demo (María) no puede descargar el documento de Carmen
  const contexto = await browser.newContext();
  const otra = await contexto.newPage();
  await entrar(otra, process.env.SEED_FUNCIONARIO_EMAIL ?? "funcionario.demo@carrera-aps.local", process.env.SEED_FUNCIONARIO_PASSWORD, /\/mi-carrera$/);
  const ajeno = await otra.request.get(`/documentos/${documento.id}/descargar`);
  expect(ajeno.status()).toBe(403);
  await contexto.close();
  await rm(carpeta, { recursive: true, force: true });
});
