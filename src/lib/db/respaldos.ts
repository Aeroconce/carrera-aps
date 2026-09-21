// Evidencia de respaldos (doc 07, subcriterio 15): la tabla Respaldo la alimentan el script de respaldo y el
// botón "Ejecutar respaldo ahora". Cuando lo dispara un usuario queda auditado; el cron no tiene usuario.

import type { Respaldo } from "@/generated/prisma/client";
import { conAuditoria, type ContextoAuditoria } from "./auditado";
import { prisma } from "./prisma";

export interface DatosRespaldo {
  fecha: Date;
  tipo: "bd" | "archivos";
  destino: string;
  tamano: number;
  hash: string;
  resultado: "OK" | "ERROR";
  duracionSeg: number;
  verificadoEl?: Date | null;
}

export async function registrarRespaldo(datos: DatosRespaldo, ctx?: ContextoAuditoria): Promise<Respaldo> {
  const data = { ...datos, tamano: BigInt(Math.round(datos.tamano)), verificadoEl: datos.verificadoEl ?? null };
  if (!ctx) {
    // Escritura del worker sin usuario (doc 07: evidencia del cron); dentro de src/lib/db, como exige la convención
    return prisma.respaldo.create({ data });
  }
  return conAuditoria(ctx, "CREAR", "Respaldo", async (tx) => {
    const creado = await tx.respaldo.create({ data });
    return { resultado: creado, entidadId: creado.id, despues: { ...datos, tamano: String(data.tamano) }, detalle: `Respaldo ${datos.tipo} ejecutado desde la aplicación` };
  });
}

/** Marca un respaldo como verificado por una restauración de prueba (política del doc 07). */
export async function marcarVerificado(ctx: ContextoAuditoria, id: string, fecha: Date): Promise<Respaldo> {
  return conAuditoria(ctx, "EDITAR", "Respaldo", async (tx) => {
    const antes = await tx.respaldo.findUniqueOrThrow({ where: { id } });
    const despues = await tx.respaldo.update({ where: { id }, data: { verificadoEl: fecha } });
    return { resultado: despues, entidadId: id, antes: { verificadoEl: antes.verificadoEl }, despues: { verificadoEl: despues.verificadoEl }, detalle: "Verificado por restauración de prueba" };
  });
}
