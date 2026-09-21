"use server";

// Server actions de Parámetros (doc 05 §10, doc 13 F12, BT 5): nueva versión de una regla con vigencia (la
// anterior se cierra el día anterior, auditado como CAMBIO_REGLA), establecimientos e institución. Solo ADMIN.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth/sesion";
import { actualizarEstablecimiento, actualizarInstitucion, crearEstablecimiento } from "@/lib/db/carrera";
import { prisma } from "@/lib/db/prisma";
import { crearRegla } from "@/lib/db/reglas";
import { desdeDate, parsearChileno } from "@/lib/fechas/civil";
import { esquemasParametros, TIPOS_REGLA, type Categoria, type TipoRegla } from "@/lib/motor/reglas";
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

const esquemaRegla = z.object({
  categoria: z.enum(["", "A", "B", "C", "D", "E", "F"]).transform((v) => (v === "" ? null : (v as Categoria))),
  vigenteDesde: fechaChilena,
  fuente: z.string().trim().min(1, { error: "Indica la fuente (artículo del reglamento o decreto)." }).max(200),
  parametros: z.string().trim().min(1, { error: "Escribe los parámetros en formato JSON." }),
});

export async function crearReglaAction(tipo: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  if (!(TIPOS_REGLA as readonly string[]).includes(tipo)) return { ok: false, error: { codigo: "TIPO", mensaje: "Tipo de regla desconocido." } };
  const tipoRegla = tipo as TipoRegla;
  const datos = esquemaRegla.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));

  let parametros: unknown;
  try {
    parametros = JSON.parse(datos.data.parametros);
  } catch {
    return validacion({ parametros: ["El texto no es JSON válido."] });
  }
  const esquema = esquemasParametros[tipoRegla].safeParse(parametros);
  if (!esquema.success) {
    return validacion({ parametros: esquema.error.issues.map((i) => `${i.path.join(".") || "raíz"}: ${i.message}`) });
  }
  const vigente = await prisma.reglaCarrera.findFirst({
    where: { institucionId, tipo: tipoRegla, categoria: datos.data.categoria, vigenteHasta: null },
    orderBy: { vigenteDesde: "desc" },
  });
  if (vigente && desdeDate(vigente.vigenteDesde) >= datos.data.vigenteDesde) {
    return validacion({ vigenteDesde: ["Debe ser posterior al inicio de la versión vigente."] });
  }
  try {
    const creada = await crearRegla({ usuarioId: sesion.user.id }, institucionId, {
      tipo: tipoRegla,
      categoria: datos.data.categoria,
      vigenteDesde: datos.data.vigenteDesde,
      parametros: esquema.data,
      fuente: datos.data.fuente,
    });
    revalidatePath("/parametros");
    revalidatePath("/");
    return { ok: true, data: { id: creada.id } };
  } catch (error) {
    console.error("crearReglaAction", error);
    return errorInterno();
  }
}

const esquemaEstablecimiento = z.object({
  nombre: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(120),
  tipo: z.enum(["CESFAM", "CECOSF", "POSTA", "SAR", "SAPU", "DIRECCION", "OTRO"], { error: "Elige un tipo." }),
  activo: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export async function crearEstablecimientoAction(fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const datos = esquemaEstablecimiento.safeParse({ activo: "on", ...objeto(fd) });
  if (!datos.success) return validacion(camposDe(datos.error));
  try {
    const creado = await crearEstablecimiento({ usuarioId: sesion.user.id }, sesion.user.institucionId!, { nombre: datos.data.nombre, tipo: datos.data.tipo });
    revalidatePath("/parametros");
    return { ok: true, data: { id: creado.id } };
  } catch (error) {
    console.error("crearEstablecimientoAction", error);
    return errorInterno();
  }
}

export async function actualizarEstablecimientoAction(id: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const existente = await prisma.establecimiento.findFirst({ where: { id, institucionId: sesion.user.institucionId! } });
  if (!existente) return { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "El establecimiento no existe." } };
  const datos = esquemaEstablecimiento.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  try {
    await actualizarEstablecimiento({ usuarioId: sesion.user.id }, id, datos.data);
    revalidatePath("/parametros");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("actualizarEstablecimientoAction", error);
    return errorInterno();
  }
}

const esquemaInstitucion = z.object({
  nombre: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(200),
  comuna: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(100),
});

export async function actualizarInstitucionAction(fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const datos = esquemaInstitucion.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  try {
    const id = sesion.user.institucionId!;
    await actualizarInstitucion({ usuarioId: sesion.user.id }, id, datos.data);
    revalidatePath("/parametros");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("actualizarInstitucionAction", error);
    return errorInterno();
  }
}
