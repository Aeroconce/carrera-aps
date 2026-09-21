// Consulta del módulo Capacitaciones (doc 05 §4): listado con filtros y vista por período. Solo lectura.
// Los puntajes calculado y aplicado se leen de la base (los mantiene sincronizarCapacitacion al registrar).

import { prisma } from "@/lib/db/prisma";
import { finDeAnio } from "@/lib/fechas/civil";
import { cargarReglas } from "@/lib/carrera/reglas";
import type { Prisma } from "@/generated/prisma/client";

export interface FiltrosCapacitaciones {
  q?: string;
  establecimientoId?: string;
  periodo?: number;
  aprobado?: boolean;
  pagina: number;
}

export const INCLUIR_CAPACITACION = {
  funcionario: { select: { id: true, nombres: true, apellidos: true, rut: true, categoria: true, establecimiento: { select: { nombre: true } } } },
} satisfies Prisma.CapacitacionInclude;

export type CapacitacionConFuncionario = Prisma.CapacitacionGetPayload<{ include: typeof INCLUIR_CAPACITACION }>;

export async function listarCapacitaciones(institucionId: string, filtros: FiltrosCapacitaciones, porPagina = 100) {
  const q = filtros.q?.trim();
  const rut = q ? q.replace(/[^0-9kK]/g, "").toUpperCase() : "";
  const where: Prisma.CapacitacionWhereInput = {
    funcionario: {
      institucionId,
      establecimientoId: filtros.establecimientoId || undefined,
      ...(q
        ? {
            OR: [
              { nombres: { contains: q, mode: "insensitive" } },
              { apellidos: { contains: q, mode: "insensitive" } },
              ...(rut ? [{ rut: { startsWith: rut } }] : []),
            ],
          }
        : {}),
    },
    periodo: filtros.periodo,
    aprobado: filtros.aprobado,
  };
  const [filas, total, periodos] = await Promise.all([
    prisma.capacitacion.findMany({ where, include: INCLUIR_CAPACITACION, orderBy: [{ fechaTermino: "desc" }], skip: (filtros.pagina - 1) * porPagina, take: porPagina }),
    prisma.capacitacion.count({ where }),
    prisma.capacitacion.findMany({ where: { funcionario: { institucionId } }, distinct: ["periodo"], select: { periodo: true }, orderBy: { periodo: "desc" } }),
  ]);
  return { filas, total, periodos: periodos.map((p) => p.periodo) };
}

export interface ResumenPeriodoFila {
  funcionario: { id: string; nombres: string; apellidos: string; rut: string; categoria: string; establecimiento: string };
  actividades: number;
  calculado: number;
  arrastreRecibido: number;
  tope: number | null;
  aplicado: number;
  excedente: number;
}

/** Vista por período (doc 05 §4): cada funcionario con calculado, arrastre, aplicado y excedente del período. */
export async function resumenPorPeriodo(institucionId: string, periodo: number): Promise<ResumenPeriodoFila[]> {
  const [capacitaciones, arrastres, reglas] = await Promise.all([
    prisma.capacitacion.findMany({ where: { periodo, funcionario: { institucionId } }, include: INCLUIR_CAPACITACION }),
    prisma.excedenteCapacitacion.findMany({ where: { periodoDestino: periodo, funcionario: { institucionId } } }),
    cargarReglas(institucionId),
  ]);
  const porFuncionario = new Map<string, ResumenPeriodoFila>();
  const topeDe = (categoria: string): number | null => {
    const p = reglas.parametrosOpcionales("TOPE_CAPACITACION_ANUAL", finDeAnio(periodo), categoria as "A");
    return p ? Number(p.tope) : null;
  };
  for (const c of capacitaciones) {
    const f = c.funcionario;
    const fila = porFuncionario.get(f.id) ?? {
      funcionario: { id: f.id, nombres: f.nombres, apellidos: f.apellidos, rut: f.rut, categoria: f.categoria, establecimiento: f.establecimiento.nombre },
      actividades: 0,
      calculado: 0,
      arrastreRecibido: 0,
      tope: topeDe(f.categoria),
      aplicado: 0,
      excedente: 0,
    };
    fila.actividades++;
    fila.calculado += Number(c.puntajeCalculado);
    fila.aplicado += Number(c.puntajeAplicado);
    porFuncionario.set(f.id, fila);
  }
  for (const e of arrastres) {
    const fila = porFuncionario.get(e.funcionarioId);
    if (fila) fila.arrastreRecibido += Number(e.puntaje);
  }
  for (const fila of porFuncionario.values()) {
    fila.calculado = Math.round(fila.calculado * 100) / 100;
    fila.aplicado = Math.round(fila.aplicado * 100) / 100;
    fila.arrastreRecibido = Math.round(fila.arrastreRecibido * 100) / 100;
    fila.excedente = Math.max(0, Math.round((fila.calculado - fila.aplicado) * 100) / 100);
  }
  return [...porFuncionario.values()].sort((a, b) => b.calculado - a.calculado || a.funcionario.apellidos.localeCompare(b.funcionario.apellidos));
}
