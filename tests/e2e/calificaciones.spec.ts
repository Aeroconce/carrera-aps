// Calificaciones (BT 4.6, doc 13 F15), versión simplificada: procesos, calificar con lista según la regla,
// anotación de mérito, ficha y reporte de asignación de mérito. Deshace la calificación que creó.

import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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

async function deshacer() {
  const maria = await prisma.funcionario.findFirst({ where: { apellidos: { startsWith: "Pérez" } } });
  const proceso = await prisma.procesoCalificacion.findFirst({ where: { nombre: "Calificación 2026" } });
  if (!maria || !proceso) return;
  const c = await prisma.calificacionFuncionario.findUnique({ where: { procesoId_funcionarioId: { procesoId: proceso.id, funcionarioId: maria.id } } });
  if (c) {
    await prisma.notaMerito.deleteMany({ where: { calificacionId: c.id } });
    await prisma.calificacionFuncionario.delete({ where: { id: c.id } });
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

test("procesos, calificar con lista, anotar y ver en ficha y reporte", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/calificaciones");
  await expect(page.getByRole("heading", { name: "Calificaciones", level: 1 })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Calificación 2024" })).toContainText("Cerrado");
  const fila2026 = page.getByRole("row").filter({ hasText: "Calificación 2026" });
  await expect(fila2026).toContainText("Abierto");
  const proceso = await prisma.procesoCalificacion.findFirstOrThrow({ where: { nombre: "Calificación 2026" } });
  const maria = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Pérez" } } });

  await page.goto(`/calificaciones?proceso=${proceso.id}&q=Pérez`);
  const fila = page.getByRole("row").filter({ hasText: "María Ignacia Pérez Soto" });
  await expect(fila).toContainText("Sin calificar");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  await fila.getByRole("button", { name: "Calificar" }).click();
  const dialogo = page.getByRole("dialog", { name: "Calificar a María Ignacia Pérez Soto" });
  await expect(dialogo.getByText(/Escala de 1 a 7/)).toBeVisible();
  await dialogo.getByLabel("Puntaje final").fill("6.5");
  await dialogo.getByLabel("Observaciones").fill("Calificación de prueba E2E");
  await dialogo.getByRole("button", { name: "Guardar calificación" }).click();
  await expect(page.getByText("Calificación guardada")).toBeVisible();
  await expect(fila).toContainText("6,5");
  await expect(fila).toContainText("Lista 1");

  await fila.getByRole("button", { name: "Anotar" }).click();
  const nota = page.getByRole("dialog", { name: "Anotación de mérito o demérito" });
  await nota.getByLabel("Tipo").selectOption("MERITO");
  await nota.getByLabel("Descripción").fill("Anotación de prueba E2E");
  await nota.getByRole("button", { name: "Anotar", exact: true }).click();
  await expect(page.getByText("Anotación registrada")).toBeVisible();
  await expect(fila).toContainText("1 mérito");

  const guardada = await prisma.calificacionFuncionario.findUniqueOrThrow({ where: { procesoId_funcionarioId: { procesoId: proceso.id, funcionarioId: maria.id } }, include: { notasMerito: true } });
  expect(guardada.lista).toBe("Lista 1");
  expect(guardada.notasMerito).toHaveLength(1);
  const auditado = await prisma.auditoria.findFirst({ where: { accion: "CALIFICAR", entidadId: guardada.id } });
  expect(auditado).not.toBeNull();

  await page.goto(`/funcionarios/${maria.id}?pestana=calificaciones`);
  await expect(page.getByRole("row").filter({ hasText: "Calificación 2026" })).toContainText("Lista 1");

  await page.goto(`/reportes/merito?alcance=funcionario&funcionario=${maria.id}`);
  await expect(page.getByRole("row").filter({ hasText: "Calificación 2026" })).toContainText("Lista 1");
});
