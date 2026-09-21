// Formato de cifras y fechas para la interfaz (doc 12): dd/mm/aaaa, RUT con puntos y guion, puntajes con coma
// decimal y sin decimales inútiles, "puntos" explícito en cifras destacadas.

import { desdeDate, formatearChileno, partes, type FechaCivil } from "./fechas/civil";
import { formatearRut } from "./rut";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

type ConTexto = { toString(): string };

/** "129", "6,67", "10,5": hasta dos decimales, sin ceros a la derecha, coma decimal. */
export function formatearPuntos(valor: ConTexto | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  const numero = typeof valor === "number" ? valor : Number(valor.toString());
  if (Number.isNaN(numero)) return String(valor);
  const texto = numero.toFixed(2).replace(/\.?0+$/, "");
  return texto.replace(".", ",");
}

/** "129 puntos" / "1 punto". */
export function puntosConUnidad(valor: ConTexto | number | null | undefined): string {
  const texto = formatearPuntos(valor);
  return `${texto} ${texto === "1" ? "punto" : "puntos"}`;
}

/** Fecha civil o Date (columna DATE) a dd/mm/aaaa. */
export function formatearFecha(valor: FechaCivil | Date | null | undefined): string {
  if (!valor) return "";
  return formatearChileno(valor instanceof Date ? desdeDate(valor) : valor);
}

/** "marzo de 2028" para proyecciones. */
export function formatearMesAnio(fecha: FechaCivil | null | undefined): string {
  if (!fecha) return "";
  const { anio, mes } = partes(fecha);
  return `${MESES[mes - 1]} de ${anio}`;
}

/** Instante (timestamptz) a "dd/mm/aaaa HH:MM" en hora de Chile. */
export function formatearFechaHora(instante: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instante);
}

export { formatearRut };

export function nombreCompleto(f: { nombres: string; apellidos: string }): string {
  return `${f.nombres} ${f.apellidos}`;
}

/** Tamaño de archivo legible: "2,4 MB", "512 KB". */
export function formatearTamano(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
