// Servidor de autenticación: Better Auth 1.7 con el adaptador de Prisma (docs 07 y 10).
//
// Decisiones:
// - Correo y contraseña, sin registro público: las cuentas las crea un ADMIN (plugin admin). Sin verificación
//   de correo, porque el ADMIN entrega la cuenta con correo institucional y una contraseña inicial que el
//   usuario debe cambiar en su primer ingreso (campo debeCambiarPassword).
// - Sesiones en base de datos (tabla session): se pueden revocar y sostienen el registro de accesos (BT 3.2).
// - Expiración por inactividad: la sesión vive 30 minutos desde su última renovación y se renueva con
//   actividad como máximo cada 5 minutos (doc 07).
// - Rate limiting nativo: 5 intentos de inicio de sesión en 15 minutos por IP (doc 07); el resto, 100 por minuto.
// - Roles en `user.role` (plugin admin): ADMIN, SUPERVISION y FUNCIONARIO. Solo ADMIN tiene los permisos
//   administrativos del plugin (crear usuarios, cambiar rol, desactivar, revocar sesiones). La autorización
//   sobre datos del dominio se verifica además en cada server action (doc 07).
// - Campos propios en `user`: institucionId, funcionarioId (portal) y debeCambiarPassword. No se aceptan desde
//   el cliente (input: false): los fija el servidor.
// - Cada intento de inicio de sesión, exitoso o fallido, queda en `Acceso` desde el hook `after`.
// - Importaciones relativas (no `@/`): este archivo también lo carga la CLI de Better Auth.

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
import { registrarAcceso } from "../db/accesos";
import { prisma } from "../db/prisma";
import { POLITICA_ACCESO, ROLES, type Rol } from "./politica";

export { POLITICA_ACCESO, ROLES };
export type { Rol };

// Control de acceso del plugin admin: ADMIN tiene todos los permisos administrativos; los otros roles, ninguno.
const ac = createAccessControl({ ...defaultStatements });
const roles = {
  ADMIN: ac.newRole({ ...adminAc.statements }),
  SUPERVISION: ac.newRole({}),
  FUNCIONARIO: ac.newRole({}),
};

/** IP del cliente según las cabeceras que deja el proxy (Caddy); en desarrollo, "local". */
function obtenerIp(headers: Headers | undefined): string {
  const reenviada = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || headers?.get("x-real-ip") || "local";
}

export const auth = betterAuth({
  appName: "Carrera APS",
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: POLITICA_ACCESO.largoMinimoPassword,
    maxPasswordLength: POLITICA_ACCESO.largoMaximoPassword,
  },

  session: {
    expiresIn: POLITICA_ACCESO.sesionSegundos,
    updateAge: POLITICA_ACCESO.renovacionSesionSegundos,
  },

  rateLimit: {
    enabled: true,
    // En base de datos (tabla rateLimit): sobrevive reinicios y vale para varias instancias
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: POLITICA_ACCESO.intentosLoginVentanaSegundos,
        max: POLITICA_ACCESO.intentosLoginMax,
      },
    },
  },

  user: {
    additionalFields: {
      institucionId: { type: "string", required: false, input: false },
      funcionarioId: { type: "string", required: false, input: false },
      debeCambiarPassword: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },

  plugins: [
    admin({
      ac,
      roles,
      adminRoles: ["ADMIN"],
      defaultRole: "FUNCIONARIO",
      bannedUserMessage: "La cuenta está desactivada. Contacta al administrador del sistema.",
    }),
  ],

  advanced: {
    cookiePrefix: "carrera-aps",
  },

  hooks: {
    // Registro de accesos (BT 3.2): un registro por intento de inicio de sesión, exitoso o no.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const sesionNueva = ctx.context.newSession;
      const cuerpo = ctx.body as { email?: unknown } | undefined;
      const email = typeof cuerpo?.email === "string" ? cuerpo.email.trim().toLowerCase() : "";
      await registrarAcceso({
        email,
        exito: Boolean(sesionNueva),
        usuarioId: sesionNueva?.user.id ?? null,
        ip: obtenerIp(ctx.headers),
        userAgent: ctx.headers?.get("user-agent") ?? "",
      });
    }),
  },
});

export type Sesion = typeof auth.$Infer.Session;
