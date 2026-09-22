// Usuarios y accesos (doc 05 §16, doc 07): crear cuenta por rol con contraseña temporal mostrada una vez,
// primer ingreso con cambio obligatorio, restablecer, desactivar (el acceso se rechaza) y reactivar. Borra la cuenta.

import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const EMAIL_E2E = "prueba.e2e.usuarios@carrera-aps.local";

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

async function borrar() {
  await prisma.user.deleteMany({ where: { email: EMAIL_E2E } });
}

test.beforeEach(async () => {
  await prisma.rateLimit.deleteMany();
  await borrar();
});

test.afterAll(async () => {
  await borrar();
  await prisma.$disconnect();
});

test("crear, primer ingreso, restablecer, desactivar y reactivar", async ({ page, browser }) => {
  await entrarComoAdmin(page);
  await page.goto("/usuarios");
  await expect(page.getByRole("heading", { name: "Usuarios", level: 1 })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "supervision.demo" })).toContainText("Supervisión");

  // Crear una cuenta de supervisión: la contraseña temporal se muestra una sola vez
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo usuario" });
  await dialogo.getByLabel("Nombre").fill("Prueba E2E Usuarios");
  await dialogo.getByLabel("Correo").fill(EMAIL_E2E);
  await dialogo.getByLabel("Rol").selectOption("SUPERVISION");
  await dialogo.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("dialog", { name: "Cuenta creada" })).toBeVisible();
  const temporal = (await page.getByTestId("contrasena-temporal").innerText()).trim();
  expect(temporal.length).toBeGreaterThanOrEqual(12);
  await page.getByRole("button", { name: "Entendido" }).click();
  const fila = page.getByRole("row").filter({ hasText: EMAIL_E2E });
  await expect(fila).toContainText("Debe cambiar la contraseña");
  const creado = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL_E2E } });
  expect(creado.role).toBe("SUPERVISION");
  expect(creado.institucionId).not.toBeNull();
  expect(await prisma.auditoria.findFirst({ where: { entidad: "User", entidadId: creado.id, accion: "CREAR" } })).not.toBeNull();

  // Primer ingreso con la contraseña temporal: cambio obligatorio y luego lectura
  const contexto = await browser.newContext();
  const otra = await contexto.newPage();
  await otra.goto("/login");
  await otra.getByLabel("Correo").fill(EMAIL_E2E);
  await otra.getByLabel("Contraseña", { exact: true }).fill(temporal);
  await otra.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(otra).toHaveURL(/\/cambiar-contrasena$/, { timeout: 30_000 });
  await contexto.close();

  // Restablecer: nueva contraseña temporal
  await fila.getByRole("button", { name: "Restablecer contraseña" }).click();
  const restablecer = page.getByRole("dialog", { name: "Restablecer contraseña" });
  await restablecer.getByRole("button", { name: "Restablecer contraseña" }).click();
  await expect(page.getByRole("dialog", { name: "Contraseña restablecida" })).toBeVisible();
  const nueva = (await page.getByTestId("contrasena-temporal").innerText()).trim();
  expect(nueva).not.toBe(temporal);
  await page.getByRole("button", { name: "Entendido" }).click();

  // Desactivar: el ingreso se rechaza; reactivar lo permite de nuevo
  await fila.getByRole("button", { name: "Desactivar" }).click();
  await expect(page.getByText("Cuenta desactivada")).toBeVisible();
  await expect(fila).toContainText("Desactivada");
  const contexto2 = await browser.newContext();
  const bloqueada = await contexto2.newPage();
  await bloqueada.goto("/login");
  await bloqueada.getByLabel("Correo").fill(EMAIL_E2E);
  await bloqueada.getByLabel("Contraseña", { exact: true }).fill(nueva);
  await bloqueada.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(bloqueada).toHaveURL(/\/login$/);
  await expect(bloqueada.getByRole("alert")).toBeVisible();
  await contexto2.close();

  await fila.getByRole("button", { name: "Reactivar" }).click();
  await expect(page.getByText("Cuenta reactivada")).toBeVisible();
  await expect(fila).toContainText("Activa");
});
