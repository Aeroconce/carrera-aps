// Fechas civiles: días de calendario sin hora ni zona horaria, representados como "AAAA-MM-DD".
//
// Por qué: la base guarda ingresos, bienios, capacitaciones y vigencias como DATE (sin hora). El motor
// compara y suma días y años; si trabajara con Date con hora, la zona del servidor (UTC en Docker,
// America/Santiago en desarrollo) podría mover un bienio un día. Toda la aritmética se hace sobre
// Date.UTC, y "hoy en Chile" se calcula una sola vez, fuera del motor (hoyEnChile).

import { TZDate } from "@date-fns/tz";

/** Fecha civil en formato ISO "AAAA-MM-DD". Se valida con `fechaCivil`. */
export type FechaCivil = string;

export const ZONA_HORARIA_CHILE = "America/Santiago";

const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_CHILENO = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const MILISEGUNDOS_POR_DIA = 86_400_000;

function dosDigitos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function armar(anio: number, mes: number, dia: number): FechaCivil {
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

/** Valida y normaliza una fecha civil; lanza si el formato o el día no existen (p. ej. 2025-02-30). */
export function fechaCivil(valor: string): FechaCivil {
  const partes = FORMATO_ISO.exec(valor);
  if (!partes) throw new Error(`Fecha civil inválida: "${valor}" (se espera AAAA-MM-DD)`);
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    throw new Error(`Fecha civil inexistente: "${valor}"`);
  }
  return valor;
}

export function partes(fecha: FechaCivil): { anio: number; mes: number; dia: number } {
  const p = FORMATO_ISO.exec(fecha);
  if (!p) throw new Error(`Fecha civil inválida: "${fecha}"`);
  return { anio: Number(p[1]), mes: Number(p[2]), dia: Number(p[3]) };
}

/** Desde un Date leído de una columna DATE de Prisma (medianoche UTC) o cualquier Date, tomando sus componentes UTC. */
export function desdeDate(fecha: Date): FechaCivil {
  return armar(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate());
}

/** A Date en medianoche UTC, que es como Prisma escribe una columna DATE. */
export function aDate(fecha: FechaCivil): Date {
  const { anio, mes, dia } = partes(fecha);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export function anioDe(fecha: FechaCivil): number {
  return partes(fecha).anio;
}

export function sumarDias(fecha: FechaCivil, dias: number): FechaCivil {
  const { anio, mes, dia } = partes(fecha);
  return desdeDate(new Date(Date.UTC(anio, mes - 1, dia + dias)));
}

/** Suma años manteniendo día y mes; el 29 de febrero cae al 28 cuando el año destino no es bisiesto. */
export function sumarAnios(fecha: FechaCivil, anios: number): FechaCivil {
  const { anio, mes, dia } = partes(fecha);
  const anioDestino = anio + anios;
  const ultimoDiaDelMes = new Date(Date.UTC(anioDestino, mes, 0)).getUTCDate();
  return armar(anioDestino, mes, Math.min(dia, ultimoDiaDelMes));
}

/** Días de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde: FechaCivil, hasta: FechaCivil): number {
  return Math.round((aDate(hasta).getTime() - aDate(desde).getTime()) / MILISEGUNDOS_POR_DIA);
}

/** Orden natural: el formato ISO permite comparar como texto. */
export function comparar(a: FechaCivil, b: FechaCivil): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function esAnterior(a: FechaCivil, b: FechaCivil): boolean {
  return a < b;
}

export function esPosterior(a: FechaCivil, b: FechaCivil): boolean {
  return a > b;
}

export function maxFecha(a: FechaCivil, b: FechaCivil): FechaCivil {
  return a > b ? a : b;
}

export function minFecha(a: FechaCivil, b: FechaCivil): FechaCivil {
  return a < b ? a : b;
}

export function inicioDeAnio(anio: number): FechaCivil {
  return armar(anio, 1, 1);
}

export function finDeAnio(anio: number): FechaCivil {
  return armar(anio, 12, 31);
}

/** "dd/mm/aaaa", el formato de toda la interfaz (doc 12). */
export function formatearChileno(fecha: FechaCivil): string {
  const { anio, mes, dia } = partes(fecha);
  return `${dosDigitos(dia)}/${dosDigitos(mes)}/${anio}`;
}

/** Desde "dd/mm/aaaa" (también acepta d/m/aaaa); lanza si no es una fecha válida. */
export function parsearChileno(texto: string): FechaCivil {
  const p = FORMATO_CHILENO.exec(texto.trim());
  if (!p) throw new Error(`Fecha inválida: "${texto}" (se espera dd/mm/aaaa)`);
  return fechaCivil(armar(Number(p[3]), Number(p[2]), Number(p[1])));
}

/** La fecha civil de hoy en Chile, calculada a partir del instante actual y la zona America/Santiago. */
export function hoyEnChile(ahora: Date = new Date()): FechaCivil {
  const enChile = new TZDate(ahora.getTime(), ZONA_HORARIA_CHILE);
  return armar(enChile.getFullYear(), enChile.getMonth() + 1, enChile.getDate());
}
