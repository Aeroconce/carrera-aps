// Identidad de una alerta persistida (doc 04 §6): funcionario + tipo + fecha del hito. Los avisos de nivel
// (NIVEL_ALCANZADO, NIVEL_PROXIMO) no tienen un hito propio, se identifican solo por tipo y conservan la fecha
// en que se detectaron. Lo usan la sincronización (src/lib/db/alertas.ts) y el panel de Reportes.

import type { FechaCivil } from "@/lib/fechas/civil";
import type { AlertaCalculada } from "@/lib/motor/alertas";
import type { EstadoAlerta, TipoAlerta } from "@/generated/prisma/client";

export const TIPOS_SIN_HITO: ReadonlySet<TipoAlerta> = new Set<TipoAlerta>(["NIVEL_ALCANZADO", "NIVEL_PROXIMO"]);
export const NOTA_RESUELTA_AUTOMATICA = "Resuelta automáticamente: el hecho dejó de cumplirse";

export function claveAlerta(funcionarioId: string, tipo: TipoAlerta, fechaHito: FechaCivil): string {
  return TIPOS_SIN_HITO.has(tipo) ? `${funcionarioId}:${tipo}` : `${funcionarioId}:${tipo}:${fechaHito}`;
}

export interface AlertaPersistidaResumen {
  funcionarioId: string;
  tipo: TipoAlerta;
  fechaHito: FechaCivil;
  mensaje: string;
  estado: EstadoAlerta;
  resolucionNota: string | null;
}

/** true si el usuario cerró a mano esta misma alerta (descartada, o atendida con nota) y el hecho no cambió. */
export function cerradaManualmente(persistida: AlertaPersistidaResumen | undefined, calculada: AlertaCalculada): boolean {
  if (!persistida || persistida.estado === "ACTIVA") return false;
  if (persistida.estado === "ATENDIDA" && persistida.resolucionNota === NOTA_RESUELTA_AUTOMATICA) return false;
  return persistida.mensaje === calculada.mensaje;
}
