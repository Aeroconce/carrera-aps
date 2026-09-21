// Funcionario con su historial, de la base al motor: convierte fechas DATE a fechas civiles y Decimal a
// texto, y calcula el estado de carrera a una fecha. Solo lectura; las escrituras están en src/lib/db/carrera.ts.

import { prisma } from "@/lib/db/prisma";
import { desdeDate, hoyEnChile, type FechaCivil } from "@/lib/fechas/civil";
import { calcularEstadoCarrera, type EstadoCarrera } from "@/lib/motor/estado";
import type { ConjuntoReglas } from "@/lib/motor/reglas";
import type { FuncionarioEntrada } from "@/lib/motor/tipos";
import type { Prisma } from "@/generated/prisma/client";
import { cargarReglas } from "./reglas";

export const INCLUIR_HISTORIAL = {
  establecimiento: true,
  apertura: true,
  experiencias: { orderBy: { fechaDesde: "asc" } },
  bienios: { orderBy: { numero: "asc" } },
  capacitaciones: { orderBy: { fechaTermino: "asc" } },
  estudios: { orderBy: { fechaObtencion: "asc" } },
  niveles: { orderBy: { fechaDesde: "asc" } },
} satisfies Prisma.FuncionarioInclude;

export type FuncionarioConHistorial = Prisma.FuncionarioGetPayload<{ include: typeof INCLUIR_HISTORIAL }>;

export function aEntradaMotor(f: FuncionarioConHistorial): FuncionarioEntrada {
  return {
    id: f.id,
    categoria: f.categoria,
    fechaIngreso: desdeDate(f.fechaIngreso),
    estado: f.estado,
    apertura: f.apertura
      ? {
          fecha: desdeDate(f.apertura.fecha),
          nivel: f.apertura.nivel,
          nivelDesde: desdeDate(f.apertura.nivelDesde),
          puntajeTotal: f.apertura.puntajeTotal.toString(),
          desglosado: f.apertura.desglosado,
          puntajeExperiencia: f.apertura.puntajeExperiencia?.toString() ?? null,
          puntajeCapacitacion: f.apertura.puntajeCapacitacion?.toString() ?? null,
          fechaUltimoBienio: f.apertura.fechaUltimoBienio ? desdeDate(f.apertura.fechaUltimoBienio) : null,
          bieniosReconocidos: f.apertura.bieniosReconocidos,
          excedentePendiente: f.apertura.excedentePendiente?.toString() ?? null,
        }
      : null,
    experiencias: f.experiencias.map((e) => ({
      id: e.id,
      esPropia: e.esPropia,
      fechaDesde: desdeDate(e.fechaDesde),
      fechaHasta: e.fechaHasta ? desdeDate(e.fechaHasta) : null,
      jornadaHoras: e.jornadaHoras,
      reconocidaEl: e.reconocidaEl ? desdeDate(e.reconocidaEl) : null,
    })),
    bienios: f.bienios.map((b) => ({
      id: b.id,
      numero: b.numero,
      fechaCumplido: desdeDate(b.fechaCumplido),
      fechaReconocido: b.fechaReconocido ? desdeDate(b.fechaReconocido) : null,
      decretoNumero: b.decretoNumero,
      puntaje: b.puntaje.toString(),
      documentoId: b.documentoId,
    })),
    capacitaciones: f.capacitaciones.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      horas: c.horas,
      fechaTermino: desdeDate(c.fechaTermino),
      aprobado: c.aprobado,
      conNota: c.notaOEvaluacion !== null,
      periodo: c.periodo,
      documentoId: c.documentoId,
    })),
    estudios: f.estudios.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipo,
      reconocidoEl: e.reconocidoEl ? desdeDate(e.reconocidoEl) : null,
      documentoId: e.documentoId,
    })),
    niveles: f.niveles.map((n) => ({
      nivel: n.nivel,
      fechaDesde: desdeDate(n.fechaDesde),
      fechaHasta: n.fechaHasta ? desdeDate(n.fechaHasta) : null,
    })),
  };
}

export async function cargarFuncionario(id: string): Promise<FuncionarioConHistorial | null> {
  return prisma.funcionario.findUnique({ where: { id }, include: INCLUIR_HISTORIAL });
}

export interface CarreraDeFuncionario {
  funcionario: FuncionarioConHistorial;
  reglas: ConjuntoReglas;
  estado: EstadoCarrera;
  fechaCorte: FechaCivil;
}

/** Ficha completa: historial de la base más el estado de carrera calculado a la fecha (hoy por defecto). */
export async function carreraDeFuncionario(id: string, fechaCorte: FechaCivil = hoyEnChile()): Promise<CarreraDeFuncionario | null> {
  const funcionario = await cargarFuncionario(id);
  if (!funcionario) return null;
  const reglas = await cargarReglas(funcionario.institucionId);
  return { funcionario, reglas, estado: calcularEstadoCarrera(aEntradaMotor(funcionario), fechaCorte, reglas), fechaCorte };
}
