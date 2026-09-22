// Usuarios y accesos (doc 05 §16, doc 07): crear cuentas por rol, vincular al funcionario (portal), restablecer
// contraseña (obliga a cambiarla al entrar), desactivar y reactivar. La creación la hace Better Auth (hash
// Argon2id y tabla account); el resto son escrituras auditadas en `user`.

import { auth } from "@/lib/auth/auth";
import type { Rol } from "@/lib/auth/politica";
import type { User } from "@/generated/prisma/client";
import { conAuditoria, type ContextoAuditoria } from "./auditado";
import { prisma } from "./prisma";

export interface DatosUsuario {
  institucionId: string;
  email: string;
  name: string;
  role: Rol;
  funcionarioId: string | null;
  password: string;
}

export async function crearUsuario(ctx: ContextoAuditoria, datos: DatosUsuario): Promise<User> {
  const creado = await auth.api.createUser({
    body: { email: datos.email, password: datos.password, name: datos.name, role: datos.role, data: { institucionId: datos.institucionId, funcionarioId: datos.funcionarioId, debeCambiarPassword: true } },
  });
  return conAuditoria(ctx, "CREAR", "User", async (tx) => {
    const usuario = await tx.user.findUniqueOrThrow({ where: { id: creado.user.id } });
    return { resultado: usuario, entidadId: usuario.id, despues: { email: usuario.email, name: usuario.name, role: usuario.role, funcionarioId: usuario.funcionarioId }, detalle: "Cuenta creada; debe cambiar la contraseña al primer ingreso" };
  });
}

/** Nueva contraseña temporal: se cierran sus sesiones y deberá cambiarla al entrar. */
export async function restablecerContrasena(ctx: ContextoAuditoria, userId: string, password: string): Promise<void> {
  const contexto = await auth.$context;
  const hash = await contexto.password.hash(password);
  await contexto.internalAdapter.updatePassword(userId, hash);
  await conAuditoria(ctx, "EDITAR", "User", async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { debeCambiarPassword: true } });
    await tx.session.deleteMany({ where: { userId } });
    return { resultado: undefined, entidadId: userId, despues: { debeCambiarPassword: true }, detalle: "Contraseña restablecida por el administrador" };
  });
}

export async function cambiarEstadoUsuario(ctx: ContextoAuditoria, userId: string, activo: boolean): Promise<User> {
  return conAuditoria(ctx, "EDITAR", "User", async (tx) => {
    const antes = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const despues = await tx.user.update({ where: { id: userId }, data: { banned: !activo, banReason: activo ? null : "Desactivada por el administrador" } });
    if (!activo) await tx.session.deleteMany({ where: { userId } });
    return { resultado: despues, entidadId: userId, antes: { banned: antes.banned }, despues: { banned: despues.banned }, detalle: activo ? "Cuenta reactivada" : "Cuenta desactivada" };
  });
}

export async function actualizarUsuario(ctx: ContextoAuditoria, userId: string, cambios: { name?: string; role?: Rol; funcionarioId?: string | null }): Promise<User> {
  return conAuditoria(ctx, "EDITAR", "User", async (tx) => {
    const antes = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const despues = await tx.user.update({ where: { id: userId }, data: cambios });
    return {
      resultado: despues,
      entidadId: userId,
      antes: { name: antes.name, role: antes.role, funcionarioId: antes.funcionarioId },
      despues: { name: despues.name, role: despues.role, funcionarioId: despues.funcionarioId },
    };
  });
}

export async function ultimosAccesos(usuarioIds: string[]): Promise<Map<string, Date>> {
  const accesos = await prisma.acceso.groupBy({ by: ["usuarioId"], where: { usuarioId: { in: usuarioIds }, exito: true }, _max: { fecha: true } });
  return new Map(accesos.filter((a) => a.usuarioId && a._max.fecha).map((a) => [a.usuarioId!, a._max.fecha!]));
}
