// Lectura de la planilla de carga inicial: convierte la hoja de datos en filas crudas (texto) por clave de columna.
// La validación (formato, coherencia, existencia en la base) es de validar.ts.

import ExcelJS from "exceljs";
import { desdeDate } from "@/lib/fechas/civil";
import { COLUMNAS_CARGA, HOJA_DATOS, normalizarEncabezado } from "./plantilla";

/** Fila tal como viene de la planilla: valores en texto por clave; `numero` es la fila de Excel (1 = encabezado). */
export interface FilaCruda {
  numero: number;
  valores: Record<string, string>;
}

export interface ResultadoLectura {
  filas: FilaCruda[];
  /** Encabezados obligatorios que no aparecen en la hoja */
  faltantes: string[];
}

function celdaATexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return desdeDate(valor);
  if (typeof valor === "object") {
    if ("richText" in valor) return valor.richText.map((r) => r.text).join("").trim();
    if ("text" in valor) return String(valor.text).trim();
    if ("result" in valor) return celdaATexto(valor.result as ExcelJS.CellValue);
    if ("error" in valor) return "";
    return String(valor).trim();
  }
  return String(valor).trim();
}

export async function leerPlanillaCargaInicial(contenido: Uint8Array): Promise<ResultadoLectura> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido as unknown as ArrayBuffer);
  const hoja = libro.getWorksheet(HOJA_DATOS) ?? libro.worksheets[0];
  if (!hoja) return { filas: [], faltantes: COLUMNAS_CARGA.filter((c) => c.obligatoria).map((c) => c.encabezado) };

  const porEncabezado = new Map(COLUMNAS_CARGA.map((c) => [normalizarEncabezado(c.encabezado), c.clave]));
  const columnas = new Map<number, string>();
  hoja.getRow(1).eachCell((celda, n) => {
    const clave = porEncabezado.get(normalizarEncabezado(celdaATexto(celda.value)));
    if (clave) columnas.set(n, clave);
  });
  const presentes = new Set(columnas.values());
  const faltantes = COLUMNAS_CARGA.filter((c) => c.obligatoria && !presentes.has(c.clave)).map((c) => c.encabezado);

  const filas: FilaCruda[] = [];
  hoja.eachRow((fila, numero) => {
    if (numero === 1) return;
    const valores: Record<string, string> = {};
    let vacia = true;
    for (const [indice, clave] of columnas) {
      const texto = celdaATexto(fila.getCell(indice).value);
      valores[clave] = texto;
      if (texto) vacia = false;
    }
    if (!vacia) filas.push({ numero, valores });
  });
  return { filas, faltantes };
}
