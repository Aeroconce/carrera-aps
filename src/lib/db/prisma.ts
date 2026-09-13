// Cliente Prisma único por proceso (doc 15: `src/lib/db`).
//
// Prisma 7 no trae motor Rust: la conexión la hace el driver adapter de `pg` sobre DATABASE_URL.
// Cada PrismaClient abre su propio pool de conexiones, así que se crea una sola instancia por proceso.
// En desarrollo se guarda en globalThis para que el hot reload de Next.js no abra pools nuevos en cada cambio.
//
// Importación relativa (no `@/`): este archivo también lo cargan herramientas externas (CLI de Better Auth, tsx).

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

function crearCliente(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida. Copia .env.example a .env y completa los valores.");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const global = globalThis as unknown as { prismaCarreraAps?: PrismaClient };

export const prisma: PrismaClient = global.prismaCarreraAps ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  global.prismaCarreraAps = prisma;
}
