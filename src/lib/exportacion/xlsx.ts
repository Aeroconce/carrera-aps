// Exportación a Excel (doc 06, doc 10): ExcelJS encapsulado tras una interfaz propia. El libro conserva tipos
// (fechas como fechas, números como números), encabezados en negrita, anchos ajustados, filtro automático y una
// hoja "Parámetros" con la fecha de corte, el alcance, los filtros y las reglas aplicadas.

import ExcelJS from "exceljs";
import { aDate, formatearChileno } from "@/lib/fechas/civil";
import { formatearFechaHora } from "@/lib/formato";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import { totalesDe, type Celda, type Columna, type ReporteGenerado, type Seccion } from "@/lib/reportes/tipos";

const RELLENO_ENCABEZADO: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E9EC" } };
const FORMATOS: Record<Columna["tipo"], string | undefined> = { texto: undefined, entero: "0", decimal: "#,##0.00", fecha: "dd/mm/yyyy", booleano: undefined };

export function crearLibro(): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Carrera APS";
  libro.created = new Date();
  return libro;
}

/** Nombre de hoja válido para Excel: sin []:*?/\ y hasta 31 caracteres, único dentro del libro. */
function nombreHoja(libro: ExcelJS.Workbook, titulo: string): string {
  const limpio = titulo.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Hoja";
  let nombre = limpio;
  let n = 2;
  while (libro.getWorksheet(nombre)) nombre = `${limpio.slice(0, 28)} ${n++}`;
  return nombre;
}

function celdaXlsx(valor: Celda, tipo: Columna["tipo"]): ExcelJS.CellValue {
  if (valor === null || valor === undefined) return null;
  if (tipo === "fecha" && typeof valor === "string") return aDate(valor);
  if (tipo === "booleano") return valor ? "Sí" : "No";
  return valor;
}

export function agregarHoja(libro: ExcelJS.Workbook, seccion: Seccion): ExcelJS.Worksheet {
  const hoja = libro.addWorksheet(nombreHoja(libro, seccion.titulo), { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = seccion.columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho ?? 14 }));
  for (const c of seccion.columnas) {
    const formato = FORMATOS[c.tipo];
    const columna = hoja.getColumn(c.clave);
    if (formato) columna.numFmt = formato;
    if (c.tipo === "entero" || c.tipo === "decimal") columna.alignment = { horizontal: "right" };
  }
  for (const fila of seccion.filas) {
    hoja.addRow(Object.fromEntries(seccion.columnas.map((c) => [c.clave, celdaXlsx(fila[c.clave] ?? null, c.tipo)])));
  }
  const totales = totalesDe(seccion);
  if (totales) {
    const filaTotal = hoja.addRow(Object.fromEntries(seccion.columnas.map((c, i) => [c.clave, i === 0 ? "Totales" : (totales[c.clave] ?? null)])));
    filaTotal.font = { bold: true };
  }
  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true };
  encabezado.fill = RELLENO_ENCABEZADO;
  encabezado.alignment = { vertical: "middle", wrapText: true };
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: seccion.columnas.length } };
  if (seccion.nota) {
    hoja.addRow([]);
    hoja.addRow([seccion.nota]).font = { italic: true };
  }
  return hoja;
}

export function agregarHojaParametros(libro: ExcelJS.Workbook, reporte: ReporteGenerado): ExcelJS.Worksheet {
  const hoja = libro.addWorksheet("Parámetros");
  hoja.columns = [
    { header: "Parámetro", key: "parametro", width: 28 },
    { header: "Valor", key: "valor", width: 70 },
  ];
  const c = reporte.contexto;
  const filas: Array<[string, string]> = [
    ["Reporte", `${reporte.numero ? `${reporte.numero}. ` : ""}${reporte.nombre}`],
    ["Institución", c.institucion],
    ["Situación al", formatearChileno(c.fechaCorte)],
    ["Alcance", c.alcance],
    ...c.filtros.map<[string, string]>((f) => [f.etiqueta, f.valor]),
    ["Funcionarios incluidos", String(c.totalFuncionarios)],
    ["Generado el", formatearFechaHora(c.generadoEl)],
    ["Generado por", c.generadoPor],
    ...c.reglas.map<[string, string]>((r) => [
      `Regla: ${ETIQUETAS.tipoRegla[r.tipo as keyof typeof ETIQUETAS.tipoRegla] ?? r.tipo}${r.categoria ? ` (cat. ${r.categoria})` : ""}`,
      `vigente desde ${formatearChileno(r.vigenteDesde)} · ${r.fuente}`,
    ]),
  ];
  for (const [parametro, valor] of filas) hoja.addRow({ parametro, valor });
  hoja.getRow(1).font = { bold: true };
  hoja.getRow(1).fill = RELLENO_ENCABEZADO;
  return hoja;
}

export async function escribir(libro: ExcelJS.Workbook): Promise<Uint8Array> {
  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

/** Libro completo de un reporte: una hoja por sección más "Parámetros". */
export async function reporteAXlsx(reporte: ReporteGenerado): Promise<Uint8Array> {
  const libro = crearLibro();
  for (const seccion of reporte.secciones) agregarHoja(libro, seccion);
  agregarHojaParametros(libro, reporte);
  return escribir(libro);
}
