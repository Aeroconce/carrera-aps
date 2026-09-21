// Plantilla de carga inicial (doc 08, doc 18 respuestas 4, 13 y 22): una fila por funcionario con su saldo de
// apertura. Las columnas se identifican por su encabezado (sin distinguir mayúsculas ni tildes).

import ExcelJS from "exceljs";
import { crearLibro, escribir } from "@/lib/exportacion/xlsx";

export interface ColumnaCarga {
  clave: string;
  encabezado: string;
  obligatoria: boolean;
  descripcion: string;
  ejemplo: string | number;
}

export const COLUMNAS_CARGA: readonly ColumnaCarga[] = [
  { clave: "rut", encabezado: "RUT", obligatoria: true, descripcion: "Con o sin puntos y guion; dígito verificador validado", ejemplo: "12.345.678-5" },
  { clave: "nombres", encabezado: "Nombres", obligatoria: true, descripcion: "Nombres del funcionario", ejemplo: "María Ignacia" },
  { clave: "apellidos", encabezado: "Apellidos", obligatoria: true, descripcion: "Apellidos", ejemplo: "Pérez Soto" },
  { clave: "categoria", encabezado: "Categoría", obligatoria: true, descripcion: "A, B, C, D, E o F (art. 5, Ley 19.378)", ejemplo: "B" },
  { clave: "establecimiento", encabezado: "Establecimiento", obligatoria: true, descripcion: "Nombre exacto de un establecimiento activo en Parámetros", ejemplo: "CESFAM Juan Cartes Arias" },
  { clave: "tipoContrato", encabezado: "Tipo de contrato", obligatoria: true, descripcion: "Titular, Plazo fijo o Reemplazo", ejemplo: "Titular" },
  { clave: "fechaIngreso", encabezado: "Fecha de ingreso", obligatoria: true, descripcion: "dd/mm/aaaa; ancla de bienios si falta la fecha del último bienio", ejemplo: "01/03/2014" },
  { clave: "grado", encabezado: "Grado vigente", obligatoria: true, descripcion: "Nivel de apertura, dentro del rango de la regla Niveles", ejemplo: 10 },
  { clave: "gradoDesde", encabezado: "Fecha desde grado", obligatoria: true, descripcion: "dd/mm/aaaa desde la que rige el grado", ejemplo: "01/03/2024" },
  { clave: "puntajeExperiencia", encabezado: "Puntaje experiencia", obligatoria: false, descripcion: "Saldo de experiencia, si el Departamento lo tiene", ejemplo: 50 },
  { clave: "puntajeCapacitacion", encabezado: "Puntaje capacitación", obligatoria: false, descripcion: "Saldo de capacitación, si el Departamento lo tiene", ejemplo: 55 },
  { clave: "puntajeTotal", encabezado: "Puntaje total", obligatoria: true, descripcion: "Puntaje vigente total; sin desglose se declara \"sin desglose\"", ejemplo: 105 },
  { clave: "fechaUltimoBienio", encabezado: "Fecha último bienio", obligatoria: true, descripcion: "dd/mm/aaaa del último bienio reconocido; ancla del siguiente", ejemplo: "01/03/2024" },
  { clave: "bieniosReconocidos", encabezado: "N° bienios reconocidos", obligatoria: false, descripcion: "Numeración de los bienios siguientes", ejemplo: 5 },
  { clave: "excedentePendiente", encabezado: "Excedente pendiente", obligatoria: false, descripcion: "Excedente de capacitación del período anterior a la apertura", ejemplo: 0 },
  { clave: "jornadaHoras", encabezado: "Jornada (horas)", obligatoria: false, descripcion: "Horas semanales (44, 33, 22…)", ejemplo: 44 },
  { clave: "cargo", encabezado: "Cargo", obligatoria: false, descripcion: "Texto libre", ejemplo: "Enfermera" },
  { clave: "correo", encabezado: "Correo", obligatoria: false, descripcion: "Para el portal del funcionario", ejemplo: "maria.perez@ejemplo.cl" },
];

/** Normaliza un encabezado para compararlo: minúsculas, sin tildes, espacios simples. */
export function normalizarEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[°º]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const NOMBRE_PLANTILLA = "carga-inicial.xlsx";
export const HOJA_DATOS = "Carga inicial";

export async function generarPlantilla(fechaSaldos: string): Promise<Uint8Array> {
  const libro = crearLibro();
  const datos = libro.addWorksheet(HOJA_DATOS, { views: [{ state: "frozen", ySplit: 1 }] });
  datos.columns = COLUMNAS_CARGA.map((c) => ({ header: c.encabezado, key: c.clave, width: Math.max(14, c.encabezado.length + 4) }));
  datos.getRow(1).font = { bold: true };
  datos.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E9EC" } };
  datos.addRow(Object.fromEntries(COLUMNAS_CARGA.map((c) => [c.clave, c.ejemplo])));
  datos.getRow(2).font = { italic: true, color: { argb: "FF5B6B75" } };
  datos.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS_CARGA.length } };

  const instrucciones = libro.addWorksheet("Instrucciones");
  instrucciones.columns = [
    { header: "Columna", key: "columna", width: 26 },
    { header: "Obligatoria", key: "obligatoria", width: 12 },
    { header: "Descripción", key: "descripcion", width: 80 },
  ];
  instrucciones.getRow(1).font = { bold: true };
  for (const c of COLUMNAS_CARGA) instrucciones.addRow({ columna: c.encabezado, obligatoria: c.obligatoria ? "Sí" : "No", descripcion: c.descripcion });
  instrucciones.addRow([]);
  instrucciones.addRow(["Los saldos corresponden al día anterior a la puesta en marcha: " + fechaSaldos + ". La fila 2 es un ejemplo: bórrala antes de cargar."]);
  instrucciones.addRow(["Cada fila crea el funcionario, su movimiento de apertura (auditado) y su nivel vigente. Si hay un error en cualquier fila, no se importa nada."]);
  const hoja: ExcelJS.Worksheet = instrucciones;
  hoja.getColumn(3).alignment = { wrapText: true };
  return escribir(libro);
}
