// Auditoría de exportaciones (doc 13 F8): cada descarga de un reporte queda como EXPORTAR con reporte, alcance,
// fecha de corte y formato. No hay escritura de dominio; la transacción existe para dejar el rastro.

import { formatearChileno, type FechaCivil } from "@/lib/fechas/civil";
import { conAuditoria, type ContextoAuditoria } from "./auditado";

export interface DatosExportacion {
  reporteId: string;
  nombre: string;
  formato: "xlsx" | "csv" | "pdf";
  alcance: string;
  fechaCorte: FechaCivil;
  filtros: Record<string, unknown>;
  filas: number;
}

export async function registrarExportacion(ctx: ContextoAuditoria, datos: DatosExportacion): Promise<void> {
  await conAuditoria(ctx, "EXPORTAR", "Reporte", async () => ({
    resultado: undefined,
    entidadId: datos.reporteId,
    despues: { formato: datos.formato, alcance: datos.alcance, fechaCorte: datos.fechaCorte, filtros: datos.filtros, filas: datos.filas },
    detalle: `${datos.nombre} · ${datos.formato.toUpperCase()} · ${datos.alcance} · al ${formatearChileno(datos.fechaCorte)}`,
  }));
}
