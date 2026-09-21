"use server";

// Server actions de Respaldos (doc 05 §12, doc 13 F11): ejecutar ahora y marcar verificado por restauración. ADMIN.

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/auth/sesion";
import { marcarVerificado } from "@/lib/db/respaldos";
import { ejecutarRespaldoBd } from "@/lib/respaldos/ejecutar";
import { errorInterno, type RespuestaAccion } from "./tipos";

export interface RespaldoResumen {
  id: string;
  resultado: string;
  destino: string;
  tamano: number;
  duracionSeg: number;
  cifrado: boolean;
}

export async function ejecutarRespaldoAction(): Promise<RespuestaAccion<RespaldoResumen>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  try {
    const r = await ejecutarRespaldoBd({ usuarioId: sesion.user.id });
    revalidatePath("/respaldos");
    return {
      ok: true,
      data: { id: r.respaldo.id, resultado: r.respaldo.resultado, destino: r.respaldo.destino, tamano: Number(r.respaldo.tamano), duracionSeg: r.respaldo.duracionSeg, cifrado: r.cifrado },
    };
  } catch (error) {
    console.error("ejecutarRespaldoAction", error);
    return errorInterno();
  }
}

export async function marcarVerificadoAction(id: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const nota = fd.get("fecha");
  const fecha = typeof nota === "string" && nota.trim() ? new Date(nota) : new Date();
  if (Number.isNaN(fecha.getTime())) {
    return { ok: false, error: { codigo: "VALIDACION", mensaje: "Revisa los campos marcados.", campos: { fecha: ["Escribe una fecha válida."] } } };
  }
  try {
    await marcarVerificado({ usuarioId: sesion.user.id }, id, fecha);
    revalidatePath("/respaldos");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("marcarVerificadoAction", error);
    return errorInterno();
  }
}
