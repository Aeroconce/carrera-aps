// Listado de funcionarios con su estado de carrera (doc 05 módulo 2) y resumen para Inicio (módulo 1).
// El motor es puro y rápido: se calcula el estado de cada funcionario al vuelo, sin snapshots persistidos.

import { prisma } from "@/lib/db/prisma";
import { hoyEnChile, type FechaCivil } from "@/lib/fechas/civil";
import { generarAlertas, type AlertaCalculada } from "@/lib/motor/alertas";
import { calcularEstadoCarrera, type EstadoCarrera } from "@/lib/motor/estado";
import type { Categoria, EstadoFuncionario, Prisma, TipoContrato } from "@/generated/prisma/client";
import { aEntradaMotor, INCLUIR_HISTORIAL, type FuncionarioConHistorial } from "./funcionario";
import { cargarReglas } from "./reglas";

/** Orden de importancia de las alertas para listados: primero lo que exige un acto administrativo. */
const PRIORIDAD_ALERTA: Record<AlertaCalculada["tipo"], number> = {
  NIVEL_ALCANZADO: 0,
  BIENIO_PENDIENTE_RECONOCER: 1,
  BIENIO_PROXIMO: 2,
  NIVEL_PROXIMO: 3,
  CALIFICACION_PENDIENTE: 4,
  CAPACITACION_POR_VENCER_PERIODO: 5,
  DOCUMENTO_FALTANTE: 6,
};

export function ordenarAlertas(alertas: AlertaCalculada[]): AlertaCalculada[] {
  return [...alertas].sort((a, b) => PRIORIDAD_ALERTA[a.tipo] - PRIORIDAD_ALERTA[b.tipo] || (a.fechaHito < b.fechaHito ? -1 : a.fechaHito > b.fechaHito ? 1 : 0));
}

export interface FiltrosFuncionarios {
  q?: string;
  establecimientoId?: string;
  categoria?: Categoria;
  nivel?: number;
  tipoContrato?: TipoContrato;
  estado?: EstadoFuncionario | "TODOS";
}

export interface FilaFuncionario {
  funcionario: FuncionarioConHistorial;
  estado: EstadoCarrera;
  alertas: AlertaCalculada[];
  proximaAlerta: AlertaCalculada | null;
}

export async function listarFuncionarios(
  institucionId: string,
  filtros: FiltrosFuncionarios = {},
  fechaCorte: FechaCivil = hoyEnChile(),
): Promise<FilaFuncionario[]> {
  const where: Prisma.FuncionarioWhereInput = {
    institucionId,
    estado: filtros.estado === "TODOS" ? undefined : (filtros.estado ?? "ACTIVO"),
    establecimientoId: filtros.establecimientoId || undefined,
    categoria: filtros.categoria || undefined,
    tipoContrato: filtros.tipoContrato || undefined,
  };
  const q = filtros.q?.trim();
  if (q) {
    const rut = q.replace(/[^0-9kK]/g, "").toUpperCase();
    where.OR = [
      { nombres: { contains: q, mode: "insensitive" } },
      { apellidos: { contains: q, mode: "insensitive" } },
      ...(rut ? [{ rut: { startsWith: rut } }] : []),
    ];
  }
  const [reglas, funcionarios] = await Promise.all([
    cargarReglas(institucionId),
    prisma.funcionario.findMany({ where, include: INCLUIR_HISTORIAL, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
  ]);
  const filas = funcionarios.map<FilaFuncionario>((funcionario) => {
    const estado = calcularEstadoCarrera(aEntradaMotor(funcionario), fechaCorte, reglas);
    const alertas = ordenarAlertas(generarAlertas(estado, reglas));
    return { funcionario, estado, alertas, proximaAlerta: alertas[0] ?? null };
  });
  return filtros.nivel ? filas.filter((f) => (f.estado.nivel.vigente ?? f.estado.nivel.calculado) === filtros.nivel) : filas;
}

export interface ResumenInicio {
  dotacionActiva: number;
  porEstablecimiento: Array<{ nombre: string; total: number }>;
  porCategoria: Array<{ categoria: Categoria; total: number }>;
  bieniosProximos: { en30: number; en60: number; en90: number };
  cumplenAscenso: number;
  alertasPorTipo: Array<{ tipo: string; total: number }>;
}

export async function resumenInicio(institucionId: string, fechaCorte: FechaCivil = hoyEnChile()): Promise<ResumenInicio> {
  const filas = await listarFuncionarios(institucionId, {}, fechaCorte);
  const porEstablecimiento = new Map<string, number>();
  const porCategoria = new Map<Categoria, number>();
  const alertasPorTipo = new Map<string, number>();
  const bieniosProximos = { en30: 0, en60: 0, en90: 0 };
  let cumplenAscenso = 0;
  const dias = (a: FechaCivil, b: FechaCivil) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

  for (const fila of filas) {
    porEstablecimiento.set(fila.funcionario.establecimiento.nombre, (porEstablecimiento.get(fila.funcionario.establecimiento.nombre) ?? 0) + 1);
    porCategoria.set(fila.funcionario.categoria, (porCategoria.get(fila.funcionario.categoria) ?? 0) + 1);
    const proximo = fila.estado.bienios.proximoBienio;
    if (proximo) {
      const d = dias(fechaCorte, proximo);
      if (d <= 30) bieniosProximos.en30++;
      if (d <= 60) bieniosProximos.en60++;
      if (d <= 90) bieniosProximos.en90++;
    }
    if (fila.estado.nivel.cumpleAscenso) cumplenAscenso++;
    for (const a of fila.alertas) alertasPorTipo.set(a.tipo, (alertasPorTipo.get(a.tipo) ?? 0) + 1);
  }
  return {
    dotacionActiva: filas.length,
    porEstablecimiento: [...porEstablecimiento].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total),
    porCategoria: (["A", "B", "C", "D", "E", "F"] as const).map((categoria) => ({ categoria, total: porCategoria.get(categoria) ?? 0 })),
    bieniosProximos,
    cumplenAscenso,
    alertasPorTipo: [...alertasPorTipo].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total),
  };
}
