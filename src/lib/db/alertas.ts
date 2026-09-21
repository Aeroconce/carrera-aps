// Alertas persistidas (doc 04 §6, doc 05 §9, subcriterios 8 y 13). El motor calcula; esta capa sincroniza la
// tabla Alerta de forma idempotente: crea las que no existan, actualiza el mensaje de las vigentes y marca
// atendidas (automáticamente) las que dejaron de cumplirse. Atender y descartar son actos del usuario, auditados.
// La sincronización deja una entrada de auditoría solo cuando cambió algo.

import { aEntradaMotor, cargarFuncionario } from "@/lib/carrera/funcionario";
import { listarFuncionarios, ordenarAlertas, type FilaFuncionario } from "@/lib/carrera/listado";
import { cargarReglas } from "@/lib/carrera/reglas";
import { aDate, desdeDate, hoyEnChile, type FechaCivil } from "@/lib/fechas/civil";
import { generarAlertas, type AlertaCalculada } from "@/lib/motor/alertas";
import { calcularEstadoCarrera } from "@/lib/motor/estado";
import { cerradaManualmente, claveAlerta, NOTA_RESUELTA_AUTOMATICA } from "@/lib/alertas/clave";
import type { Alerta } from "@/generated/prisma/client";
import { conAuditoria, registrarAuditoria, type ClienteTransaccion, type ContextoAuditoria } from "./auditado";
import { diffCampos } from "./diff-campos";
import { prisma } from "./prisma";

export interface ResultadoSincronizacion {
  nuevas: number;
  actualizadas: number;
  resueltas: number;
  activas: number;
}

interface Calculada extends AlertaCalculada {
  funcionarioId: string;
  claveGlobal: string;
}

function resumen(a: Alerta) {
  return { funcionarioId: a.funcionarioId, tipo: a.tipo, fechaHito: desdeDate(a.fechaHito), mensaje: a.mensaje, estado: a.estado, resolucionNota: a.resolucionNota };
}

async function sincronizarFilas(tx: ClienteTransaccion, filas: FilaFuncionario[], funcionarioIds: string[], fechaCorte: FechaCivil): Promise<ResultadoSincronizacion> {
  const existentes = await tx.alerta.findMany({ where: { funcionarioId: { in: funcionarioIds } }, orderBy: { generadaEl: "asc" } });
  const activas = new Map<string, Alerta>();
  const ultimas = new Map<string, Alerta>();
  for (const a of existentes) {
    const clave = claveAlerta(a.funcionarioId, a.tipo, desdeDate(a.fechaHito));
    ultimas.set(clave, a);
    if (a.estado === "ACTIVA") activas.set(clave, a);
  }

  const calculadas: Calculada[] = filas.flatMap((fila) =>
    fila.alertas.map((a) => ({ ...a, funcionarioId: fila.funcionario.id, claveGlobal: claveAlerta(fila.funcionario.id, a.tipo, a.fechaHito) })),
  );

  const resultado: ResultadoSincronizacion = { nuevas: 0, actualizadas: 0, resueltas: 0, activas: 0 };
  const vigentes = new Set<string>();

  for (const c of calculadas) {
    vigentes.add(c.claveGlobal);
    const activa = activas.get(c.claveGlobal);
    if (activa) {
      resultado.activas++;
      if (activa.mensaje !== c.mensaje) {
        await tx.alerta.update({ where: { id: activa.id }, data: { mensaje: c.mensaje } });
        resultado.actualizadas++;
      }
      continue;
    }
    const ultima = ultimas.get(c.claveGlobal);
    if (ultima && cerradaManualmente(resumen(ultima), c)) continue;

    // Puede existir una fila cerrada con la misma clave única (funcionario, tipo, fecha): se reactiva
    const mismaClave = await tx.alerta.findUnique({ where: { funcionarioId_tipo_fechaHito: { funcionarioId: c.funcionarioId, tipo: c.tipo, fechaHito: aDate(c.fechaHito) } } });
    if (mismaClave) {
      await tx.alerta.update({
        where: { id: mismaClave.id },
        data: { estado: "ACTIVA", mensaje: c.mensaje, generadaEl: new Date(), atendidaPorId: null, atendidaEl: null, resolucionNota: null },
      });
    } else {
      await tx.alerta.create({ data: { funcionarioId: c.funcionarioId, tipo: c.tipo, fechaHito: aDate(c.fechaHito), mensaje: c.mensaje } });
    }
    resultado.nuevas++;
    resultado.activas++;
  }

  for (const [clave, activa] of activas) {
    if (vigentes.has(clave)) continue;
    await tx.alerta.update({
      where: { id: activa.id },
      data: { estado: "ATENDIDA", atendidaEl: new Date(), atendidaPorId: null, resolucionNota: NOTA_RESUELTA_AUTOMATICA },
    });
    resultado.resueltas++;
  }

  void fechaCorte;
  return resultado;
}

async function sincronizarCon(ctx: ContextoAuditoria, filas: FilaFuncionario[], funcionarioIds: string[], fechaCorte: FechaCivil, entidadId: string, detalle: string) {
  return prisma.$transaction(
    async (tx) => {
      const r = await sincronizarFilas(tx, filas, funcionarioIds, fechaCorte);
      if (r.nuevas + r.actualizadas + r.resueltas > 0) {
        await registrarAuditoria(tx, ctx, "CREAR", "Alerta", { entidadId, despues: r, detalle: `${detalle}: ${r.nuevas} nuevas, ${r.actualizadas} actualizadas, ${r.resueltas} resueltas` });
      }
      return r;
    },
    { timeout: 60_000 },
  );
}

/** Sincroniza las alertas de toda la dotación activa de una institución (worker nocturno y botón "Sincronizar"). */
export async function sincronizarAlertas(ctx: ContextoAuditoria, institucionId: string, fechaCorte: FechaCivil = hoyEnChile()): Promise<ResultadoSincronizacion> {
  const filas = await listarFuncionarios(institucionId, {}, fechaCorte);
  const todos = await prisma.funcionario.findMany({ where: { institucionId }, select: { id: true } });
  return sincronizarCon(ctx, filas, todos.map((f) => f.id), fechaCorte, institucionId, "Sincronización de alertas");
}

/** Sincroniza las alertas de un solo funcionario, tras registrar un hecho en su ficha (doc 04 §6: "al editar"). */
export async function sincronizarAlertasDeFuncionario(ctx: ContextoAuditoria, funcionarioId: string, fechaCorte: FechaCivil = hoyEnChile()): Promise<ResultadoSincronizacion | null> {
  const funcionario = await cargarFuncionario(funcionarioId);
  if (!funcionario) return null;
  const reglas = await cargarReglas(funcionario.institucionId);
  const estado = calcularEstadoCarrera(aEntradaMotor(funcionario), fechaCorte, reglas);
  const alertas = ordenarAlertas(generarAlertas(estado, reglas));
  const fila: FilaFuncionario = { funcionario, estado, alertas, proximaAlerta: alertas[0] ?? null };
  return sincronizarCon(ctx, [fila], [funcionarioId], fechaCorte, funcionarioId, "Alertas del funcionario");
}

const ultimaSincronizacion = new Map<string, number>();

/** Sincroniza si la última pasada de esta instancia es más antigua que `minutos` (al abrir el módulo Alertas). */
export async function sincronizarSiCorresponde(ctx: ContextoAuditoria, institucionId: string, minutos = 10): Promise<ResultadoSincronizacion | null> {
  const ultima = ultimaSincronizacion.get(institucionId) ?? 0;
  if (Date.now() - ultima < minutos * 60_000) return null;
  ultimaSincronizacion.set(institucionId, Date.now());
  return sincronizarAlertas(ctx, institucionId);
}

export function marcarSincronizada(institucionId: string): void {
  ultimaSincronizacion.set(institucionId, Date.now());
}

export async function atenderAlerta(ctx: ContextoAuditoria, id: string, nota: string) {
  return conAuditoria(ctx, "EDITAR", "Alerta", async (tx) => {
    const antes = await tx.alerta.findUniqueOrThrow({ where: { id } });
    if (antes.estado !== "ACTIVA") throw new Error("La alerta ya no está activa.");
    const despues = await tx.alerta.update({ where: { id }, data: { estado: "ATENDIDA", atendidaPorId: ctx.usuarioId, atendidaEl: new Date(), resolucionNota: nota } });
    return { resultado: despues, entidadId: id, ...diffCampos(antes, despues), detalle: `Atendida: ${nota}` };
  });
}

export async function descartarAlerta(ctx: ContextoAuditoria, id: string, motivo: string) {
  return conAuditoria(ctx, "EDITAR", "Alerta", async (tx) => {
    const antes = await tx.alerta.findUniqueOrThrow({ where: { id } });
    if (antes.estado !== "ACTIVA") throw new Error("La alerta ya no está activa.");
    const despues = await tx.alerta.update({ where: { id }, data: { estado: "DESCARTADA", atendidaPorId: ctx.usuarioId, atendidaEl: new Date(), resolucionNota: motivo } });
    return { resultado: despues, entidadId: id, ...diffCampos(antes, despues), detalle: `Descartada: ${motivo}` };
  });
}
