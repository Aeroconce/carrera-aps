// Filtros comunes a todos los reportes (doc 06): tres alcances, "Situación al", categoría, nivel, tipo de
// contrato y estado. Viven en la URL (GET) para que un reporte sea un enlace compartible y reproducible.

import { fechaCivil, hoyEnChile, parsearChileno, type FechaCivil } from "@/lib/fechas/civil";
import type { Categoria, TipoContrato } from "@/generated/prisma/client";

export const ALCANCES = ["dotacion", "establecimiento", "funcionario"] as const;
export type Alcance = (typeof ALCANCES)[number];
export type EstadoFiltro = "ACTIVO" | "INACTIVO" | "TODOS";

export interface FiltrosReporte {
  alcance: Alcance;
  funcionarioId?: string;
  establecimientoId?: string;
  /** Fecha de corte ("Situación al") */
  fecha: FechaCivil;
  categoria?: Categoria;
  nivel?: number;
  tipoContrato?: TipoContrato;
  estado: EstadoFiltro;
  pagina: number;
}

const CATEGORIAS = ["A", "B", "C", "D", "E", "F"] as const;
const CONTRATOS = ["TITULAR", "PLAZO_FIJO", "REEMPLAZO"] as const;

export type ParametrosUrl = Record<string, string | string[] | undefined>;

function uno(params: ParametrosUrl, clave: string): string | undefined {
  const v = params[clave];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Acepta "AAAA-MM-DD" (input date) o "dd/mm/aaaa"; una fecha inválida se ignora. */
export function leerFecha(valor: string | undefined): FechaCivil | null {
  if (!valor) return null;
  try {
    return valor.includes("/") ? parsearChileno(valor) : fechaCivil(valor);
  } catch {
    return null;
  }
}

export function leerFiltrosReporte(params: ParametrosUrl, fechaPorDefecto: FechaCivil = hoyEnChile()): FiltrosReporte {
  const alcanceCrudo = uno(params, "alcance");
  const funcionarioId = uno(params, "funcionario");
  const establecimientoId = uno(params, "establecimiento");
  const alcance: Alcance = (ALCANCES as readonly string[]).includes(alcanceCrudo ?? "")
    ? (alcanceCrudo as Alcance)
    : funcionarioId
      ? "funcionario"
      : establecimientoId
        ? "establecimiento"
        : "dotacion";
  const categoria = uno(params, "categoria");
  const tipoContrato = uno(params, "tipoContrato");
  const estado = uno(params, "estado");
  const nivel = Number(uno(params, "nivel") ?? "");
  const pagina = Number(uno(params, "pagina") ?? "1");
  return {
    alcance,
    funcionarioId: alcance === "funcionario" ? funcionarioId : undefined,
    establecimientoId: alcance === "establecimiento" ? establecimientoId : undefined,
    fecha: leerFecha(uno(params, "fecha")) ?? fechaPorDefecto,
    categoria: (CATEGORIAS as readonly string[]).includes(categoria ?? "") ? (categoria as Categoria) : undefined,
    nivel: Number.isInteger(nivel) && nivel > 0 ? nivel : undefined,
    tipoContrato: (CONTRATOS as readonly string[]).includes(tipoContrato ?? "") ? (tipoContrato as TipoContrato) : undefined,
    estado: estado === "INACTIVO" || estado === "TODOS" ? estado : "ACTIVO",
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Los filtros como cadena de consulta (sin la página), para enlaces de exportación y paginación. */
export function filtrosAQuery(filtros: FiltrosReporte, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  p.set("alcance", filtros.alcance);
  if (filtros.funcionarioId) p.set("funcionario", filtros.funcionarioId);
  if (filtros.establecimientoId) p.set("establecimiento", filtros.establecimientoId);
  p.set("fecha", filtros.fecha);
  if (filtros.categoria) p.set("categoria", filtros.categoria);
  if (filtros.nivel) p.set("nivel", String(filtros.nivel));
  if (filtros.tipoContrato) p.set("tipoContrato", filtros.tipoContrato);
  if (filtros.estado !== "ACTIVO") p.set("estado", filtros.estado);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}
