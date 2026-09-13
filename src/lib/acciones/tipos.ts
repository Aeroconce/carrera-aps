// Contrato de respuesta de toda server action (doc 15): nunca lanzan al cliente.
// Los detalles técnicos van al log del servidor; a la pantalla llega un mensaje concreto en español.

export interface ErrorAccion {
  codigo: string;
  mensaje: string;
  /** Errores por campo del formulario, cuando aplica. */
  campos?: Record<string, string[]>;
}

export type RespuestaAccion<T> = { ok: true; data: T } | { ok: false; error: ErrorAccion };

export const MENSAJE_ERROR_INTERNO = "No se pudo guardar. Reintenta; si persiste, avisa al administrador.";

export function errorInterno(): RespuestaAccion<never> {
  return { ok: false, error: { codigo: "ERROR_INTERNO", mensaje: MENSAJE_ERROR_INTERNO } };
}
