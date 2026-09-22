"use server";

// Server actions de Calificaciones (BT 4.6, doc 13 F15): procesos, comisión evaluadora, factores y subfactores,
// calificar con notas por factor (puntaje final calculado) y acta, adjuntar acta, anotar. Solo ADMIN.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth/sesion";
import { itemsCalificables } from "@/lib/calificaciones/puntaje";
import { cargarReglas } from "@/lib/carrera/reglas";
import { sincronizarAlertasDeFuncionario } from "@/lib/db/alertas";
import {
  aFactorBase,
  adjuntarActa,
  agregarIntegrante,
  agregarNota,
  calificar,
  cambiarEstadoProceso,
  copiarFactores,
  crearFactor,
  crearProceso,
  eliminarFactor,
  listaDe,
  puntajeDesdeFactores,
  quitarIntegrante,
} from "@/lib/db/calificaciones";
import { crearDocumento } from "@/lib/db/documentos";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { guardarArchivo, TAMANO_MAXIMO_DOCUMENTO } from "@/lib/documentos/almacenamiento";
import { desdeDate, parsearChileno } from "@/lib/fechas/civil";
import { nombreCompleto } from "@/lib/formato";
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
const NO_ENCONTRADO: RespuestaAccion<never> = { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "El proceso no existe." } };
const CERRADO: RespuestaAccion<never> = { ok: false, error: { codigo: "CERRADO", mensaje: "El proceso está cerrado; reábrelo para modificarlo." } };

type ProcesoConFactores = Prisma.ProcesoCalificacionGetPayload<{ include: { factores: true } }>;

/** Proceso de la institución de la sesión, abierto (toda modificación exige proceso abierto). */
async function procesoAbierto(institucionId: string, id: string): Promise<{ ok: true; proceso: ProcesoConFactores } | { ok: false; error: RespuestaAccion<never> }> {
  const proceso = await prisma.procesoCalificacion.findFirst({ where: { id, institucionId }, include: { factores: true } });
  if (!proceso) return { ok: false, error: NO_ENCONTRADO };
  if (proceso.estado !== "ABIERTO") return { ok: false, error: CERRADO };
  return { ok: true, proceso };
}

const EXTENSION: Record<string, string> = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };

/** Guarda el acta subida como Documento ACTA del funcionario. Devuelve el id o un error de validación. */
async function guardarActa(usuarioId: string, institucionId: string, archivo: FormDataEntryValue | null, funcionario: { id: string; nombres: string; apellidos: string }, proceso: { nombre: string }): Promise<{ documentoId: string } | { error: RespuestaAccion<never> }> {
  if (!(archivo instanceof File) || archivo.size === 0) return { error: validacion({ acta: ["Elige un archivo PDF, JPG o PNG."] }) };
  if (archivo.size > TAMANO_MAXIMO_DOCUMENTO) return { error: validacion({ acta: ["El archivo supera 10 MB."] }) };
  try {
    const guardado = await guardarArchivo(institucionId, new Uint8Array(await archivo.arrayBuffer()));
    const documento = await crearDocumento({ usuarioId }, {
      institucionId,
      funcionarioId: funcionario.id,
      tipo: "ACTA",
      nombre: `Acta ${proceso.nombre} - ${nombreCompleto(funcionario)}${EXTENSION[guardado.mime] ?? ""}`,
      ruta: guardado.ruta,
      mime: guardado.mime,
      tamano: guardado.tamano,
      hash: guardado.hash,
    });
    return { documentoId: documento.id };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Tipo de archivo")) return { error: validacion({ acta: [error.message] }) };
    throw error;
  }
}

// --- Procesos ------------------------------------------------------------------------------------------------

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
  if (!proceso) return NO_ENCONTRADO;
  try {
    await cambiarEstadoProceso({ usuarioId: sesion.user.id }, id, estado);
    revalidatePath("/calificaciones");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("cambiarEstadoProcesoAction", error);
    return errorInterno();
  }
}

// --- Comisión evaluadora -------------------------------------------------------------------------------------

const esquemaIntegrante = z.object({
  nombre: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(120),
  rol: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(120),
});

export async function agregarIntegranteAction(procesoId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const r = await procesoAbierto(sesion.user.institucionId!, procesoId);
  if (!r.ok) return r.error;
  const datos = esquemaIntegrante.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  try {
    const creado = await agregarIntegrante({ usuarioId: sesion.user.id }, procesoId, datos.data);
    revalidatePath("/calificaciones");
    return { ok: true, data: { id: creado.id } };
  } catch (error) {
    console.error("agregarIntegranteAction", error);
    return errorInterno();
  }
}

export async function quitarIntegranteAction(id: string): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const integrante = await prisma.comisionCalificacion.findFirst({ where: { id, proceso: { institucionId: sesion.user.institucionId! } }, include: { proceso: true } });
  if (!integrante) return NO_ENCONTRADO;
  if (integrante.proceso.estado !== "ABIERTO") return CERRADO;
  try {
    await quitarIntegrante({ usuarioId: sesion.user.id }, id);
    revalidatePath("/calificaciones");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("quitarIntegranteAction", error);
    return errorInterno();
  }
}

// --- Factores y subfactores ----------------------------------------------------------------------------------

const esquemaFactor = z.object({
  nombre: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(120),
  ponderacion: z.string().trim().transform((v, ctx) => {
    const n = Number(v.replace(",", "."));
    if (!v || Number.isNaN(n) || n <= 0 || n > 100) {
      ctx.addIssue({ code: "custom", message: "Escribe una ponderación entre 0 y 100." });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  }),
  padreId: z.string().trim().optional().transform((v) => v || null),
});

export async function crearFactorAction(procesoId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const r = await procesoAbierto(sesion.user.institucionId!, procesoId);
  if (!r.ok) return r.error;
  const datos = esquemaFactor.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  if (datos.data.padreId && !r.proceso.factores.some((f) => f.id === datos.data.padreId && f.padreId === null)) return validacion({ padreId: ["Elige un factor principal de este proceso."] });
  try {
    const creado = await crearFactor({ usuarioId: sesion.user.id }, procesoId, datos.data);
    revalidatePath("/calificaciones");
    return { ok: true, data: { id: creado.id } };
  } catch (error) {
    console.error("crearFactorAction", error);
    return errorInterno();
  }
}

export async function eliminarFactorAction(id: string): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const factor = await prisma.factorCalificacion.findFirst({ where: { id, proceso: { institucionId: sesion.user.institucionId! } }, include: { proceso: true } });
  if (!factor) return NO_ENCONTRADO;
  if (factor.proceso.estado !== "ABIERTO") return CERRADO;
  try {
    await eliminarFactor({ usuarioId: sesion.user.id }, id);
    revalidatePath("/calificaciones");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("eliminarFactorAction", error);
    return errorInterno();
  }
}

export async function copiarFactoresAction(procesoId: string, origenId: string): Promise<RespuestaAccion<{ copiados: number }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const r = await procesoAbierto(institucionId, procesoId);
  if (!r.ok) return r.error;
  if (r.proceso.factores.length > 0) return { ok: false, error: { codigo: "CON_FACTORES", mensaje: "El proceso ya tiene factores; quítalos antes de copiar." } };
  const origen = await prisma.procesoCalificacion.findFirst({ where: { id: origenId, institucionId }, select: { id: true } });
  if (!origen) return NO_ENCONTRADO;
  try {
    const copiados = await copiarFactores({ usuarioId: sesion.user.id }, procesoId, origenId);
    revalidatePath("/calificaciones");
    return { ok: true, data: { copiados } };
  } catch (error) {
    console.error("copiarFactoresAction", error);
    return errorInterno();
  }
}

// --- Calificar -----------------------------------------------------------------------------------------------

function numeroDe(crudo: string | undefined): number | null {
  const texto = (crudo ?? "").trim().replace(",", ".");
  if (!texto) return null;
  const n = Number(texto);
  return Number.isNaN(n) ? null : Math.round(n * 100) / 100;
}

export async function calificarAction(procesoId: string, funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string; lista: string | null; puntajeFinal: number }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const [r, funcionario] = await Promise.all([procesoAbierto(institucionId, procesoId), prisma.funcionario.findFirst({ where: { id: funcionarioId, institucionId } })]);
  if (!r.ok) return r.error;
  if (!funcionario) return { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "El funcionario no existe." } };
  const { proceso } = r;
  const campos = objeto(fd);
  const observaciones = (campos.observaciones ?? "").trim().slice(0, 500) || null;
  const reglas = await cargarReglas(institucionId);
  const fechaCierre = desdeDate(proceso.periodoHasta);
  const regla = reglas.parametrosOpcionales("CALIFICACION", fechaCierre, funcionario.categoria);
  const enEscala = (n: number) => !regla || (n >= regla.escalaMinima && n <= regla.escalaMaxima);
  const fueraDeEscala = regla ? `La nota va de ${regla.escalaMinima} a ${regla.escalaMaxima}.` : "";

  // Notas por factor (si el proceso tiene factores) o puntaje final directo
  const items = itemsCalificables(proceso.factores.map(aFactorBase));
  const puntajes: Record<string, number> = {};
  let puntajeFinal: number;
  if (items.length > 0) {
    const errores: Record<string, string[]> = {};
    for (const { item } of items) {
      const n = numeroDe(campos[`nota:${item.id}`]);
      if (n === null) errores[`nota:${item.id}`] = ["Escribe la nota."];
      else if (!enEscala(n)) errores[`nota:${item.id}`] = [fueraDeEscala];
      else puntajes[item.id] = n;
    }
    if (Object.keys(errores).length > 0) return validacion(errores);
    const calculado = puntajeDesdeFactores(proceso.factores, puntajes);
    if (calculado === null) return validacion({ general: ["No se pudo calcular el puntaje final con los factores del proceso."] });
    puntajeFinal = calculado;
  } else {
    const n = numeroDe(campos.puntajeFinal);
    if (n === null) return validacion({ puntajeFinal: ["Escribe el puntaje final."] });
    if (!enEscala(n)) return validacion({ puntajeFinal: [fueraDeEscala] });
    puntajeFinal = n;
  }

  try {
    let actaDocumentoId: string | undefined;
    const archivo = fd.get("acta");
    if (archivo instanceof File && archivo.size > 0) {
      const acta = await guardarActa(sesion.user.id, institucionId, archivo, funcionario, proceso);
      if ("error" in acta) return acta.error;
      actaDocumentoId = acta.documentoId;
    }
    const lista = listaDe(reglas, fechaCierre, funcionario.categoria, puntajeFinal);
    const creada = await calificar({ usuarioId: sesion.user.id }, { procesoId, funcionarioId, puntajeFinal, lista, observaciones, puntajes, actaDocumentoId });
    await sincronizarAlertasDeFuncionario({ usuarioId: sesion.user.id }, funcionarioId).catch((error) => console.error("alertas tras calificar", error));
    revalidatePath("/calificaciones");
    revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: creada.id, lista, puntajeFinal } };
  } catch (error) {
    console.error("calificarAction", error);
    return errorInterno();
  }
}

export async function adjuntarActaAction(calificacionId: string, fd: FormData): Promise<RespuestaAccion<{ documentoId: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const calificacion = await prisma.calificacionFuncionario.findFirst({ where: { id: calificacionId, proceso: { institucionId } }, include: { proceso: true, funcionario: true } });
  if (!calificacion) return { ok: false, error: { codigo: "NO_ENCONTRADA", mensaje: "La calificación no existe." } };
  try {
    const acta = await guardarActa(sesion.user.id, institucionId, fd.get("acta"), calificacion.funcionario, calificacion.proceso);
    if ("error" in acta) return acta.error;
    await adjuntarActa({ usuarioId: sesion.user.id }, calificacionId, acta.documentoId);
    revalidatePath("/calificaciones");
    revalidatePath(`/funcionarios/${calificacion.funcionarioId}`);
    return { ok: true, data: { documentoId: acta.documentoId } };
  } catch (error) {
    console.error("adjuntarActaAction", error);
    return errorInterno();
  }
}

// --- Anotaciones ---------------------------------------------------------------------------------------------

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
