// Proyección de cambio de nivel (doc 04 §5, subcriterio 7).
//
// Supuestos, siempre visibles en pantalla: el funcionario sigue acumulando bienios al ritmo de la regla
// (cada dos años desde el próximo, con los puntos vigentes) y capacitación al promedio de sus últimos N
// períodos con puntaje aplicado (N = 3 por defecto), que entra al cierre de cada año futuro. Se recorren los
// hitos en orden cronológico hasta cruzar el umbral del nivel siguiente. Si el promedio es 0 se proyecta solo
// con bienios y se dice. Ejemplo 1 del doc 14: 129 puntos, faltan 11; fin de 2027 con 6,67 → 135,67;
// bienio del 01/03/2028 → 145,67: cambio estimado en marzo de 2028.

import { anioDe, finDeAnio, sumarAnios, sumarDias, type FechaCivil } from "../fechas/civil";
import type { ResultadoCapacitacion } from "./capacitacion";
import type { EstadoNivel } from "./niveles";
import { CERO, puntos, type Decimal } from "./puntaje";
import type { Categoria, ConjuntoReglas } from "./reglas";

export interface SupuestosProyeccion {
  puntosPorBienio: Decimal;
  capacitacionPromedioAnual: Decimal;
  periodosPromediados: number;
  proximoBienio: FechaCivil | null;
}

export interface Proyeccion {
  nivelSiguiente: number;
  umbral: Decimal;
  puntajeFaltante: Decimal;
  /** null si no se alcanza dentro del horizonte (o sin bienios ni capacitación por acumular) */
  fechaEstimada: FechaCivil | null;
  supuestos: SupuestosProyeccion;
  /** Frase para la interfaz, p. ej. "Proyección con 10 puntos por bienio y 6,67 puntos de capacitación por año" */
  descripcion: string;
}

export interface EntradaProyeccion {
  puntajeTotal: Decimal;
  nivel: EstadoNivel;
  proximoBienio: FechaCivil | null;
  capacitacion: ResultadoCapacitacion;
  categoria: Categoria;
  fechaCorte: FechaCivil;
}

export interface OpcionesProyeccion {
  periodosPromedio?: number;
  horizonteAnios?: number;
}

export function proyectarAscenso(
  entrada: EntradaProyeccion,
  reglas: ConjuntoReglas,
  opciones: OpcionesProyeccion = {},
): Proyeccion | null {
  const { nivel, fechaCorte, categoria } = entrada;
  if (!nivel.siguiente) return null;

  const periodosPromedio = opciones.periodosPromedio ?? 3;
  const horizonteAnios = opciones.horizonteAnios ?? 30;
  const puntosPorBienio = puntos(reglas.vigente("PUNTOS_BIENIO", fechaCorte, categoria).parametros.puntos);
  const modoBienio = reglas.vigente("DIAS_BIENIO", fechaCorte, categoria).parametros;

  // Promedio de los últimos N períodos con puntaje aplicado
  const conAplicado = entrada.capacitacion.periodos
    .filter((p) => p.aplicado.gt(0))
    .sort((a, b) => b.periodo - a.periodo)
    .slice(0, periodosPromedio);
  const capacitacionPromedioAnual =
    conAplicado.length === 0
      ? CERO
      : conAplicado.reduce((suma, p) => suma.plus(p.aplicado), CERO).div(conAplicado.length);

  const umbral = nivel.siguiente.umbral;
  const puntajeFaltante = umbral.minus(entrada.puntajeTotal);
  const limite = sumarAnios(fechaCorte, horizonteAnios);

  // Hitos futuros en orden: bienios cada dos años desde el próximo, capacitación al cierre de cada año futuro
  let fechaEstimada: FechaCivil | null = null;
  if (puntajeFaltante.lte(0)) {
    fechaEstimada = fechaCorte;
  } else if (entrada.proximoBienio !== null || capacitacionPromedioAnual.gt(0)) {
    let acumulado = entrada.puntajeTotal;
    let proximoBienio = entrada.proximoBienio;
    let anioCierre = anioDe(fechaCorte) + 1;
    while (true) {
      const cierre = finDeAnio(anioCierre);
      const siguienteHito =
        proximoBienio !== null && (proximoBienio <= cierre || !capacitacionPromedioAnual.gt(0))
          ? { fecha: proximoBienio, tipo: "bienio" as const }
          : { fecha: cierre, tipo: "cierre" as const };
      if (siguienteHito.fecha > limite) break;
      if (siguienteHito.tipo === "bienio") {
        acumulado = acumulado.plus(puntosPorBienio);
        proximoBienio = modoBienio.modo === "calendario" ? sumarAnios(siguienteHito.fecha, 2) : sumarDias(siguienteHito.fecha, modoBienio.dias);
      } else {
        acumulado = acumulado.plus(capacitacionPromedioAnual);
        anioCierre += 1;
      }
      if (acumulado.gte(umbral)) {
        fechaEstimada = siguienteHito.fecha;
        break;
      }
    }
  }

  const supuestos: SupuestosProyeccion = {
    puntosPorBienio,
    capacitacionPromedioAnual,
    periodosPromediados: conAplicado.length,
    proximoBienio: entrada.proximoBienio,
  };

  return {
    nivelSiguiente: nivel.siguiente.nivel,
    umbral,
    puntajeFaltante,
    fechaEstimada,
    supuestos,
    descripcion: describir(supuestos),
  };
}

function formatearPuntos(valor: Decimal): string {
  const texto = valor.toDecimalPlaces(2).toString().replace(".", ",");
  return `${texto} ${valor.eq(1) ? "punto" : "puntos"}`;
}

export function describir(supuestos: SupuestosProyeccion): string {
  const bienio = `${formatearPuntos(supuestos.puntosPorBienio)} por bienio`;
  if (supuestos.capacitacionPromedioAnual.gt(0)) {
    return `Proyección con ${bienio} y ${formatearPuntos(supuestos.capacitacionPromedioAnual)} de capacitación por año (promedio de los últimos ${supuestos.periodosPromediados} ${supuestos.periodosPromediados === 1 ? "período" : "períodos"})`;
  }
  return `Proyección solo con bienios (${bienio}): sin capacitación aplicada en períodos anteriores`;
}
