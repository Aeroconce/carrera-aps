// Aplica a las cuentas de demostración ya existentes las contraseñas de .env (SEED_*_PASSWORD) sin tocar
// ningún otro dato: sirve para cambiarlas después del seed (por ejemplo, la contraseña sencilla acordada
// para la demo). Las cuentas quedan activas, sin cambio obligatorio de contraseña y con sus sesiones cerradas.
// Nunca imprime las contraseñas. Uso: pnpm exec tsx scripts/aplicar-contrasenas-demo.ts
// (en la demo, dentro del contenedor `web`: ver docs/17).

import "dotenv/config";
import { auth } from "../src/lib/auth/auth";
import { prisma } from "../src/lib/db/prisma";

const CUENTAS = [
  { email: process.env.SEED_ADMIN_EMAIL ?? "admin.demo@carrera-aps.local", password: process.env.SEED_ADMIN_PASSWORD },
  { email: process.env.SEED_SUPERVISION_EMAIL ?? "supervision.demo@carrera-aps.local", password: process.env.SEED_SUPERVISION_PASSWORD },
  { email: process.env.SEED_FUNCIONARIO_EMAIL ?? "funcionario.demo@carrera-aps.local", password: process.env.SEED_FUNCIONARIO_PASSWORD },
];

async function main(): Promise<void> {
  const contexto = await auth.$context;
  for (const cuenta of CUENTAS) {
    const email = cuenta.email.trim().toLowerCase();
    if (!cuenta.password) {
      console.log(`${email}: sin contraseña en .env, se omite`);
      continue;
    }
    const usuario = await prisma.user.findUnique({ where: { email } });
    if (!usuario) {
      console.log(`${email}: no existe (ejecuta los seeds primero)`);
      continue;
    }
    await contexto.internalAdapter.updatePassword(usuario.id, await contexto.password.hash(cuenta.password));
    await prisma.session.deleteMany({ where: { userId: usuario.id } });
    await prisma.user.update({ where: { id: usuario.id }, data: { debeCambiarPassword: false, banned: false } });
    console.log(`${email}: contraseña aplicada`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Error al aplicar contraseñas:", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
