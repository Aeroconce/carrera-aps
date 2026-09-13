"use server";

// Acciones sobre la propia cuenta del usuario con sesión.
// El cambio de contraseña en sí lo hace Better Auth (authClient.changePassword, con hash y revocación de
// otras sesiones); aquí solo se levanta la marca de primer ingreso, auditada como EDITAR sobre User.

import { exigirSesion } from "@/lib/auth/sesion";
import { conAuditoria } from "@/lib/db/auditado";
import { errorInterno, type RespuestaAccion } from "./tipos";

export async function marcarContrasenaCambiada(): Promise<RespuestaAccion<{ debeCambiarPassword: false }>> {
  const sesion = await exigirSesion({ permitirCambioPendiente: true });
  if (!sesion.user.debeCambiarPassword) {
    return { ok: true, data: { debeCambiarPassword: false } };
  }
  try {
    await conAuditoria({ usuarioId: sesion.user.id }, "EDITAR", "User", async (tx) => {
      const actualizado = await tx.user.update({
        where: { id: sesion.user.id },
        data: { debeCambiarPassword: false },
      });
      return {
        resultado: actualizado,
        entidadId: actualizado.id,
        antes: { debeCambiarPassword: true },
        despues: { debeCambiarPassword: false },
        detalle: "Contraseña definida en el primer ingreso",
      };
    });
    return { ok: true, data: { debeCambiarPassword: false } };
  } catch (error) {
    console.error("marcarContrasenaCambiada", error);
    return errorInterno();
  }
}
