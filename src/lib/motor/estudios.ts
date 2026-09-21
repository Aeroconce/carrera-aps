// Reconocimiento de estudios (doc 04 §3, BT 4.4): títulos, diplomados, postítulos y postgrados.
// Según la regla PUNTAJE_ESTUDIOS vigente a la fecha del reconocimiento, un estudio da puntos en las
// categorías que la regla indica; en las demás, o si su tipo no está en la tabla, es un beneficio informativo.
// Solo puntúan los estudios reconocidos (reconocidoEl) hasta la fecha de corte y posteriores a la apertura.

import type { FechaCivil } from "../fechas/civil";
import { CERO, puntos, sumarPuntos, type Decimal } from "./puntaje";
import type { Categoria, ConjuntoReglas } from "./reglas";
import type { AperturaEntrada, EstudioEntrada } from "./tipos";

export interface EstudioCalculado {
  id?: string;
  nombre?: string;
  tipo: EstudioEntrada["tipo"];
  reconocidoEl: FechaCivil | null;
  documentoId: string | null;
  puntaje: Decimal;
  /** true cuando el reglamento no lo puntúa en esta categoría: se informa como beneficio */
  soloBeneficio: boolean;
  /** true si fue reconocido antes de la apertura: ya está en el saldo */
  incluidoEnApertura: boolean;
}

export interface ResultadoEstudios {
  estudios: EstudioCalculado[];
  puntajeEstudios: Decimal;
}

export function calcularEstudios(
  estudios: EstudioEntrada[],
  categoria: Categoria,
  fechaCorte: FechaCivil,
  reglas: ConjuntoReglas,
  aperturaEntrada?: AperturaEntrada | null,
): ResultadoEstudios {
  const apertura = aperturaEntrada && aperturaEntrada.fecha <= fechaCorte ? aperturaEntrada : null;
  const calculados = estudios
    .filter((e) => e.reconocidoEl === null || e.reconocidoEl <= fechaCorte)
    .map<EstudioCalculado>((e) => {
      const incluidoEnApertura = apertura !== null && e.reconocidoEl !== null && e.reconocidoEl <= apertura.fecha;
      let puntaje = CERO;
      let soloBeneficio = true;
      if (e.reconocidoEl !== null) {
        const regla = reglas.parametrosOpcionales("PUNTAJE_ESTUDIOS", e.reconocidoEl, categoria);
        const valor = regla?.categorias.includes(categoria) ? regla.puntos[e.tipo] : undefined;
        if (valor !== undefined) {
          puntaje = puntos(valor);
          soloBeneficio = false;
        }
      }
      return {
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        reconocidoEl: e.reconocidoEl,
        documentoId: e.documentoId ?? null,
        puntaje,
        soloBeneficio,
        incluidoEnApertura,
      };
    });

  return {
    estudios: calculados,
    puntajeEstudios: sumarPuntos(calculados.filter((e) => !e.incluidoEnApertura).map((e) => e.puntaje)),
  };
}
