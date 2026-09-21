// Consulta de alertas persistidas para el módulo Alertas (doc 05 §9, doc 13 F7). Solo lectura.

import { prisma } from "@/lib/db/prisma";
import { aDate, sumarDias } from "@/lib/fechas/civil";
import type { Prisma, TipoAlerta } from "@/generated/prisma/client";

import { TIPOS_ALERTA, type FiltrosAlertas } from "./tipos";

export { TIPOS_ALERTA };
export type { FiltrosAlertas };

export const INCLUIR_ALERTA = {
  funcionario: { select: { id: true, nombres: true, apellidos: true, rut: true, categoria: true, establecimiento: { select: { nombre: true } } } },
  atendidaPor: { select: { name: true } },
} satisfies Prisma.AlertaInclude;

export type AlertaConFuncionario = Prisma.AlertaGetPayload<{ include: typeof INCLUIR_ALERTA }>;

export interface ResultadoAlertas {
  filas: AlertaConFuncionario[];
  total: number;
  activasPorTipo: Array<{ tipo: TipoAlerta; total: number }>;
  totalActivas: number;
}

export async function listarAlertas(institucionId: string, filtros: FiltrosAlertas, porPagina = 100): Promise<ResultadoAlertas> {
  const q = filtros.q?.trim();
  const rut = q ? q.replace(/[^0-9kK]/g, "").toUpperCase() : "";
  const where: Prisma.AlertaWhereInput = {
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
    tipo: filtros.tipo || undefined,
    estado: filtros.estado === "TODAS" ? undefined : filtros.estado,
    fechaHito: filtros.desde || filtros.hasta ? { gte: filtros.desde ? aDate(filtros.desde) : undefined, lt: filtros.hasta ? aDate(sumarDias(filtros.hasta, 1)) : undefined } : undefined,
  };
  const [filas, total, grupos] = await Promise.all([
    prisma.alerta.findMany({
      where,
      include: INCLUIR_ALERTA,
      orderBy: [{ estado: "asc" }, { fechaHito: "asc" }, { generadaEl: "asc" }],
      skip: (filtros.pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.alerta.count({ where }),
    prisma.alerta.groupBy({ by: ["tipo"], where: { estado: "ACTIVA", funcionario: { institucionId } }, _count: { _all: true } }),
  ]);
  const conteo = new Map(grupos.map((g) => [g.tipo, g._count._all]));
  const activasPorTipo = TIPOS_ALERTA.map((tipo) => ({ tipo, total: conteo.get(tipo) ?? 0 })).filter((x) => x.total > 0);
  return { filas, total, activasPorTipo, totalActivas: activasPorTipo.reduce((s, x) => s + x.total, 0) };
}

export async function contarAlertasActivas(institucionId: string): Promise<number> {
  return prisma.alerta.count({ where: { estado: "ACTIVA", funcionario: { institucionId } } });
}
