"use server";

// Server actions de Usuarios (doc 05 §16): crear por rol, editar (nombre, rol, funcionario), restablecer
// contraseña y desactivar o reactivar. Solo ADMIN, sobre cuentas de su institución. Las contraseñas temporales
// se generan aquí y se muestran una sola vez a quien las pidió; nunca se guardan en claro ni en la bitácora.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth/sesion";
import { ROLES, type Rol } from "@/lib/auth/politica";
import { prisma } from "@/lib/db/prisma";
import { actualizarUsuario, cambiarEstadoUsuario, crearUsuario, restablecerContrasena } from "@/lib/db/usuarios";
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

/** 16 caracteres aleatorios (letras y dígitos), cumple la política de largo mínimo. */
function contrasenaTemporal(): string {
  return randomBytes(24).toString("base64url").replace(/[-_]/g, "").slice(0, 16);
}

const esquemaUsuario = z.object({
  name: z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(120),
  email: z.email({ error: "Escribe un correo válido." }).transform((v) => v.toLowerCase()),
  role: z.enum(ROLES, { error: "Elige un rol." }),
  // El selector solo se muestra para el rol FUNCIONARIO: el campo puede no venir
  funcionarioId: z.string().trim().optional().transform((v) => v || null),
});

async function funcionarioValido(institucionId: string, funcionarioId: string | null, usuarioActualId?: string): Promise<string | null> {
  if (!funcionarioId) return null;
  const f = await prisma.funcionario.findFirst({ where: { id: funcionarioId, institucionId }, select: { id: true } });
  if (!f) return "El funcionario no existe en tu institución.";
  const otro = await prisma.user.findFirst({ where: { funcionarioId, NOT: usuarioActualId ? { id: usuarioActualId } : undefined }, select: { email: true } });
  return otro ? `Ese funcionario ya tiene cuenta: ${otro.email}.` : null;
}

export interface UsuarioCreado {
  id: string;
  email: string;
  /** Contraseña temporal, mostrada una sola vez */
  password: string;
}

export async function crearUsuarioAction(fd: FormData): Promise<RespuestaAccion<UsuarioCreado>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const datos = esquemaUsuario.safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  const d = datos.data;
  if (await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } })) return validacion({ email: ["Ya existe una cuenta con ese correo."] });
  const errorFuncionario = await funcionarioValido(institucionId, d.funcionarioId);
  if (errorFuncionario) return validacion({ funcionarioId: [errorFuncionario] });
  if (d.role === "FUNCIONARIO" && !d.funcionarioId) return validacion({ funcionarioId: ["Una cuenta de funcionario debe estar vinculada a su ficha."] });
  try {
    const password = contrasenaTemporal();
    const creado = await crearUsuario({ usuarioId: sesion.user.id }, { institucionId, email: d.email, name: d.name, role: d.role as Rol, funcionarioId: d.role === "FUNCIONARIO" ? d.funcionarioId : null, password });
    revalidatePath("/usuarios");
    return { ok: true, data: { id: creado.id, email: creado.email, password } };
  } catch (error) {
    console.error("crearUsuarioAction", error);
    return errorInterno();
  }
}

async function cuentaDeMiInstitucion(id: string) {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const usuario = await prisma.user.findFirst({ where: { id, institucionId: sesion.user.institucionId! } });
  return { sesion, usuario };
}

export async function actualizarUsuarioAction(id: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const { sesion, usuario } = await cuentaDeMiInstitucion(id);
  if (!usuario) return { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "La cuenta no existe en tu institución." } };
  const datos = esquemaUsuario.omit({ email: true }).safeParse(objeto(fd));
  if (!datos.success) return validacion(camposDe(datos.error));
  const d = datos.data;
  if (usuario.id === sesion.user.id && d.role !== "ADMIN") return validacion({ role: ["No puedes quitarte el rol de administración a ti mismo."] });
  const errorFuncionario = await funcionarioValido(sesion.user.institucionId!, d.funcionarioId, id);
  if (errorFuncionario) return validacion({ funcionarioId: [errorFuncionario] });
  if (d.role === "FUNCIONARIO" && !d.funcionarioId) return validacion({ funcionarioId: ["Una cuenta de funcionario debe estar vinculada a su ficha."] });
  try {
    await actualizarUsuario({ usuarioId: sesion.user.id }, id, { name: d.name, role: d.role as Rol, funcionarioId: d.role === "FUNCIONARIO" ? d.funcionarioId : null });
    revalidatePath("/usuarios");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("actualizarUsuarioAction", error);
    return errorInterno();
  }
}

export async function restablecerContrasenaAction(id: string): Promise<RespuestaAccion<{ password: string }>> {
  const { sesion, usuario } = await cuentaDeMiInstitucion(id);
  if (!usuario) return { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "La cuenta no existe en tu institución." } };
  try {
    const password = contrasenaTemporal();
    await restablecerContrasena({ usuarioId: sesion.user.id }, id, password);
    revalidatePath("/usuarios");
    return { ok: true, data: { password } };
  } catch (error) {
    console.error("restablecerContrasenaAction", error);
    return errorInterno();
  }
}

export async function cambiarEstadoUsuarioAction(id: string, activo: boolean): Promise<RespuestaAccion<{ id: string }>> {
  const { sesion, usuario } = await cuentaDeMiInstitucion(id);
  if (!usuario) return { ok: false, error: { codigo: "NO_ENCONTRADO", mensaje: "La cuenta no existe en tu institución." } };
  if (usuario.id === sesion.user.id && !activo) return { ok: false, error: { codigo: "PROPIA", mensaje: "No puedes desactivar tu propia cuenta." } };
  try {
    await cambiarEstadoUsuario({ usuarioId: sesion.user.id }, id, activo);
    revalidatePath("/usuarios");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("cambiarEstadoUsuarioAction", error);
    return errorInterno();
  }
}
