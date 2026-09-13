// Preparación global de las pruebas E2E: un usuario FUNCIONARIO de prueba en estado de primer ingreso.
//
// La contraseña se genera al azar en cada ejecución y viaja a los tests por process.env: no queda en el
// repositorio ni se imprime. Si el usuario ya existe, se restablecen contraseña, marca de primer ingreso y
// sesiones. También se limpia la tabla rateLimit para que los intentos de otras ejecuciones no bloqueen.
// Requiere la institución creada por `pnpm seed:bootstrap`.

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { auth } from "../../src/lib/auth/auth";
import { prisma } from "../../src/lib/db/prisma";

export const E2E_FUNCIONARIO_EMAIL = "funcionario.prueba@carrera-aps.local";

export default async function globalSetup(): Promise<void> {
  const passwordInicial = randomBytes(12).toString("base64url");
  const passwordNueva = randomBytes(12).toString("base64url");

  const institucion = await prisma.institucion.findFirst({ orderBy: { createdAt: "asc" } });
  if (!institucion) {
    throw new Error("No hay institución en la base: ejecuta `pnpm seed:bootstrap` antes de las pruebas E2E.");
  }

  const existente = await prisma.user.findUnique({ where: { email: E2E_FUNCIONARIO_EMAIL } });
  if (!existente) {
    await auth.api.createUser({
      body: {
        email: E2E_FUNCIONARIO_EMAIL,
        password: passwordInicial,
        name: "Funcionario de prueba (E2E)",
        role: "FUNCIONARIO",
        data: { institucionId: institucion.id, debeCambiarPassword: true },
      },
    });
  } else {
    const contexto = await auth.$context;
    const hash = await contexto.password.hash(passwordInicial);
    await contexto.internalAdapter.updatePassword(existente.id, hash);
    await prisma.user.update({
      where: { id: existente.id },
      data: { debeCambiarPassword: true, banned: false, role: "FUNCIONARIO", institucionId: institucion.id },
    });
    await prisma.session.deleteMany({ where: { userId: existente.id } });
  }

  await prisma.rateLimit.deleteMany();

  process.env.E2E_FUNCIONARIO_EMAIL = E2E_FUNCIONARIO_EMAIL;
  process.env.E2E_FUNCIONARIO_PASSWORD = passwordInicial;
  process.env.E2E_FUNCIONARIO_PASSWORD_NUEVA = passwordNueva;

  await prisma.$disconnect();
}
