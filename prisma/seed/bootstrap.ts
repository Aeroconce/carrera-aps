// Arranque mínimo de una instalación (desarrollo y demo): la cuenta ADMIN inicial y la institución.
//
// Por qué un script y no la interfaz: crear usuarios exige una sesión de ADMIN y no existe registro público
// (doc 07). Better Auth acepta `auth.api.createUser` desde el servidor sin sesión cuando la llamada no trae
// cabeceras ni request, así que la cuenta pasa por su validación de correo, su hash de contraseña y su cuenta
// de credenciales, sin duplicar esa lógica aquí.
//
// Orden: primero el ADMIN (tablas de Better Auth, escritas por la librería) y después la institución y el
// vínculo del ADMIN con ella, ambos auditados con conAuditoria a nombre de ese ADMIN, porque Auditoria exige
// un usuario. Es idempotente: cada paso se salta si ya está hecho.
//
// Valores: SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD desde .env (ver .env.example). La institución es la ficticia
// del doc 08; sus datos no corresponden a ninguna institución real. El ADMIN debe cambiar la contraseña al
// primer ingreso (debeCambiarPassword).
//
// Ejecutar: pnpm seed:bootstrap

import "dotenv/config";
import { auth } from "../../src/lib/auth/auth";
import { conAuditoria } from "../../src/lib/db/auditado";
import { prisma } from "../../src/lib/db/prisma";

const INSTITUCION_DEMO = {
  nombre: "Departamento de Salud Municipal, Comuna de Demostración",
  // RUT ficticio con dígito verificador válido (11.111.111-1), guardado sin puntos ni guion
  rut: "111111111",
  comuna: "Comuna de Demostración",
} as const;

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env (ver .env.example).");
  }

  // 1. Cuenta ADMIN
  let usuario = await prisma.user.findUnique({ where: { email } });
  if (usuario) {
    console.log(`ADMIN ya existe: ${email}`);
  } else {
    const creado = await auth.api.createUser({
      body: {
        email,
        password,
        name: "Administración (demo)",
        role: "ADMIN",
        data: { debeCambiarPassword: true },
      },
    });
    usuario = await prisma.user.findUniqueOrThrow({ where: { id: creado.user.id } });
    console.log(`ADMIN creado: ${email} (debe cambiar la contraseña al primer ingreso)`);
  }
  const usuarioId = usuario.id;

  // 2. Institución de demostración, auditada como CREAR
  let institucion = await prisma.institucion.findUnique({ where: { rut: INSTITUCION_DEMO.rut } });
  if (institucion) {
    console.log(`Institución ya existe: ${institucion.nombre}`);
  } else {
    institucion = await conAuditoria({ usuarioId }, "CREAR", "Institucion", async (tx) => {
      const nueva = await tx.institucion.create({ data: INSTITUCION_DEMO });
      return { resultado: nueva, entidadId: nueva.id, despues: nueva, detalle: "Arranque de la instalación" };
    });
    console.log(`Institución creada: ${institucion.nombre}`);
  }
  const institucionId = institucion.id;

  // 3. Vincular el ADMIN a la institución, auditado como EDITAR
  if (usuario.institucionId === institucionId) {
    console.log("ADMIN ya vinculado a la institución");
  } else {
    const antes = { institucionId: usuario.institucionId };
    await conAuditoria({ usuarioId }, "EDITAR", "User", async (tx) => {
      const actualizado = await tx.user.update({ where: { id: usuarioId }, data: { institucionId } });
      return {
        resultado: actualizado,
        entidadId: actualizado.id,
        antes,
        despues: { institucionId: actualizado.institucionId },
        detalle: "Arranque de la instalación",
      };
    });
    console.log("ADMIN vinculado a la institución");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Error en el arranque:", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
