// Niveles (doc 04 §4, subcriterio 6): el nivel calculado es el más alto cuyo umbral alcanza el puntaje
// acumulado; el nivel vigente es el reconocido por decreto (NivelHistorico). Si el calculado supera al
// vigente, el funcionario cumple requisitos de ascenso: el motor propone, el acto administrativo dispone.
//
// La estructura de niveles (NIVELES: ingreso y máximo) y los umbrales (UMBRAL_NIVEL: lineal o tabla) son
// reglas con vigencia; se resuelven a la fecha de corte. La numeración puede ser descendente (15 → 1, lo
// habitual) o ascendente: "más alto" siempre significa más cerca del nivel máximo.

import type { FechaCivil } from "../fechas/civil";
import { puntos, type Decimal } from "./puntaje";
import type { Categoria, ConjuntoReglas, Parametros } from "./reglas";
import type { NivelRegistrado } from "./tipos";

export interface EstructuraNiveles {
  nivelIngreso: number;
  nivelMaximo: number;
  /** Niveles del de ingreso al máximo, en orden de progresión */
  progresion: number[];
  umbralDe: (nivel: number) => Decimal;
}

export interface EstadoNivel {
  /** Nivel reconocido vigente a la fecha de corte; null si no hay registro */
  vigente: number | null;
  vigenteDesde: FechaCivil | null;
  calculado: number;
  umbralCalculado: Decimal;
  cumpleAscenso: boolean;
  /** Nivel al que se aspira: el siguiente al más avanzado entre vigente y calculado; null en el máximo */
  siguiente: { nivel: number; umbral: Decimal } | null;
  puntajeFaltante: Decimal | null;
  estructura: EstructuraNiveles;
}

export function estructuraNiveles(
  niveles: Parametros<"NIVELES">,
  umbral: Parametros<"UMBRAL_NIVEL">,
): EstructuraNiveles {
  const { nivelIngreso, nivelMaximo } = niveles;
  const paso = nivelMaximo >= nivelIngreso ? 1 : -1;
  const progresion: number[] = [];
  for (let n = nivelIngreso; paso > 0 ? n <= nivelMaximo : n >= nivelMaximo; n += paso) progresion.push(n);

  const umbralDe = (nivel: number): Decimal => {
    if (umbral.modo === "lineal") {
      return puntos(umbral.puntosPorNivel).times(Math.abs(nivel - nivelIngreso));
    }
    const valor = umbral.umbrales[String(nivel)];
    if (valor === undefined) throw new Error(`La regla UMBRAL_NIVEL no define el umbral del nivel ${nivel}`);
    return puntos(valor);
  };

  return { nivelIngreso, nivelMaximo, progresion, umbralDe };
}

/** Posición en la progresión: mayor = más avanzado. */
function posicion(estructura: EstructuraNiveles, nivel: number): number {
  const i = estructura.progresion.indexOf(nivel);
  if (i < 0) throw new Error(`Nivel ${nivel} fuera de la estructura ${estructura.nivelIngreso} a ${estructura.nivelMaximo}`);
  return i;
}

export function nivelVigenteA(niveles: NivelRegistrado[], fechaCorte: FechaCivil): NivelRegistrado | null {
  return niveles
    .filter((n) => n.fechaDesde <= fechaCorte && (n.fechaHasta === null || n.fechaHasta >= fechaCorte))
    .sort((a, b) => (a.fechaDesde < b.fechaDesde ? 1 : a.fechaDesde > b.fechaDesde ? -1 : 0))[0] ?? null;
}

export function calcularNivel(
  puntajeTotal: Decimal,
  categoria: Categoria,
  niveles: NivelRegistrado[],
  fechaCorte: FechaCivil,
  reglas: ConjuntoReglas,
): EstadoNivel {
  const estructura = estructuraNiveles(
    reglas.vigente("NIVELES", fechaCorte, categoria).parametros,
    reglas.vigente("UMBRAL_NIVEL", fechaCorte, categoria).parametros,
  );

  // Calculado: el más avanzado cuyo umbral alcanza el puntaje
  let calculado = estructura.nivelIngreso;
  for (const nivel of estructura.progresion) {
    if (estructura.umbralDe(nivel).lte(puntajeTotal)) calculado = nivel;
    else break;
  }

  const vigenteRegistro = nivelVigenteA(niveles, fechaCorte);
  const vigente = vigenteRegistro?.nivel ?? null;
  const posCalculado = posicion(estructura, calculado);
  const posVigente = vigente === null ? -1 : posicion(estructura, vigente);
  const cumpleAscenso = vigente !== null && posCalculado > posVigente;

  const posReferencia = Math.max(posCalculado, posVigente);
  const nivelSiguiente = estructura.progresion[posReferencia + 1];
  const siguiente = nivelSiguiente === undefined ? null : { nivel: nivelSiguiente, umbral: estructura.umbralDe(nivelSiguiente) };

  return {
    vigente,
    vigenteDesde: vigenteRegistro?.fechaDesde ?? null,
    calculado,
    umbralCalculado: estructura.umbralDe(calculado),
    cumpleAscenso,
    siguiente,
    puntajeFaltante: siguiente ? siguiente.umbral.minus(puntajeTotal) : null,
    estructura,
  };
}
