// Escritura con auditoría obligatoria (docs 07 y 15).
//
// Toda escritura de dominio pasa por conAuditoria: abre una transacción, ejecuta la escritura recibida como
// función y deja el registro en Auditoria (usuario, fecha, acción, entidad, id, antes/después, detalle) dentro
// de la misma transacción. Si la auditoría falla, la escritura se revierte: no hay cambio sin rastro.
//
// Uso desde una server action, ya con el usuario de la sesión:
//
//   const creada = await conAuditoria({ usuarioId }, "CREAR", "Capacitacion", async (tx) => {
//     const capacitacion = await tx.capacitacion.create({ data });
//     return { resultado: capacitacion, entidadId: capacitacion.id, despues: capacitacion };
//   });
//
// Para EDITAR: leer el registro dentro de la transacción, actualizar y devolver diffCampos(antes, despues).
// Para ELIMINAR (lógico o físico): devolver el registro completo en `antes`.
//
// La regla de ESLint del proyecto impide `prisma.<modelo>.create|update|delete` fuera de src/lib/db;
// dentro del callback se escribe con el cliente transaccional `tx`.

import { AccionAuditoria, Prisma } from "../../generated/prisma/client";
import { aJson } from "./diff-campos";
import { prisma } from "./prisma";

export type ClienteTransaccion = Prisma.TransactionClient;

export interface ContextoAuditoria {
  /** Id del usuario (tabla user) que realiza la acción. */
  usuarioId: string;
}

export interface ResultadoAuditado<T> {
  resultado: T;
  /** Id del registro afectado. */
  entidadId: string;
  /** Campos anteriores (solo los que cambian) o el registro completo en una eliminación. */
  antes?: unknown;
  /** Campos nuevos (solo los que cambian) o el registro completo en una creación. */
  despues?: unknown;
  detalle?: string;
}

export interface OpcionesTransaccion {
  /** Tiempo máximo de la transacción en milisegundos (por defecto, el de Prisma: 5000). Subirlo en importaciones. */
  timeout?: number;
}

function comoJson(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  return aJson(valor) as Prisma.InputJsonValue;
}

/** Deja una entrada de auditoría dentro de una transacción ya abierta (para operaciones que afectan varias entidades). */
export async function registrarAuditoria(
  tx: ClienteTransaccion,
  ctx: ContextoAuditoria,
  accion: AccionAuditoria,
  entidad: string,
  registro: Omit<ResultadoAuditado<unknown>, "resultado">,
): Promise<void> {
  await tx.auditoria.create({
    data: {
      usuarioId: ctx.usuarioId,
      accion,
      entidad,
      entidadId: registro.entidadId,
      antes: comoJson(registro.antes),
      despues: comoJson(registro.despues),
      detalle: registro.detalle,
    },
  });
}

/** Ejecuta `fn` en una transacción y registra la auditoría en esa misma transacción. Devuelve `resultado`. */
export async function conAuditoria<T>(
  ctx: ContextoAuditoria,
  accion: AccionAuditoria,
  entidad: string,
  fn: (tx: ClienteTransaccion) => Promise<ResultadoAuditado<T>>,
  opciones: OpcionesTransaccion = {},
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const r = await fn(tx);
      await registrarAuditoria(tx, ctx, accion, entidad, r);
      return r.resultado;
    },
    { timeout: opciones.timeout },
  );
}
