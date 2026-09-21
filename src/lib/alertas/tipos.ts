// Tipos y constantes de alertas sin dependencias de servidor: los importan componentes de cliente (filtros).

import type { FechaCivil } from "@/lib/fechas/civil";
import type { EstadoAlerta, TipoAlerta } from "@/generated/prisma/client";

/** Orden de importancia (doc 04 §6): primero lo que exige un acto administrativo. */
export const TIPOS_ALERTA = [
  "NIVEL_ALCANZADO",
  "BIENIO_PENDIENTE_RECONOCER",
  "BIENIO_PROXIMO",
  "NIVEL_PROXIMO",
  "CALIFICACION_PENDIENTE",
  "CAPACITACION_POR_VENCER_PERIODO",
  "DOCUMENTO_FALTANTE",
] as const satisfies readonly TipoAlerta[];

export interface FiltrosAlertas {
  tipo?: TipoAlerta;
  establecimientoId?: string;
  estado: EstadoAlerta | "TODAS";
  desde?: FechaCivil;
  hasta?: FechaCivil;
  q?: string;
  pagina: number;
}
