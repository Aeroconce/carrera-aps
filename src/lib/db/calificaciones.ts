// Calificaciones (BT 4.6, doc 05 §6) en la versión simplificada de la demo (doc 09, decisión del 21/09):
// procesos anuales mínimos (nombre y período) y calificación por funcionario con puntaje final, lista según la
// regla CALIFICACION vigente y anotaciones de mérito o demérito. Todo auditado (CALIFICAR / CREAR / EDITAR).

import { aDate, type FechaCivil } from "@/lib/fechas/civil";
import type { ConjuntoReglas } from "@/lib/motor/reglas";
import type { Categoria, CalificacionFuncionario, NotaMerito, ProcesoCalificacion, TipoNota } from "@/generated/prisma/client";
import { conAuditoria, type ContextoAuditoria } from "./auditado";
import { diffCampos } from "./diff-campos";

/** Lista según la regla CALIFICACION vigente al cierre del período: la primera cuyo mínimo alcance el puntaje. */
export function listaDe(reglas: ConjuntoReglas, fechaCierre: FechaCivil, categoria: Categoria, puntaje: number): string | null {
  const regla = reglas.parametrosOpcionales("CALIFICACION", fechaCierre, categoria);
  if (!regla) return null;
  const listas = [...regla.listas].sort((a, b) => b.puntajeMinimo - a.puntajeMinimo);
  return listas.find((l) => puntaje >= l.puntajeMinimo)?.nombre ?? listas[listas.length - 1]?.nombre ?? null;
}

export async function crearProceso(ctx: ContextoAuditoria, institucionId: string, datos: { nombre: string; periodoDesde: FechaCivil; periodoHasta: FechaCivil }): Promise<ProcesoCalificacion> {
  return conAuditoria(ctx, "CREAR", "ProcesoCalificacion", async (tx) => {
    const creado = await tx.procesoCalificacion.create({ data: { institucionId, nombre: datos.nombre, periodoDesde: aDate(datos.periodoDesde), periodoHasta: aDate(datos.periodoHasta) } });
    return { resultado: creado, entidadId: creado.id, despues: { nombre: creado.nombre, periodoDesde: creado.periodoDesde, periodoHasta: creado.periodoHasta } };
  });
}

export async function cambiarEstadoProceso(ctx: ContextoAuditoria, id: string, estado: "ABIERTO" | "CERRADO"): Promise<ProcesoCalificacion> {
  return conAuditoria(ctx, "EDITAR", "ProcesoCalificacion", async (tx) => {
    const antes = await tx.procesoCalificacion.findUniqueOrThrow({ where: { id } });
    const despues = await tx.procesoCalificacion.update({ where: { id }, data: { estado } });
    return { resultado: despues, entidadId: id, ...diffCampos(antes, despues), detalle: estado === "CERRADO" ? "Proceso cerrado" : "Proceso reabierto" };
  });
}

export interface DatosCalificacion {
  procesoId: string;
  funcionarioId: string;
  puntajeFinal: number;
  lista: string | null;
  observaciones?: string | null;
  /** Notas por factor, si el proceso las usa: { factorId: nota } */
  puntajes?: Record<string, number>;
}

/** Crea o reemplaza la calificación del funcionario en el proceso (doc 13 F15). */
export async function calificar(ctx: ContextoAuditoria, datos: DatosCalificacion): Promise<CalificacionFuncionario> {
  return conAuditoria(ctx, "CALIFICAR", "CalificacionFuncionario", async (tx) => {
    const antes = await tx.calificacionFuncionario.findUnique({ where: { procesoId_funcionarioId: { procesoId: datos.procesoId, funcionarioId: datos.funcionarioId } } });
    const data = { puntajeFinal: datos.puntajeFinal.toFixed(2), lista: datos.lista, observaciones: datos.observaciones ?? null, puntajes: datos.puntajes ?? {} };
    const despues = antes
      ? await tx.calificacionFuncionario.update({ where: { id: antes.id }, data })
      : await tx.calificacionFuncionario.create({ data: { procesoId: datos.procesoId, funcionarioId: datos.funcionarioId, ...data } });
    return { resultado: despues, entidadId: despues.id, antes: antes ? { puntajeFinal: antes.puntajeFinal, lista: antes.lista } : undefined, despues: { puntajeFinal: despues.puntajeFinal, lista: despues.lista, observaciones: despues.observaciones } };
  });
}

export async function agregarNota(ctx: ContextoAuditoria, calificacionId: string, datos: { tipo: TipoNota; descripcion: string; fecha: FechaCivil }): Promise<NotaMerito> {
  return conAuditoria(ctx, "CREAR", "NotaMerito", async (tx) => {
    const creada = await tx.notaMerito.create({ data: { calificacionId, tipo: datos.tipo, descripcion: datos.descripcion, fecha: aDate(datos.fecha) } });
    return { resultado: creada, entidadId: creada.id, despues: { calificacionId, tipo: creada.tipo, descripcion: creada.descripcion, fecha: creada.fecha } };
  });
}
