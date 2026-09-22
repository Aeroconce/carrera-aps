// Calificaciones (BT 4.6, doc 05 §6, doc 13 F15): procesos anuales con comisión evaluadora y factores y
// subfactores ponderados; calificación por funcionario con nota por factor, puntaje final calculado, lista según
// la regla CALIFICACION vigente, acta adjunta y anotaciones de mérito o demérito. Todo auditado.

import { calcularPuntajeFinal, type FactorBase } from "@/lib/calificaciones/puntaje";
import { aDate, type FechaCivil } from "@/lib/fechas/civil";
import type { ConjuntoReglas } from "@/lib/motor/reglas";
import type { Categoria, CalificacionFuncionario, ComisionCalificacion, FactorCalificacion, NotaMerito, ProcesoCalificacion, TipoNota } from "@/generated/prisma/client";
import { conAuditoria, type ContextoAuditoria } from "./auditado";
import { diffCampos } from "./diff-campos";

/** Lista según la regla CALIFICACION vigente al cierre del período: la primera cuyo mínimo alcance el puntaje. */
export function listaDe(reglas: ConjuntoReglas, fechaCierre: FechaCivil, categoria: Categoria, puntaje: number): string | null {
  const regla = reglas.parametrosOpcionales("CALIFICACION", fechaCierre, categoria);
  if (!regla) return null;
  const listas = [...regla.listas].sort((a, b) => b.puntajeMinimo - a.puntajeMinimo);
  return listas.find((l) => puntaje >= l.puntajeMinimo)?.nombre ?? listas[listas.length - 1]?.nombre ?? null;
}

/** Forma pura del factor (Decimal → número) para el cálculo del puntaje y los componentes de cliente. */
export function aFactorBase(f: FactorCalificacion): FactorBase {
  return { id: f.id, nombre: f.nombre, padreId: f.padreId, ponderacion: Number(f.ponderacion), orden: f.orden };
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

// --- Comisión evaluadora -------------------------------------------------------------------------------------

export async function agregarIntegrante(ctx: ContextoAuditoria, procesoId: string, datos: { nombre: string; rol: string }): Promise<ComisionCalificacion> {
  return conAuditoria(ctx, "CREAR", "ComisionCalificacion", async (tx) => {
    const creado = await tx.comisionCalificacion.create({ data: { procesoId, nombre: datos.nombre, rol: datos.rol } });
    return { resultado: creado, entidadId: creado.id, despues: { procesoId, nombre: creado.nombre, rol: creado.rol }, detalle: "Integrante agregado a la comisión" };
  });
}

export async function quitarIntegrante(ctx: ContextoAuditoria, id: string): Promise<void> {
  await conAuditoria(ctx, "ELIMINAR", "ComisionCalificacion", async (tx) => {
    const antes = await tx.comisionCalificacion.findUniqueOrThrow({ where: { id } });
    await tx.comisionCalificacion.delete({ where: { id } });
    return { resultado: undefined, entidadId: id, antes: { procesoId: antes.procesoId, nombre: antes.nombre, rol: antes.rol }, detalle: "Integrante quitado de la comisión" };
  });
}

// --- Factores y subfactores ----------------------------------------------------------------------------------

export async function crearFactor(ctx: ContextoAuditoria, procesoId: string, datos: { nombre: string; ponderacion: number; padreId: string | null }): Promise<FactorCalificacion> {
  return conAuditoria(ctx, "CREAR", "FactorCalificacion", async (tx) => {
    if (datos.padreId) {
      const padre = await tx.factorCalificacion.findFirst({ where: { id: datos.padreId, procesoId, padreId: null } });
      if (!padre) throw new Error("El factor principal no existe en este proceso.");
    }
    const orden = await tx.factorCalificacion.count({ where: { procesoId, padreId: datos.padreId } });
    const creado = await tx.factorCalificacion.create({ data: { procesoId, nombre: datos.nombre, ponderacion: datos.ponderacion.toFixed(2), padreId: datos.padreId, orden } });
    return { resultado: creado, entidadId: creado.id, despues: { procesoId, nombre: creado.nombre, ponderacion: creado.ponderacion, padreId: creado.padreId }, detalle: datos.padreId ? "Subfactor creado" : "Factor creado" };
  });
}

/** Elimina el factor y sus subfactores. Las notas ya registradas conservan su puntaje final. */
export async function eliminarFactor(ctx: ContextoAuditoria, id: string): Promise<void> {
  await conAuditoria(ctx, "ELIMINAR", "FactorCalificacion", async (tx) => {
    const antes = await tx.factorCalificacion.findUniqueOrThrow({ where: { id }, include: { subfactores: true } });
    await tx.factorCalificacion.deleteMany({ where: { padreId: id } });
    await tx.factorCalificacion.delete({ where: { id } });
    return {
      resultado: undefined,
      entidadId: id,
      antes: { procesoId: antes.procesoId, nombre: antes.nombre, ponderacion: antes.ponderacion, padreId: antes.padreId, subfactores: antes.subfactores.map((s) => `${s.nombre} (${Number(s.ponderacion)})`) },
      detalle: antes.subfactores.length > 0 ? `Factor eliminado con ${antes.subfactores.length} subfactores` : antes.padreId ? "Subfactor eliminado" : "Factor eliminado",
    };
  });
}

/** Copia factores y subfactores de otro proceso (doc 05 §6: "copiar del proceso anterior"). Devuelve cuántos copió. */
export async function copiarFactores(ctx: ContextoAuditoria, procesoDestinoId: string, procesoOrigenId: string): Promise<number> {
  return conAuditoria(ctx, "EDITAR", "ProcesoCalificacion", async (tx) => {
    const origen = await tx.procesoCalificacion.findUniqueOrThrow({ where: { id: procesoOrigenId }, include: { factores: { orderBy: [{ padreId: "asc" }, { orden: "asc" }] } } });
    const existentes = await tx.factorCalificacion.count({ where: { procesoId: procesoDestinoId } });
    if (existentes > 0) throw new Error("El proceso ya tiene factores; quítalos antes de copiar.");
    const nuevosIds = new Map<string, string>();
    let copiados = 0;
    for (const f of origen.factores.filter((x) => x.padreId === null)) {
      const creado = await tx.factorCalificacion.create({ data: { procesoId: procesoDestinoId, nombre: f.nombre, ponderacion: f.ponderacion, orden: f.orden } });
      nuevosIds.set(f.id, creado.id);
      copiados++;
    }
    for (const s of origen.factores.filter((x) => x.padreId !== null)) {
      const padreId = nuevosIds.get(s.padreId!);
      if (!padreId) continue;
      await tx.factorCalificacion.create({ data: { procesoId: procesoDestinoId, nombre: s.nombre, ponderacion: s.ponderacion, orden: s.orden, padreId } });
      copiados++;
    }
    return { resultado: copiados, entidadId: procesoDestinoId, despues: { factoresCopiados: copiados, desdeProceso: origen.nombre }, detalle: `Factores copiados de ${origen.nombre}` };
  });
}

// --- Calificación por funcionario ----------------------------------------------------------------------------

export interface DatosCalificacion {
  procesoId: string;
  funcionarioId: string;
  puntajeFinal: number;
  lista: string | null;
  observaciones?: string | null;
  /** Notas por factor o subfactor: { factorId: nota } */
  puntajes?: Record<string, number>;
  /** Acta o certificado (Documento) que respalda la calificación; undefined conserva el actual */
  actaDocumentoId?: string | null;
}

/** Puntaje final a partir de las notas por factor del proceso (null si faltan notas o el proceso no tiene factores). */
export function puntajeDesdeFactores(factores: FactorCalificacion[], notas: Record<string, number>): number | null {
  if (factores.length === 0) return null;
  return calcularPuntajeFinal(factores.map(aFactorBase), notas).puntajeFinal;
}

/** Crea o reemplaza la calificación del funcionario en el proceso (doc 13 F15). */
export async function calificar(ctx: ContextoAuditoria, datos: DatosCalificacion): Promise<CalificacionFuncionario> {
  return conAuditoria(ctx, "CALIFICAR", "CalificacionFuncionario", async (tx) => {
    const antes = await tx.calificacionFuncionario.findUnique({ where: { procesoId_funcionarioId: { procesoId: datos.procesoId, funcionarioId: datos.funcionarioId } } });
    const data = {
      puntajeFinal: datos.puntajeFinal.toFixed(2),
      lista: datos.lista,
      observaciones: datos.observaciones ?? null,
      puntajes: datos.puntajes ?? {},
      ...(datos.actaDocumentoId !== undefined ? { actaDocumentoId: datos.actaDocumentoId } : {}),
    };
    const despues = antes
      ? await tx.calificacionFuncionario.update({ where: { id: antes.id }, data })
      : await tx.calificacionFuncionario.create({ data: { procesoId: datos.procesoId, funcionarioId: datos.funcionarioId, ...data } });
    return {
      resultado: despues,
      entidadId: despues.id,
      antes: antes ? { puntajeFinal: antes.puntajeFinal, lista: antes.lista, puntajes: antes.puntajes } : undefined,
      despues: { puntajeFinal: despues.puntajeFinal, lista: despues.lista, puntajes: despues.puntajes, observaciones: despues.observaciones, actaDocumentoId: despues.actaDocumentoId },
    };
  });
}

/** Adjunta (o reemplaza) el acta o certificado de una calificación ya registrada. */
export async function adjuntarActa(ctx: ContextoAuditoria, calificacionId: string, documentoId: string): Promise<void> {
  await conAuditoria(ctx, "EDITAR", "CalificacionFuncionario", async (tx) => {
    const antes = await tx.calificacionFuncionario.findUniqueOrThrow({ where: { id: calificacionId } });
    const despues = await tx.calificacionFuncionario.update({ where: { id: calificacionId }, data: { actaDocumentoId: documentoId } });
    return { resultado: undefined, entidadId: calificacionId, ...diffCampos({ actaDocumentoId: antes.actaDocumentoId }, { actaDocumentoId: despues.actaDocumentoId }), detalle: "Acta adjuntada a la calificación" };
  });
}

export async function agregarNota(ctx: ContextoAuditoria, calificacionId: string, datos: { tipo: TipoNota; descripcion: string; fecha: FechaCivil }): Promise<NotaMerito> {
  return conAuditoria(ctx, "CREAR", "NotaMerito", async (tx) => {
    const creada = await tx.notaMerito.create({ data: { calificacionId, tipo: datos.tipo, descripcion: datos.descripcion, fecha: aDate(datos.fecha) } });
    return { resultado: creada, entidadId: creada.id, despues: { calificacionId, tipo: creada.tipo, descripcion: creada.descripcion, fecha: creada.fecha } };
  });
}
