// Aritmética de puntajes con decimal.js, la misma librería que usa Prisma para Decimal: nunca float (doc 15).
// Un Decimal que viene de Prisma es de otra copia de la librería, por eso se convierte por su texto.

import Decimal from "decimal.js";

export { Decimal };

export type PuntajeEntrada = Decimal | number | string | { toString(): string };

export const CERO = new Decimal(0);

export function puntos(valor: PuntajeEntrada): Decimal {
  if (valor instanceof Decimal) return valor;
  if (typeof valor === "number" || typeof valor === "string") return new Decimal(valor);
  return new Decimal(valor.toString());
}

export function sumarPuntos(valores: Iterable<Decimal>): Decimal {
  let total = CERO;
  for (const valor of valores) total = total.plus(valor);
  return total;
}

export function minimo(a: Decimal, b: Decimal): Decimal {
  return a.lte(b) ? a : b;
}
