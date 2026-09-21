"use server";

// Server actions del módulo Alertas (doc 05 §9, doc 13 F7): atender con nota, descartar con motivo y
// sincronizar a demanda. Solo ADMIN; la alerta debe pertenecer a la institución del usuario.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth/sesion";
import { atenderAlerta, descartarAlerta, marcarSincronizada, sincronizarAlertas, type ResultadoSincronizacion } from "@/lib/db/alertas";
import { prisma } from "@/lib/db/prisma";
import { errorInterno, type RespuestaAccion } from "./tipos";

const esquemaNota = z.object({ nota: z.string().trim().min(1, { error: "Escribe una nota." }).max(500, { error: "Máximo 500 caracteres." }) });

function objeto(fd: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") salida[k] = v;
  return salida;
}

async function alertaDeMiInstitucion(id: string) {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const alerta = await prisma.alerta.findFirst({ where: { id, funcionario: { institucionId: sesion.user.institucionId! } } });
  return { sesion, alerta };
}

async function cerrar(id: string, fd: FormData, modo: "atender" | "descartar"): Promise<RespuestaAccion<{ id: string }>> {
  const { sesion, alerta } = await alertaDeMiInstitucion(id);
  if (!alerta) return { ok: false, error: { codigo: "NO_ENCONTRADA", mensaje: "La alerta no existe o no pertenece a tu institución." } };
  if (alerta.estado !== "ACTIVA") return { ok: false, error: { codigo: "NO_ACTIVA", mensaje: "La alerta ya no está activa." } };
  const datos = esquemaNota.safeParse(objeto(fd));
  if (!datos.success) {
    return { ok: false, error: { codigo: "VALIDACION", mensaje: "Revisa los campos marcados.", campos: { nota: datos.error.issues.map((i) => i.message) } } };
  }
  try {
    const ctx = { usuarioId: sesion.user.id };
    if (modo === "atender") await atenderAlerta(ctx, id, datos.data.nota);
    else await descartarAlerta(ctx, id, datos.data.nota);
    revalidatePath("/alertas");
    revalidatePath(`/funcionarios/${alerta.funcionarioId}`);
    return { ok: true, data: { id } };
  } catch (error) {
    console.error(`${modo} alerta`, error);
    return errorInterno();
  }
}

export async function atenderAlertaAction(id: string, fd: FormData) {
  return cerrar(id, fd, "atender");
}

export async function descartarAlertaAction(id: string, fd: FormData) {
  return cerrar(id, fd, "descartar");
}

export async function sincronizarAlertasAction(): Promise<RespuestaAccion<ResultadoSincronizacion>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId;
  if (!institucionId) return { ok: false, error: { codigo: "SIN_INSTITUCION", mensaje: "Tu cuenta no está asociada a una institución." } };
  try {
    const r = await sincronizarAlertas({ usuarioId: sesion.user.id }, institucionId);
    marcarSincronizada(institucionId);
    revalidatePath("/alertas");
    revalidatePath("/");
    return { ok: true, data: r };
  } catch (error) {
    console.error("sincronizarAlertasAction", error);
    return errorInterno();
  }
}
