// Capacitación (doc 04 §2, subcriterio 5): puntos por actividad según la tabla vigente a su fecha de
// término, tope por período y arrastre de excedentes.
//
// Por período, en orden:
// 1. Los puntos propios del período llenan el tope primero.
// 2. Luego entran los arrastres de períodos anteriores, del más antiguo al más nuevo, hasta completar el tope.
// 3. Lo propio que no cabe se convierte en excedente con origen en este período. El arrastre que no cabe
//    sigue viajando con su período de origen y caduca al cierre del último período permitido
//    (ARRASTRE_EXCEDENTE.periodosMaximos), como en el ejemplo 4 del doc 14.
// Las reglas de tope y arrastre se resuelven a la fecha de cierre de cada período: un cambio normativo
// entre 2024 y 2025 hace que cada período use su propio tope.
// Con apertura (doc 04 §0): los períodos se calculan desde el de la apertura, las actividades anteriores no se
// puntúan de nuevo (ya están en el saldo) y el excedente pendiente de la planilla entra como arrastre.

import { finDeAnio, sumarDias, type FechaCivil } from "../fechas/civil";
import { periodoDe } from "./bienios";
import { CERO, minimo, puntos, sumarPuntos, type Decimal } from "./puntaje";
import type { Categoria, ConjuntoReglas } from "./reglas";
import type { AperturaEntrada, CapacitacionEntrada } from "./tipos";

export interface ActividadCalculada {
  id?: string;
  nombre?: string;
  periodo: number;
  horas: number;
  aprobado: boolean;
  documentoId: string | null;
  puntaje: Decimal;
  reglaId: string;
}

export interface PeriodoCapacitacion {
  periodo: number;
  /** Suma de los puntos de las actividades del período */
  calculado: Decimal;
  /** Arrastre de períodos anteriores que sí entró en este período */
  arrastreRecibido: Decimal;
  tope: Decimal;
  /** Lo que entró: propios más arrastre, hasta el tope */
  aplicado: Decimal;
  /** Propio que no cupo y pasa al período siguiente */
  excedenteGenerado: Decimal;
  /** Arrastre que caducó al cierre de este período sin poder aplicarse */
  caducado: Decimal;
}

/** Un tramo de viaje de un excedente: de su período de origen a un período de destino. */
export interface ExcedenteCalculado {
  periodoOrigen: number;
  periodoDestino: number;
  puntaje: Decimal;
  /** Fecha en que caducó sin aplicarse, si corresponde */
  caducadoEl: FechaCivil | null;
}

export interface ResultadoCapacitacion {
  actividades: ActividadCalculada[];
  periodos: PeriodoCapacitacion[];
  excedentes: ExcedenteCalculado[];
  /** Parte de capacitación del saldo de apertura (0 si no hay apertura o no está desglosada) */
  puntajeApertura: Decimal;
  /** Suma de lo aplicado en los períodos calculados */
  puntajePosterior: Decimal;
  /** puntajeApertura + puntajePosterior */
  puntajeCapacitacion: Decimal;
}

interface ArrastreEnCurso {
  periodoOrigen: number;
  saldo: Decimal;
}

export function calcularCapacitacion(
  capacitaciones: CapacitacionEntrada[],
  fechaCorte: FechaCivil,
  reglas: ConjuntoReglas,
  categoria?: Categoria,
  aperturaEntrada?: AperturaEntrada | null,
): ResultadoCapacitacion {
  const apertura = aperturaEntrada && aperturaEntrada.fecha <= fechaCorte ? aperturaEntrada : null;
  const vigentes = capacitaciones.filter(
    (c) => c.fechaTermino <= fechaCorte && (apertura === null || c.fechaTermino > apertura.fecha),
  );
  const actividades = vigentes.map((c) => puntuarActividad(c, reglas, categoria));

  // Con apertura, el primer período calculado es el que sigue al día de los saldos (31/12/2024 → 2025)
  const periodoCorte = periodoDe(fechaCorte);
  const primerPeriodo = apertura
    ? Math.min(periodoDe(sumarDias(apertura.fecha, 1)), periodoCorte)
    : actividades.reduce((min, a) => Math.min(min, a.periodo), periodoCorte);

  const periodos: PeriodoCapacitacion[] = [];
  const excedentes: ExcedenteCalculado[] = [];
  let arrastres: ArrastreEnCurso[] = [];
  const pendiente = apertura?.excedentePendiente != null ? puntos(apertura.excedentePendiente) : CERO;
  if (pendiente.gt(0)) {
    arrastres.push({ periodoOrigen: primerPeriodo - 1, saldo: pendiente });
    excedentes.push({ periodoOrigen: primerPeriodo - 1, periodoDestino: primerPeriodo, puntaje: pendiente, caducadoEl: null });
  }

  for (let periodo = primerPeriodo; periodo <= periodoCorte; periodo++) {
    const cierre = finDeAnio(periodo);
    const tope = puntos(reglas.vigente("TOPE_CAPACITACION_ANUAL", cierre, categoria).parametros.tope);
    const arrastreRegla = reglas.parametrosODefecto("ARRASTRE_EXCEDENTE", cierre, categoria);

    const calculado = sumarPuntos(actividades.filter((a) => a.periodo === periodo).map((a) => a.puntaje));
    const aplicadoPropio = minimo(calculado, tope);
    let disponible = tope.minus(aplicadoPropio);
    let arrastreRecibido = CERO;
    let caducado = CERO;
    const siguientes: ArrastreEnCurso[] = [];

    for (const arrastre of [...arrastres].sort((a, b) => a.periodoOrigen - b.periodoOrigen)) {
      const entra = minimo(arrastre.saldo, disponible);
      arrastreRecibido = arrastreRecibido.plus(entra);
      disponible = disponible.minus(entra);
      const saldo = arrastre.saldo.minus(entra);
      if (saldo.lte(0)) continue;
      const vence = arrastreRegla.modo !== "integro" || periodo - arrastre.periodoOrigen >= arrastreRegla.periodosMaximos;
      if (vence) {
        caducado = caducado.plus(saldo);
        excedentes.push({ periodoOrigen: arrastre.periodoOrigen, periodoDestino: periodo, puntaje: saldo, caducadoEl: cierre });
      } else {
        siguientes.push({ periodoOrigen: arrastre.periodoOrigen, saldo });
        excedentes.push({ periodoOrigen: arrastre.periodoOrigen, periodoDestino: periodo + 1, puntaje: saldo, caducadoEl: null });
      }
    }

    const excedenteGenerado = calculado.minus(aplicadoPropio);
    if (excedenteGenerado.gt(0)) {
      if (arrastreRegla.modo === "integro") {
        siguientes.push({ periodoOrigen: periodo, saldo: excedenteGenerado });
        excedentes.push({ periodoOrigen: periodo, periodoDestino: periodo + 1, puntaje: excedenteGenerado, caducadoEl: null });
      } else {
        caducado = caducado.plus(excedenteGenerado);
        excedentes.push({ periodoOrigen: periodo, periodoDestino: periodo, puntaje: excedenteGenerado, caducadoEl: cierre });
      }
    }

    periodos.push({
      periodo,
      calculado,
      arrastreRecibido,
      tope,
      aplicado: aplicadoPropio.plus(arrastreRecibido),
      excedenteGenerado,
      caducado,
    });
    arrastres = siguientes;
  }

  const puntajeApertura = apertura?.desglosado && apertura.puntajeCapacitacion != null ? puntos(apertura.puntajeCapacitacion) : CERO;
  const puntajePosterior = sumarPuntos(periodos.map((p) => p.aplicado));

  return {
    actividades,
    periodos,
    excedentes,
    puntajeApertura,
    puntajePosterior,
    puntajeCapacitacion: puntajeApertura.plus(puntajePosterior),
  };
}

/** Puntos de una actividad según la tabla vigente a su fecha de término. */
export function puntuarActividad(actividad: CapacitacionEntrada, reglas: ConjuntoReglas, categoria?: Categoria): ActividadCalculada {
  const regla = reglas.vigente("TABLA_CAPACITACION", actividad.fechaTermino, categoria);
  const tabla = regla.parametros;
  let puntaje = CERO;
  if (actividad.aprobado || !tabla.requiereAprobacion) {
    const tramo = tabla.tramosHoras.find((t) => actividad.horas >= t.desde && (t.hasta === null || actividad.horas <= t.hasta));
    if (tramo) {
      const factor = actividad.conNota ? tabla.factorPorEvaluacion.conNota : tabla.factorPorEvaluacion.sinNota;
      puntaje = puntos(tramo.puntos).times(factor);
    }
  }
  return {
    id: actividad.id,
    nombre: actividad.nombre,
    periodo: actividad.periodo,
    horas: actividad.horas,
    aprobado: actividad.aprobado,
    documentoId: actividad.documentoId ?? null,
    puntaje,
    reglaId: regla.id,
  };
}
