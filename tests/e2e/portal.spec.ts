// Portal del funcionario (BT 10, doc 13 F14) y perfil SUPERVISION (solo lectura). Usa las cuentas de demo
// que crea `pnpm seed:demo` con las contraseñas de .env (SEED_FUNCIONARIO_* y SEED_SUPERVISION_*).

import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const capturas = process.env.E2E_CAPTURAS === "1";

// En desarrollo, la primera apertura de la ficha tras editar código recompila (Turbopack) y puede superar 30 s
test.setTimeout(120_000);

function cuenta(rol: "FUNCIONARIO" | "SUPERVISION") {
  const email = rol === "FUNCIONARIO" ? (process.env.SEED_FUNCIONARIO_EMAIL ?? "funcionario.demo@carrera-aps.local") : (process.env.SEED_SUPERVISION_EMAIL ?? "supervision.demo@carrera-aps.local");
  const password = rol === "FUNCIONARIO" ? process.env.SEED_FUNCIONARIO_PASSWORD : process.env.SEED_SUPERVISION_PASSWORD;
  if (!password) throw new Error(`Falta la contraseña de la cuenta ${rol} en .env (scripts/generar-contrasenas-demo.ts + pnpm seed:demo)`);
  return { email, password };
}

async function entrar(page: Page, rol: "FUNCIONARIO" | "SUPERVISION") {
  const { email, password } = cuenta(rol);
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(rol === "FUNCIONARIO" ? /\/mi-carrera$/ : /\/$/, { timeout: 30_000 });
}

async function sinViolacionesAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(resultado.violations, JSON.stringify(resultado.violations, null, 2)).toEqual([]);
}

test.beforeEach(async () => {
  await prisma.rateLimit.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("el funcionario ve su carrera y nada más", async ({ page }, testInfo) => {
  await entrar(page, "FUNCIONARIO");
  await expect(page.getByRole("heading", { name: "Mi carrera", level: 1 })).toBeVisible();
  // funcionario.demo está asociado a María Pérez (doc 14): 129 puntos, nivel 9, faltan 11
  await expect(page.getByText("María Ignacia Pérez Soto", { exact: true })).toBeVisible(); // las actas también llevan su nombre
  await expect(page.getByText("129 puntos").first()).toBeVisible();
  await expect(page.getByText("Bienio 6 · 01/03/2026")).toBeVisible();
  await page.getByText("Mis capacitaciones").click();
  await expect(page.getByText("Diplomado en gestión de atención primaria").first()).toBeVisible();
  if (capturas) await page.screenshot({ path: `capturas/portal-${testInfo.project.name}.png`, fullPage: true });
  await sinViolacionesAxe(page);

  // Prohibición de ver a otros (doc 13 F14.4): rutas administrativas y fichas ajenas
  const carmen = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Riquelme" } } });
  for (const ruta of ["/funcionarios", `/funcionarios/${carmen.id}`, "/reportes", "/alertas", "/auditoria"]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/(sin-permiso|mi-carrera)$/);
  }
});

test("supervisión lee sin editar", async ({ page }) => {
  await entrar(page, "SUPERVISION");
  await page.goto("/funcionarios");
  await expect(page.getByRole("heading", { name: "Funcionarios", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nuevo funcionario" })).toHaveCount(0);
  // En desarrollo la ficha se recompila tras editar código y puede tardar más de un minuto: se calienta antes
  const maria = await prisma.funcionario.findFirstOrThrow({ where: { apellidos: { startsWith: "Pérez" } }, select: { id: true } });
  await page.goto(`/funcionarios/${maria.id}`);
  await expect(page.getByRole("heading", { name: "María Ignacia Pérez Soto" })).toBeVisible({ timeout: 120_000 });
  await page.goto("/funcionarios");
  await page.getByRole("link", { name: "María Ignacia Pérez Soto" }).click();
  await page.waitForURL(/\/funcionarios\/[0-9a-f-]+$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "María Ignacia Pérez Soto" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Editar datos" })).toHaveCount(0);
  await page.goto("/parametros");
  await expect(page).toHaveURL(/\/sin-permiso$/);
  await page.goto("/reportes");
  await expect(page.getByRole("heading", { name: "Reportes", level: 1 })).toBeVisible();
});
