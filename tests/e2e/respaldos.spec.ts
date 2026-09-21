// Respaldos (doc 05 §12, doc 13 F11, subcriterio 15): historial con evidencia, política publicada y
// "Ejecutar respaldo ahora" (pg_dump real, local o del contenedor db). Sesión ADMIN; borra el respaldo que creó.

import "dotenv/config";
import { rm } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.beforeEach(async () => {
  await prisma.rateLimit.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("historial, política y respaldo a demanda", async ({ page }, testInfo) => {
  const inicio = new Date();
  await entrarComoAdmin(page);
  await page.goto("/respaldos");
  await expect(page.getByRole("heading", { name: "Respaldos", level: 1 })).toBeVisible();
  await expect(page.getByText("Política de respaldos")).toBeVisible();
  await expect(page.getByText(/pg_dump diario a las 03:00/)).toBeVisible();
  // El seed deja 30 respaldos diarios, el último verificado por restauración
  await expect(page.getByText("Último respaldo verificado por restauración")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "OK" }).first()).toBeVisible();
  if (capturas) await page.screenshot({ path: `capturas/respaldos-${testInfo.project.name}.png`, fullPage: true });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  await page.getByRole("button", { name: "Ejecutar respaldo ahora" }).click();
  const dialogo = page.getByRole("dialog", { name: "Ejecutar respaldo ahora" });
  await dialogo.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect(page.getByText(/^Respaldo completado:/)).toBeVisible({ timeout: 90_000 });

  const creado = await prisma.respaldo.findFirst({ where: { createdAt: { gte: inicio } }, orderBy: { createdAt: "desc" } });
  expect(creado?.resultado).toBe("OK");
  expect(Number(creado?.tamano)).toBeGreaterThan(1000);
  expect(creado?.hash).toMatch(/^[0-9a-f]{64}$/);
  await expect(page.getByRole("row").filter({ hasText: creado!.hash.slice(0, 12) })).toBeVisible();
  // Queda auditado
  const auditoria = await prisma.auditoria.findFirst({ where: { entidad: "Respaldo", entidadId: creado!.id } });
  expect(auditoria?.accion).toBe("CREAR");

  await rm(creado!.destino, { force: true });
  await prisma.respaldo.delete({ where: { id: creado!.id } });
});
