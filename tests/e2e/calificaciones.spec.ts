// Calificaciones (BT 4.6, doc 13 F15): comisión y factores del proceso, calificar con notas por factor y puntaje
// calculado en vivo, acta adjunta visible en la fila, la ficha y el portal del funcionario, anotación de mérito,
// reporte de mérito y copia de factores a un proceso nuevo. Deshace todo lo que crea.

import "dotenv/config";
import { rm } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { carpetaDocumentos, pdfMinimo } from "../../src/lib/documentos/almacenamiento";
import { prisma } from "../../src/lib/db/prisma";

const PROCESO_PRUEBA = "Calificación 2027 (prueba E2E)";
const INTEGRANTE_PRUEBA = "Integrante de prueba E2E";
// Tras cada acción la página se refresca desde el servidor; en desarrollo puede tardar varios segundos
const REFRESCO = { timeout: 30_000 };

function cuenta(rol: "ADMIN" | "FUNCIONARIO") {
  const email = rol === "ADMIN" ? process.env.SEED_ADMIN_EMAIL : (process.env.SEED_FUNCIONARIO_EMAIL ?? "funcionario.demo@carrera-aps.local");
  const password = rol === "ADMIN" ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_FUNCIONARIO_PASSWORD;
  if (!email || !password) throw new Error(`Faltan las credenciales de ${rol} en .env`);
  return { email, password };
}

async function entrar(page: Page, rol: "ADMIN" | "FUNCIONARIO") {
  const { email, password } = cuenta(rol);
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(rol === "FUNCIONARIO" ? /\/mi-carrera$/ : /\/$/, { timeout: 30_000 });
}

/** Abre un diálogo: si el clic llega antes de la hidratación no hace nada, así que se reintenta hasta verlo. */
async function abrirDialogo(page: Page, boton: Locator, nombre: string): Promise<Locator> {
  const dialogo = page.getByRole("dialog", { name: nombre });
  await expect(async () => {
    await boton.click();
    await expect(dialogo).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
  return dialogo;
}

async function deshacer() {
  const maria = await prisma.funcionario.findFirst({ where: { apellidos: { startsWith: "Pérez" } } });
  const proceso = await prisma.procesoCalificacion.findFirst({ where: { nombre: "Calificación 2026" } });
  if (maria && proceso) {
    const c = await prisma.calificacionFuncionario.findUnique({ where: { procesoId_funcionarioId: { procesoId: proceso.id, funcionarioId: maria.id } }, include: { acta: true } });
    if (c) {
      await prisma.notaMerito.deleteMany({ where: { calificacionId: c.id } });
      await prisma.calificacionFuncionario.delete({ where: { id: c.id } });
      if (c.acta) {
        await prisma.documento.delete({ where: { id: c.acta.id } });
        await rm(path.join(carpetaDocumentos(), c.acta.ruta), { force: true });
      }
    }
    await prisma.comisionCalificacion.deleteMany({ where: { procesoId: proceso.id, nombre: INTEGRANTE_PRUEBA } });
  }
  const prueba = await prisma.procesoCalificacion.findFirst({ where: { nombre: PROCESO_PRUEBA } });
  if (prueba) {
    await prisma.factorCalificacion.deleteMany({ where: { procesoId: prueba.id, padreId: { not: null } } });
    await prisma.factorCalificacion.deleteMany({ where: { procesoId: prueba.id } });
    await prisma.comisionCalificacion.deleteMany({ where: { procesoId: prueba.id } });
    await prisma.calificacionFuncionario.deleteMany({ where: { procesoId: prueba.id } });
    await prisma.procesoCalificacion.delete({ where: { id: prueba.id } });
  }
}

test.beforeEach(async () => {
  await prisma.rateLimit.deleteMany();
  await deshacer();
});

test.afterAll(async () => {
  await deshacer();
  await prisma.$disconnect();
});

test("comisión, factores, calificar por factor con acta, ficha, portal y reporte", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await entrar(page, "ADMIN");
  await page.goto("/calificaciones");
  await expect(page.getByRole("heading", { name: "Calificaciones", level: 1 })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Calificación 2024" })).toContainText("Cerrado");
  await expect(page.getByRole("row").filter({ hasText: "Calificación 2026" })).toContainText("Abierto");
  const proceso = await prisma.procesoCalificacion.findFirstOrThrow({ where: { nombre: "Calificación 2026" } });
  const maria = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Pérez" } } });

  await page.goto(`/calificaciones?proceso=${proceso.id}&q=Pérez`);
  // Comisión evaluadora: alta y baja de un integrante
  await expect(page.getByRole("heading", { name: "Comisión evaluadora" })).toBeVisible();
  await expect(page.getByText("Marcela Sanhueza Ortiz")).toBeVisible();
  const dialogoIntegrante = await abrirDialogo(page, page.getByRole("button", { name: "Agregar integrante" }), "Agregar integrante a la comisión");
  await dialogoIntegrante.getByLabel("Nombre").fill(INTEGRANTE_PRUEBA);
  await dialogoIntegrante.getByLabel("Rol en la comisión").fill("Ministro de fe");
  await dialogoIntegrante.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Integrante agregado")).toBeVisible(REFRESCO);
  await expect(page.getByText(INTEGRANTE_PRUEBA)).toBeVisible(REFRESCO);
  await page.getByRole("button", { name: `Quitar a ${INTEGRANTE_PRUEBA}` }).click();
  await expect(page.getByText("Integrante quitado")).toBeVisible(REFRESCO);
  await expect(page.getByText(INTEGRANTE_PRUEBA)).toHaveCount(0, REFRESCO);

  // Factores con ponderación
  await expect(page.getByRole("heading", { name: "Factores y ponderación" })).toBeVisible();
  await expect(page.getByText("Rendimiento", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Los factores principales suman 100 %.")).toBeVisible();

  const fila = page.getByRole("row").filter({ hasText: "María Ignacia Pérez Soto" });
  await expect(fila).toContainText("Sin calificar");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  // Calificar: notas por subfactor, puntaje calculado en vivo, acta adjunta
  const dialogo = await abrirDialogo(page, fila.getByRole("button", { name: "Calificar" }), "Calificar a María Ignacia Pérez Soto");
  await expect(dialogo.getByText(/Escala de 1 a 7/)).toBeVisible();
  await expect(dialogo.getByTestId("puntaje-calculado")).toHaveText("—");
  const notas: Array<[RegExp, string]> = [
    [/Cantidad de trabajo/, "6"],
    [/Calidad del trabajo/, "7"],
    [/Interés por el trabajo/, "6"],
    [/Capacidad para realizar el trabajo/, "6"],
    [/Cumplimiento de normas/, "7"],
    [/Asistencia y puntualidad/, "7"],
  ];
  for (const [etiqueta, nota] of notas) await dialogo.getByLabel(etiqueta).fill(nota);
  // Rendimiento 6,5 · Condiciones 6 · Comportamiento 7 → (6,5·40 + 6·30 + 7·30)/100 = 6,5
  await expect(dialogo.getByTestId("puntaje-calculado")).toHaveText("6,5");
  await expect(dialogo.getByText("Lista: Lista 1")).toBeVisible();
  await dialogo.getByLabel("Acta o certificado (opcional)").setInputFiles({ name: "acta-e2e.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfMinimo("Acta de prueba E2E")) });
  await dialogo.getByLabel("Observaciones").fill("Calificación de prueba E2E");
  await dialogo.getByRole("button", { name: "Guardar calificación" }).click();
  await expect(page.getByText("Calificación guardada")).toBeVisible(REFRESCO);
  await expect(fila).toContainText("6,5", REFRESCO);
  await expect(fila).toContainText("Lista 1");
  await expect(fila.getByRole("link", { name: /Ver acta/ })).toBeVisible();

  const nota = await abrirDialogo(page, fila.getByRole("button", { name: "Anotar" }), "Anotación de mérito o demérito");
  await nota.getByLabel("Tipo").selectOption("MERITO");
  await nota.getByLabel("Descripción").fill("Anotación de prueba E2E");
  await nota.getByRole("button", { name: "Anotar", exact: true }).click();
  await expect(page.getByText("Anotación registrada")).toBeVisible(REFRESCO);
  await expect(fila).toContainText("1 mérito", REFRESCO);

  const guardada = await prisma.calificacionFuncionario.findUniqueOrThrow({ where: { procesoId_funcionarioId: { procesoId: proceso.id, funcionarioId: maria.id } }, include: { notasMerito: true, acta: true } });
  expect(guardada.lista).toBe("Lista 1");
  expect(Number(guardada.puntajeFinal)).toBe(6.5);
  expect(Object.keys(guardada.puntajes as Record<string, number>)).toHaveLength(6);
  expect(guardada.acta?.tipo).toBe("ACTA");
  expect(guardada.acta?.funcionarioId).toBe(maria.id);
  expect(guardada.notasMerito).toHaveLength(1);
  expect(await prisma.auditoria.findFirst({ where: { accion: "CALIFICAR", entidadId: guardada.id } })).not.toBeNull();

  // Ficha: notas por factor, lista y acta
  await page.goto(`/funcionarios/${maria.id}?pestana=calificaciones`);
  const filaFicha = page.getByRole("row").filter({ hasText: "Calificación 2026" });
  await expect(filaFicha).toContainText("Lista 1", REFRESCO);
  await expect(filaFicha).toContainText("Rendimiento: 6,5");
  await expect(filaFicha.getByRole("link", { name: /Ver acta/ })).toBeVisible();

  await page.goto(`/reportes/merito?alcance=funcionario&funcionario=${maria.id}`);
  await expect(page.getByRole("row").filter({ hasText: "Calificación 2026" })).toContainText("Lista 1", REFRESCO);

  // Portal: María ve su calificación y descarga su acta
  const contextoPortal = await browser.newContext();
  const portal = await contextoPortal.newPage();
  await entrar(portal, "FUNCIONARIO");
  await portal.getByText("Mis calificaciones").click(); // las secciones del portal son <details> cerrados
  const enlace = portal.getByRole("link", { name: "Ver acta: Calificación 2026" });
  await expect(enlace).toBeVisible(REFRESCO);
  const descarga = await portal.request.get((await enlace.getAttribute("href"))!);
  expect(descarga.status()).toBe(200);
  expect(descarga.headers()["content-type"]).toContain("application/pdf");
  await contextoPortal.close();
});

test("un proceso nuevo copia los factores del anterior", async ({ page }) => {
  test.setTimeout(180_000);
  await entrar(page, "ADMIN");
  await page.goto("/calificaciones");
  const dialogo = await abrirDialogo(page, page.getByRole("button", { name: "Nuevo proceso" }), "Nuevo proceso de calificación");
  await dialogo.getByLabel("Nombre").fill(PROCESO_PRUEBA);
  await dialogo.getByLabel("Período desde").fill("01/01/2027");
  await dialogo.getByLabel("Período hasta").fill("31/12/2027");
  await dialogo.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page.getByText("Proceso creado")).toBeVisible(REFRESCO);
  const prueba = await prisma.procesoCalificacion.findFirstOrThrow({ where: { nombre: PROCESO_PRUEBA } });

  await page.goto(`/calificaciones?proceso=${prueba.id}`);
  await expect(page.getByText("Sin factores: el puntaje final se registra directamente.")).toBeVisible();
  const copiar = page.getByRole("button", { name: "Copiar factores de Calificación 2026" });
  // Si el clic llega antes de la hidratación no hace nada; si llega dos veces, la segunda avisa que ya hay factores
  await expect(async () => {
    await copiar.click();
    await expect(page.getByText(/factores copiados|ya tiene factores|suman 100 %/).first()).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
  await expect(page.getByText("Los factores principales suman 100 %.")).toBeVisible(REFRESCO);
  await expect(page.getByText("Comportamiento funcionario", { exact: false }).first()).toBeVisible();
  expect(await prisma.factorCalificacion.count({ where: { procesoId: prueba.id } })).toBe(9);
  expect(await prisma.factorCalificacion.count({ where: { procesoId: prueba.id, padreId: { not: null } } })).toBe(6);
});
