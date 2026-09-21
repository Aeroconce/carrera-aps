"use server";

// Server actions del módulo Carrera (doc 05 §3, doc 13 F4.6): reconocimiento masivo de bienios con un mismo
// decreto y recálculo (sincronización de alertas) a demanda. Solo ADMIN.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth/sesion";
import { aEntradaMotor, cargarFuncionario } from "@/lib/carrera/funcionario";
import { cargarReglas } from "@/lib/carrera/reglas";
import { marcarSincronizada, sincronizarAlertas, sincronizarAlertasDeFuncionario, type ResultadoSincronizacion } from "@/lib/db/alertas";
import { reconocerBienio } from "@/lib/db/carrera";
import { hoyEnChile, parsearChileno } from "@/lib/fechas/civil";
import { nombreCompleto } from "@/lib/formato";
import { calcularEstadoCarrera } from "@/lib/motor/estado";
import { errorInterno, type RespuestaAccion } from "./tipos";

const esquema = z.object({
  seleccion: z
    .string()
    .transform((v, ctx) => {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Selección inválida." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.object({ funcionarioId: z.string().min(1), numero: z.number().int().positive() })).min(1, { error: "Selecciona al menos un bienio." }).max(200)),
  decretoNumero: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(50),
  decretoFecha: z.string().trim().transform((v, ctx) => {
    try {
      return parsearChileno(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Escribe la fecha como dd/mm/aaaa." });
      return z.NEVER;
    }
  }),
});

export interface ResultadoMasivo {
  reconocidos: number;
  omitidos: Array<{ nombre: string; numero: number; motivo: string }>;
}

export async function reconocerBieniosMasivoAction(fd: FormData): Promise<RespuestaAccion<ResultadoMasivo>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const datos = esquema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!datos.success) {
    const campos: Record<string, string[]> = {};
    for (const i of datos.error.issues) {
      const clave = String(i.path[0] ?? "seleccion");
      (campos[clave] ??= []).push(i.message);
    }
    return { ok: false, error: { codigo: "VALIDACION", mensaje: "Revisa los campos marcados.", campos } };
  }
  const { seleccion, decretoNumero, decretoFecha } = datos.data;
  const reglas = await cargarReglas(institucionId);
  const hoy = hoyEnChile();
  const resultado: ResultadoMasivo = { reconocidos: 0, omitidos: [] };
  const ctx = { usuarioId: sesion.user.id };

  try {
    for (const item of seleccion) {
      const funcionario = await cargarFuncionario(item.funcionarioId);
      if (!funcionario || funcionario.institucionId !== institucionId) {
        resultado.omitidos.push({ nombre: item.funcionarioId, numero: item.numero, motivo: "Funcionario no encontrado" });
        continue;
      }
      const nombre = nombreCompleto(funcionario);
      const estado = calcularEstadoCarrera(aEntradaMotor(funcionario), hoy, reglas);
      const bienio = estado.bienios.bienios.find((b) => b.numero === item.numero);
      if (!bienio || bienio.incluidoEnApertura) {
        resultado.omitidos.push({ nombre, numero: item.numero, motivo: "El bienio no está cumplido según el cálculo vigente" });
        continue;
      }
      if (bienio.fechaReconocido) {
        resultado.omitidos.push({ nombre, numero: item.numero, motivo: "Ya estaba reconocido" });
        continue;
      }
      if (decretoFecha < bienio.fechaCumplido) {
        resultado.omitidos.push({ nombre, numero: item.numero, motivo: "La fecha del decreto es anterior a la fecha en que se cumplió" });
        continue;
      }
      await reconocerBienio(ctx, funcionario.id, {
        numero: bienio.numero,
        fechaCumplido: bienio.fechaCumplido,
        puntaje: bienio.puntaje.toString(),
        reglaId: bienio.reglaId ?? reglas.vigente("PUNTOS_BIENIO", bienio.fechaCumplido, funcionario.categoria).id,
        fechaReconocido: decretoFecha,
        decretoNumero,
        decretoFecha,
      });
      await sincronizarAlertasDeFuncionario(ctx, funcionario.id).catch((error) => console.error("alertas tras reconocer", error));
      resultado.reconocidos++;
    }
    revalidatePath("/carrera");
    revalidatePath("/funcionarios");
    return { ok: true, data: resultado };
  } catch (error) {
    console.error("reconocerBieniosMasivoAction", error);
    return errorInterno();
  }
}

/** "Recalcular" (doc 05 §3): el motor es puro y se recalcula en cada lectura; lo que se refresca son las alertas. */
export async function recalcularAction(): Promise<RespuestaAccion<ResultadoSincronizacion>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  try {
    const r = await sincronizarAlertas({ usuarioId: sesion.user.id }, institucionId);
    marcarSincronizada(institucionId);
    revalidatePath("/carrera");
    revalidatePath("/alertas");
    revalidatePath("/");
    return { ok: true, data: r };
  } catch (error) {
    console.error("recalcularAction", error);
    return errorInterno();
  }
}
