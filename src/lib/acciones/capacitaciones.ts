"use server";

// Registrar una capacitación desde el módulo Capacitaciones (doc 05 §4): el formulario trae el funcionario;
// la validación y la escritura son las mismas de la ficha (registrarCapacitacionAction).

import { registrarCapacitacionAction } from "./funcionarios";
import type { RespuestaAccion } from "./tipos";

export async function registrarCapacitacionDesdeListaAction(fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const funcionarioId = fd.get("funcionarioId");
  if (typeof funcionarioId !== "string" || !funcionarioId) {
    return { ok: false, error: { codigo: "VALIDACION", mensaje: "Revisa los campos marcados.", campos: { funcionarioId: ["Elige un funcionario."] } } };
  }
  return registrarCapacitacionAction(funcionarioId, fd);
}
