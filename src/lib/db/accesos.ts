// Registro de accesos (BT 3.2): un registro por intento de inicio de sesión, exitoso o fallido.
// No pasa por conAuditoria porque es en sí mismo la bitácora de accesos, no un cambio de datos del dominio.
// Vive en src/lib/db porque es la única capa donde se permite escribir con el cliente Prisma (doc 15).

import { prisma } from "./prisma";

export interface IntentoAcceso {
  /** Correo con el que se intentó entrar, normalizado (minúsculas, sin espacios). */
  email: string;
  exito: boolean;
  /** Id del usuario si el intento fue exitoso. */
  usuarioId: string | null;
  ip: string;
  userAgent: string;
}

export async function registrarAcceso(intento: IntentoAcceso): Promise<void> {
  await prisma.acceso.create({ data: intento });
}
