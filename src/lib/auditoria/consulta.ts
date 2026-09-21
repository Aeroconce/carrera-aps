// Consulta de la bitácora (doc 05 §11, doc 07, doc 13 F10): filtros por fecha, usuario, entidad, acción y
// funcionario; resuelve el funcionario afectado de cada entrada a partir de la entidad y su id. Solo lectura.

import { prisma } from "@/lib/db/prisma";
import { aDate, sumarDias, type FechaCivil } from "@/lib/fechas/civil";
import type { AccionAuditoria, Auditoria, Prisma } from "@/generated/prisma/client";

export interface FiltrosAuditoria {
  desde?: FechaCivil;
  hasta?: FechaCivil;
  usuarioId?: string;
  entidad?: string;
  accion?: AccionAuditoria;
  funcionarioId?: string;
  q?: string;
  pagina: number;
}

export interface FuncionarioAfectado {
  id: string;
  nombres: string;
  apellidos: string;
}

export type EntradaAuditoria = Auditoria & { usuario: { name: string }; funcionario: FuncionarioAfectado | null };

/** Ids de todos los registros que cuelgan de un funcionario (los que aparecen como entidadId en la bitácora). */
export async function idsDeFuncionario(funcionarioId: string): Promise<string[]> {
  const [bienios, capacitaciones, estudios, niveles, experiencias, apertura, alertas, calificaciones] = await Promise.all([
    prisma.bienio.findMany({ where: { funcionarioId }, select: { id: true } }),
    prisma.capacitacion.findMany({ where: { funcionarioId }, select: { id: true } }),
    prisma.estudio.findMany({ where: { funcionarioId }, select: { id: true } }),
    prisma.nivelHistorico.findMany({ where: { funcionarioId }, select: { id: true } }),
    prisma.experiencia.findMany({ where: { funcionarioId }, select: { id: true } }),
    prisma.apertura.findUnique({ where: { funcionarioId }, select: { id: true } }),
    prisma.alerta.findMany({ where: { funcionarioId }, select: { id: true } }),
    prisma.calificacionFuncionario.findMany({ where: { funcionarioId }, select: { id: true } }),
  ]);
  return [funcionarioId, ...[...bienios, ...capacitaciones, ...estudios, ...niveles, ...experiencias, ...alertas, ...calificaciones].map((x) => x.id), ...(apertura ? [apertura.id] : [])];
}

/** Para cada entrada, el funcionario al que pertenece la entidad afectada (si aplica). */
async function resolverFuncionarios(entradas: Auditoria[]): Promise<Map<string, FuncionarioAfectado>> {
  const porEntidad = new Map<string, Set<string>>();
  for (const e of entradas) {
    if (!porEntidad.has(e.entidad)) porEntidad.set(e.entidad, new Set());
    porEntidad.get(e.entidad)!.add(e.entidadId);
  }
  const ids = (entidad: string) => [...(porEntidad.get(entidad) ?? [])];
  const consulta = async (entidad: string, buscar: (ids: string[]) => Promise<Array<{ id: string; funcionarioId: string }>>) =>
    ids(entidad).length ? buscar(ids(entidad)) : [];

  const relaciones = await Promise.all([
    consulta("Bienio", (i) => prisma.bienio.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
    consulta("Capacitacion", (i) => prisma.capacitacion.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
    consulta("Estudio", (i) => prisma.estudio.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
    consulta("NivelHistorico", (i) => prisma.nivelHistorico.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
    consulta("Experiencia", (i) => prisma.experiencia.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
    consulta("Apertura", (i) => prisma.apertura.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
    consulta("Alerta", (i) => prisma.alerta.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
    consulta("CalificacionFuncionario", (i) => prisma.calificacionFuncionario.findMany({ where: { id: { in: i } }, select: { id: true, funcionarioId: true } })),
  ]);
  const entidadAFuncionario = new Map<string, string>();
  for (const id of ids("Funcionario")) entidadAFuncionario.set(id, id);
  for (const lista of relaciones) for (const r of lista) entidadAFuncionario.set(r.id, r.funcionarioId);

  const funcionarioIds = [...new Set(entidadAFuncionario.values())];
  const funcionarios = funcionarioIds.length
    ? await prisma.funcionario.findMany({ where: { id: { in: funcionarioIds } }, select: { id: true, nombres: true, apellidos: true } })
    : [];
  const porId = new Map(funcionarios.map((f) => [f.id, f]));
  const salida = new Map<string, FuncionarioAfectado>();
  for (const [entidadId, funcionarioId] of entidadAFuncionario) {
    const f = porId.get(funcionarioId);
    if (f) salida.set(entidadId, f);
  }
  return salida;
}

export async function listarAuditoria(institucionId: string, filtros: FiltrosAuditoria, porPagina = 100): Promise<{ filas: EntradaAuditoria[]; total: number }> {
  const where: Prisma.AuditoriaWhereInput = {
    usuario: { institucionId },
    usuarioId: filtros.usuarioId || undefined,
    entidad: filtros.entidad || undefined,
    accion: filtros.accion || undefined,
    fecha: filtros.desde || filtros.hasta ? { gte: filtros.desde ? aDate(filtros.desde) : undefined, lt: filtros.hasta ? aDate(sumarDias(filtros.hasta, 1)) : undefined } : undefined,
  };
  if (filtros.funcionarioId) where.entidadId = { in: await idsDeFuncionario(filtros.funcionarioId) };
  if (filtros.q) where.OR = [{ detalle: { contains: filtros.q, mode: "insensitive" } }, { entidadId: filtros.q }];

  const [entradas, total] = await Promise.all([
    prisma.auditoria.findMany({ where, include: { usuario: { select: { name: true } } }, orderBy: { fecha: "desc" }, skip: (filtros.pagina - 1) * porPagina, take: porPagina }),
    prisma.auditoria.count({ where }),
  ]);
  const funcionarios = await resolverFuncionarios(entradas);
  return { filas: entradas.map((e) => ({ ...e, funcionario: funcionarios.get(e.entidadId) ?? null })), total };
}

export async function opcionesAuditoria(institucionId: string) {
  const [usuarios, entidades, funcionarios] = await Promise.all([
    prisma.user.findMany({ where: { institucionId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.auditoria.findMany({ distinct: ["entidad"], select: { entidad: true }, orderBy: { entidad: "asc" } }),
    prisma.funcionario.findMany({ where: { institucionId }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], select: { id: true, nombres: true, apellidos: true, rut: true } }),
  ]);
  return { usuarios, entidades: entidades.map((e) => e.entidad), funcionarios };
}
