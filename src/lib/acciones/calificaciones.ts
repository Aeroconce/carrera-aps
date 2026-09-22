"use server";

// Server actions de Calificaciones (BT 4.6, doc 13 F15), versión simplificada: proceso, calificar, anotar. ADMIN.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth/sesion";
import { cargarReglas } from "@/lib/carrera/reglas";
import { sincronizarAlertasDeFuncionario } from "@/lib/db/alertas";
import { agregarNota, calificar, cambiarEstadoProceso, crearProceso, listaDe } from "@/lib/db/calificaciones";
import { prisma } from "@/lib/db/prisma";
import { desdeDate, parsearChileno } from "@/lib/fechas/civil";
import { errorInterno, type RespuestaAccion } from "./tipos";

function objeto(fd: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") salida[k] = v;
  return salida;
}
function validacion(campos: Record<string, string[]>): RespuestaAccion<never> {
  return { ok: false, error: { codigo: "VALIDACION", mensaje: "Revisa los campos marcados.", campos } };
}
function camposDe(error: z.ZodError): Record<string, string[]> {
  const campos: Record<string, string[]> = {};
  for (const i of error.issues) (campos[String(i.path[0] ?? "general")] ??= []).push(i.message);
  return campos;
}
const fechaChilena = z.string().trim().transform((v, ctx) => {
  try {
    return parsearChileno(v);
  } catch {
    ctx.addIssue({ code: "custom", message: "Escribe la fecha como dd/mm/aaaa." });
    return z.NEVER;
  }
});

const esquemaProceso = z
  .object({
    nombre: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(120),
    periodoDesde: fechaChilena,
    periodoHasta: fechaChilena,
  })
  .refine((d) => d.periodoHasta >= d.periodoDesde, { error: "El fin del período no puede ser anterior al inicio.", path: ["periodoHasta"] });

export async function crearProcesoAction(fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const datos = esquemaProceso.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  try {
    const creado = await crearProceso({ usuarioId: sesion.user.id }, sesion.user.institucionId!, datos.data);
    revalidatePath("/calificaciones");
    return { ok: true, data: { id: creado.id } };
  } catch (error) {
    console.error("crearProcesoAction", error);
    return errorInterno();
  }
}

export async function cambiarEstadoProcesoAction(id: string, estado: "ABIERTO" | "CERRADO"): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const proceso = await prisma.procesoCalificacion.findFirst({ where: { id, institucionId: sesion.user.institucionId! } });
  if (!proceso) return { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "El proceso no existe." } };
  try {
    await cambiarEstadoProceso({ usuarioId: sesion.user.id }, id, estado);
    revalidatePath("/calificaciones");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("cambiarEstadoProcesoAction", error);
    return errorInterno();
  }
}

const esquemaCalificar = z.object({
  puntajeFinal: z.string().trim().transform((v, ctx) => {
    const n = Number(v.replace(",", "."));
    if (!v || Number.isNaN(n)) {
      ctx.addIssue({ code: "custom", message: "Escribe el puntaje final." });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  }),
  observaciones: z.string().trim().max(500).transform((v) => v || null),
});

export async function calificarAction(procesoId: string, funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string; lista: string | null }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const [proceso, funcionario] = await Promise.all([
    prisma.procesoCalificacion.findFirst({ where: { id: procesoId, institucionId } }),
    prisma.funcionario.findFirst({ where: { id: funcionarioId, institucionId } }),
  ]);
  if (!proceso || !funcionario) return { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "Proceso o funcionario no encontrado." } };
  if (proceso.estado !== "ABIERTO") return { ok: false, error: { codigo: "CERRADO", mensaje: "El proceso está cerrado; reábrelo para calificar." } };
  const datos = esquemaCalificar.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  const reglas = await cargarReglas(institucionId);
  const fechaCierre = desdeDate(proceso.periodoHasta);
  const regla = reglas.parametrosOpcionales("CALIFICACION", fechaCierre, funcionario.categoria);
  if (regla && (datos.data.puntajeFinal < regla.escalaMinima || datos.data.puntajeFinal > regla.escalaMaxima)) {
    return validacion({ puntajeFinal: [`El puntaje va de ${regla.escalaMinima} a ${regla.escalaMaxima}.`] });
  }
  try {
    const lista = listaDe(reglas, fechaCierre, funcionario.categoria, datos.data.puntajeFinal);
    const creada = await calificar({ usuarioId: sesion.user.id }, { procesoId, funcionarioId, puntajeFinal: datos.data.puntajeFinal, lista, observaciones: datos.data.observaciones });
    await sincronizarAlertasDeFuncionario({ usuarioId: sesion.user.id }, funcionarioId).catch((error) => console.error("alertas tras calificar", error));
    revalidatePath("/calificaciones");
    revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: creada.id, lista } };
  } catch (error) {
    console.error("calificarAction", error);
    return errorInterno();
  }
}

const esquemaNota = z.object({
  tipo: z.enum(["MERITO", "DEMERITO"], { error: "Elige el tipo." }),
  descripcion: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(500),
  fecha: fechaChilena,
});

export async function agregarNotaAction(calificacionId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const calificacion = await prisma.calificacionFuncionario.findFirst({ where: { id: calificacionId, proceso: { institucionId: sesion.user.institucionId! } } });
  if (!calificacion) return { ok: false, error: { codigo: "NO_ENCONTRADA", mensaje: "La calificación no existe." } };
  const datos = esquemaNota.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  try {
    const nota = await agregarNota({ usuarioId: sesion.user.id }, calificacionId, datos.data);
    revalidatePath("/calificaciones");
    revalidatePath(`/funcionarios/${calificacion.funcionarioId}`);
    return { ok: true, data: { id: nota.id } };
  } catch (error) {
    console.error("agregarNotaAction", error);
    return errorInterno();
  }
}
