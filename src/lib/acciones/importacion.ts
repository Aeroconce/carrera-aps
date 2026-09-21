"use server";

// Server actions del asistente de importación (doc 08, doc 13 F13): validar la planilla (informe de errores por
// fila y columna o vista previa) y confirmar la carga. Solo ADMIN.

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/auth/sesion";
import { marcarSincronizada, sincronizarAlertas } from "@/lib/db/alertas";
import { importarCargaInicial, type ResultadoImportacion } from "@/lib/db/importacion";
import { hoyEnChile, sumarDias } from "@/lib/fechas/civil";
import { borrarPendiente, guardarPendiente, leerPendiente } from "@/lib/importacion/almacen";
import { leerPlanillaCargaInicial } from "@/lib/importacion/parsear";
import { validarCargaInicial, type ErrorFila, type FilaValidada } from "@/lib/importacion/validar";
import { leerFecha } from "@/lib/reportes/filtros";
import { errorInterno, type RespuestaAccion } from "./tipos";

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const FILAS_MAXIMAS = 2000;

export interface ResultadoValidacionAccion {
  nombreArchivo: string;
  total: number;
  errores: ErrorFila[];
  faltantes: string[];
  vistaPrevia: FilaValidada[];
  token: string | null;
  fechaSaldos: string;
}

export async function validarImportacionAction(fd: FormData): Promise<RespuestaAccion<ResultadoValidacionAccion>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: { codigo: "VALIDACION", mensaje: "Elige un archivo .xlsx.", campos: { archivo: ["Elige un archivo .xlsx."] } } };
  }
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: { codigo: "VALIDACION", mensaje: "El archivo debe ser .xlsx.", campos: { archivo: ["El archivo debe ser .xlsx (la plantilla)."] } } };
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return { ok: false, error: { codigo: "VALIDACION", mensaje: "El archivo supera 10 MB.", campos: { archivo: ["El archivo supera 10 MB."] } } };
  }
  const fechaSaldos = leerFecha(String(fd.get("fechaSaldos") ?? "")) ?? sumarDias(hoyEnChile(), -1);

  try {
    const lectura = await leerPlanillaCargaInicial(new Uint8Array(await archivo.arrayBuffer()));
    if (lectura.faltantes.length > 0) {
      return { ok: true, data: { nombreArchivo: archivo.name, total: lectura.filas.length, errores: [], faltantes: lectura.faltantes, vistaPrevia: [], token: null, fechaSaldos } };
    }
    if (lectura.filas.length === 0) {
      return { ok: true, data: { nombreArchivo: archivo.name, total: 0, errores: [{ fila: 2, columna: "—", mensaje: "La planilla no tiene filas de datos." }], faltantes: [], vistaPrevia: [], token: null, fechaSaldos } };
    }
    if (lectura.filas.length > FILAS_MAXIMAS) {
      return { ok: true, data: { nombreArchivo: archivo.name, total: lectura.filas.length, errores: [{ fila: FILAS_MAXIMAS + 2, columna: "—", mensaje: `Máximo ${FILAS_MAXIMAS} filas por carga.` }], faltantes: [], vistaPrevia: [], token: null, fechaSaldos } };
    }
    const validacion = await validarCargaInicial(institucionId, lectura.filas);
    if (validacion.errores.length > 0) {
      return { ok: true, data: { nombreArchivo: archivo.name, total: lectura.filas.length, errores: validacion.errores, faltantes: [], vistaPrevia: [], token: null, fechaSaldos } };
    }
    const token = await guardarPendiente({ usuarioId: sesion.user.id, institucionId, nombreArchivo: archivo.name, filas: validacion.filas });
    return { ok: true, data: { nombreArchivo: archivo.name, total: validacion.filas.length, errores: [], faltantes: [], vistaPrevia: validacion.filas.slice(0, 50), token, fechaSaldos } };
  } catch (error) {
    console.error("validarImportacionAction", error);
    return { ok: false, error: { codigo: "LECTURA", mensaje: "No se pudo leer el archivo. Usa la plantilla descargada desde esta pantalla." } };
  }
}

export async function confirmarImportacionAction(token: string, fechaSaldos: string): Promise<RespuestaAccion<ResultadoImportacion>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const pendiente = await leerPendiente(token);
  if (!pendiente || pendiente.usuarioId !== sesion.user.id || pendiente.institucionId !== sesion.user.institucionId) {
    return { ok: false, error: { codigo: "CADUCADA", mensaje: "La validación caducó o no corresponde a tu sesión. Vuelve a subir el archivo." } };
  }
  const fecha = leerFecha(fechaSaldos) ?? sumarDias(hoyEnChile(), -1);
  try {
    const ctx = { usuarioId: sesion.user.id };
    const resultado = await importarCargaInicial(ctx, pendiente.institucionId, pendiente.filas, { nombreArchivo: pendiente.nombreArchivo, fechaSaldos: fecha });
    await borrarPendiente(token);
    await sincronizarAlertas(ctx, pendiente.institucionId).catch((error) => console.error("alertas tras importar", error));
    marcarSincronizada(pendiente.institucionId);
    revalidatePath("/funcionarios");
    revalidatePath("/");
    return { ok: true, data: resultado };
  } catch (error) {
    console.error("confirmarImportacionAction", error);
    return errorInterno();
  }
}
