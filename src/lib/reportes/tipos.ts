// Tipos de los reportes (doc 06): un reporte generado es una o más secciones tabulares con columnas tipadas,
// más el contexto (fecha de corte, alcance, filtros, reglas aplicadas). Pantalla, XLSX, CSV y PDF parten del
// mismo objeto, así nunca divergen.

import type { FechaCivil } from "@/lib/fechas/civil";

export type TipoColumna = "texto" | "entero" | "decimal" | "fecha" | "booleano";

export interface Columna {
  clave: string;
  titulo: string;
  tipo: TipoColumna;
  /** Ancho sugerido en caracteres (XLSX) */
  ancho?: number;
  /** Se suma en la fila de totales */
  sumar?: boolean;
}

/** Valor de una celda: texto, número, booleano, fecha civil ("AAAA-MM-DD") o vacío. */
export type Celda = string | number | boolean | null;
export type Fila = Record<string, Celda>;

export interface Seccion {
  id: string;
  titulo: string;
  columnas: Columna[];
  filas: Fila[];
  /** Nota al pie, p. ej. "Sin calificaciones registradas a la fecha" */
  nota?: string;
}

export interface ReglaAplicada {
  tipo: string;
  categoria: string | null;
  vigenteDesde: FechaCivil;
  fuente: string;
}

export interface ContextoReporte {
  institucion: string;
  fechaCorte: FechaCivil;
  generadoEl: Date;
  generadoPor: string;
  /** Alcance legible: "Dotación completa", "Establecimiento: CESFAM…", "Funcionario: …" */
  alcance: string;
  filtros: Array<{ etiqueta: string; valor: string }>;
  reglas: ReglaAplicada[];
  totalFuncionarios: number;
}

export interface ReporteGenerado {
  id: string;
  numero: number;
  nombre: string;
  descripcion: string;
  /** Prefijo del nombre de archivo, p. ej. "nomina" */
  archivo: string;
  secciones: Seccion[];
  contexto: ContextoReporte;
}

/** Fila de totales de una sección: suma de las columnas marcadas; null si ninguna se suma. */
export function totalesDe(seccion: Seccion): Fila | null {
  const sumables = seccion.columnas.filter((c) => c.sumar);
  if (sumables.length === 0 || seccion.filas.length === 0) return null;
  const totales: Fila = {};
  for (const c of sumables) {
    const suma = seccion.filas.reduce((acc, f) => acc + (typeof f[c.clave] === "number" ? (f[c.clave] as number) : 0), 0);
    totales[c.clave] = c.tipo === "entero" ? Math.round(suma) : Math.round(suma * 100) / 100;
  }
  return totales;
}
