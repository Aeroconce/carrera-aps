// Sesión en el servidor (docs 07 y 15). Solo para Server Components, layouts y server actions.
//
// Los permisos se verifican en el servidor en cada acción (doc 07): `exigirSesion` es la puerta de entrada de
// cada página y cada server action, y `exigirRol` acota por rol. El proxy (src/proxy.ts) solo hace el chequeo
// optimista por cookie; la autoridad es esta capa, que consulta la sesión en la base de datos.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, ROLES, type Rol } from "./auth";

export type SesionActual = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
export type UsuarioSesion = SesionActual["user"];

/** Sesión actual o null. Lee las cookies de la petición y valida contra la base (sesión revocable). */
export async function obtenerSesion(): Promise<SesionActual | null> {
  return auth.api.getSession({ headers: await headers() });
}

/** Rol efectivo del usuario. Un valor desconocido se trata como FUNCIONARIO, el rol de menos privilegios. */
export function rolDe(usuario: { role?: string | null | undefined }): Rol {
  const rol = usuario.role ?? "";
  return (ROLES as readonly string[]).includes(rol) ? (rol as Rol) : "FUNCIONARIO";
}

/** Página de inicio según rol: portal para FUNCIONARIO, inicio administrativo para los demás. */
export function inicioSegunRol(rol: Rol): string {
  return rol === "FUNCIONARIO" ? "/mi-carrera" : "/";
}

export interface OpcionesExigirSesion {
  /** Roles permitidos; sin valor, cualquier usuario autenticado. */
  roles?: readonly Rol[];
  /** Permite entrar aunque el cambio de contraseña esté pendiente (solo la propia página de cambio). */
  permitirCambioPendiente?: boolean;
}

/**
 * Exige sesión y, opcionalmente, rol. Redirige a /login sin sesión, a /cambiar-contrasena si el cambio de
 * contraseña está pendiente (primer ingreso) y a /sin-permiso si el rol no está permitido.
 */
export async function exigirSesion(opciones: OpcionesExigirSesion = {}): Promise<SesionActual> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/login");
  }
  if (sesion.user.debeCambiarPassword && !opciones.permitirCambioPendiente) {
    redirect("/cambiar-contrasena");
  }
  if (opciones.roles && !opciones.roles.includes(rolDe(sesion.user))) {
    redirect("/sin-permiso");
  }
  return sesion;
}
