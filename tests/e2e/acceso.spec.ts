// Flujo F1 del doc 13: entrar al sistema. Localizadores por rol y etiqueta, aserciones web-first,
// accesibilidad con axe en cada pantalla (doc 16). Las credenciales vienen de global-setup por process.env.

import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db/prisma";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21aa"];

function credenciales() {
  const email = process.env.E2E_FUNCIONARIO_EMAIL;
  const inicial = process.env.E2E_FUNCIONARIO_PASSWORD;
  const nueva = process.env.E2E_FUNCIONARIO_PASSWORD_NUEVA;
  if (!email || !inicial || !nueva) throw new Error("Faltan las credenciales de prueba (global-setup).");
  return { email, inicial, nueva };
}

async function iniciarSesion(page: Page, email: string, password: string) {
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  const respuesta = page.waitForResponse((r) => r.url().includes("/api/auth/sign-in/email"));
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  return respuesta;
}

async function sinViolacionesAxe(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  expect(resultado.violations, JSON.stringify(resultado.violations, null, 2)).toEqual([]);
}

test.beforeEach(async () => {
  // Cada caso parte sin intentos acumulados (el límite es por IP)
  await prisma.rateLimit.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("sin sesión, una ruta protegida redirige a /login", async ({ page }) => {
  await page.goto("/mi-carrera");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await sinViolacionesAxe(page);
});

test("valida correo y contraseña antes de enviar", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("Escribe un correo válido.")).toBeVisible();
  await expect(page.getByText("Escribe tu contraseña.")).toBeVisible();
  await sinViolacionesAxe(page);
});

test("rechaza credenciales incorrectas con un mensaje claro", async ({ page }) => {
  await page.goto("/login");
  const respuesta = await iniciarSesion(page, "nadie@carrera-aps.local", "contrasena-incorrecta");
  expect(respuesta.status()).toBe(401);
  await expect(page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos." })).toBeVisible();
});

test("explica cómo recuperar la contraseña", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page.getByText("El administrador del sistema reinicia las contraseñas.")).toBeVisible();
});

test("bloquea tras cinco intentos fallidos", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "El límite es por IP; basta probarlo una vez.");
  await page.goto("/login");
  for (let intento = 1; intento <= 5; intento++) {
    const respuesta = await iniciarSesion(page, "nadie@carrera-aps.local", "contrasena-incorrecta");
    expect(respuesta.status(), `intento ${intento}`).toBe(401);
  }
  const bloqueada = await iniciarSesion(page, "nadie@carrera-aps.local", "contrasena-incorrecta");
  expect(bloqueada.status()).toBe(429);
  await expect(page.getByRole("alert").filter({ hasText: "Demasiados intentos. Espera 15 minutos." })).toBeVisible();
});

test("primer ingreso: obliga a cambiar la contraseña, entra al portal y vuelve a entrar directo", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Cambia el estado del usuario de prueba; se ejecuta una vez por corrida.");
  const { email, inicial, nueva } = credenciales();

  await page.goto("/login");
  const respuesta = await iniciarSesion(page, email, inicial);
  expect(respuesta.status()).toBe(200);
  await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  await expect(page.getByRole("heading", { name: "Cambiar contraseña" })).toBeVisible();
  await expect(page.getByText("Es tu primer ingreso.")).toBeVisible();
  await sinViolacionesAxe(page);

  // Validación en el cliente: confirmación distinta
  await page.getByLabel("Contraseña actual").fill(inicial);
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(nueva);
  await page.getByLabel("Repetir contraseña nueva").fill(`${nueva}x`);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();

  // Cambio correcto: Better Auth guarda la nueva y la acción levanta la marca de primer ingreso
  await page.getByLabel("Repetir contraseña nueva").fill(nueva);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page).toHaveURL(/\/mi-carrera$/);
  await expect(page.getByRole("heading", { name: "Mi carrera" })).toBeVisible();
  await sinViolacionesAxe(page);

  // El inicio administrativo no es para funcionarios
  await page.goto("/");
  await expect(page).toHaveURL(/\/mi-carrera$/);

  // Cerrar sesión y volver a entrar con la contraseña nueva: directo al portal
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await iniciarSesion(page, email, nueva);
  await expect(page).toHaveURL(/\/mi-carrera$/);

  // Rastro: la marca de primer ingreso quedó auditada
  const usuario = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(usuario.debeCambiarPassword).toBe(false);
  const auditoria = await prisma.auditoria.findFirst({
    where: { usuarioId: usuario.id, entidad: "User", accion: "EDITAR" },
    orderBy: { fecha: "desc" },
  });
  expect(auditoria?.despues).toEqual({ debeCambiarPassword: false });
});
