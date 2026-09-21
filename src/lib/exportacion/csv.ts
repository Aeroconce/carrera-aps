// Exportación a CSV (doc 06): UTF-8 con BOM y separador ";" para que Excel en español lo abra sin asistente.
// Fechas dd/mm/aaaa, decimales con coma, booleanos Sí/No. Varias secciones van una tras otra, con su título.

import { formatearChileno } from "@/lib/fechas/civil";
import { totalesDe, type Celda, type Columna, type ReporteGenerado } from "@/lib/reportes/tipos";

const SEPARADOR = ";";
const BOM = "﻿";

export function celdaCsv(valor: Celda | undefined, tipo: Columna["tipo"]): string {
  if (valor === null || valor === undefined) return "";
  if (tipo === "fecha" && typeof valor === "string") return formatearChileno(valor);
  if (tipo === "booleano") return valor ? "Sí" : "No";
  if (typeof valor === "number") return (tipo === "entero" ? String(valor) : valor.toFixed(2)).replace(".", ",");
  return String(valor);
}

function escapar(texto: string): string {
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function reporteACsv(reporte: ReporteGenerado): string {
  const lineas: string[] = [];
  const varias = reporte.secciones.length > 1;
  for (const seccion of reporte.secciones) {
    if (varias) lineas.push(escapar(seccion.titulo));
    lineas.push(seccion.columnas.map((c) => escapar(c.titulo)).join(SEPARADOR));
    for (const fila of seccion.filas) {
      lineas.push(seccion.columnas.map((c) => escapar(celdaCsv(fila[c.clave], c.tipo))).join(SEPARADOR));
    }
    const totales = totalesDe(seccion);
    if (totales) {
      lineas.push(seccion.columnas.map((c, i) => (i === 0 ? "Totales" : escapar(celdaCsv(totales[c.clave], c.tipo)))).join(SEPARADOR));
    }
    if (varias) lineas.push("");
  }
  const c = reporte.contexto;
  lineas.push("");
  lineas.push(`Situación al ${formatearChileno(c.fechaCorte)}${SEPARADOR}${escapar(c.alcance)}${SEPARADOR}${escapar(c.institucion)}`);
  return BOM + lineas.join("\r\n") + "\r\n";
}
