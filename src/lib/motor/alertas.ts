// Alertas automáticas (doc 04 §6, subcriterios 8 y 13), generadas a partir del estado de carrera.
// Cada alerta es idempotente por clave (funcionario + tipo + fecha del hito): el worker crea las que no
// existan y marca atendidas las que dejen de cumplirse. Los umbrales vienen de la regla ALERTAS.

import { diasEntre, finDeAnio, formatearChileno, sumarDias, type FechaCivil } from "../fechas/civil";
import type { EstadoCarrera } from "./estado";
import type { ConjuntoReglas } from "./reglas";

export type TipoAlertaCalculada =
  | "BIENIO_PROXIMO"
  | "BIENIO_PENDIENTE_RECONOCER"
  | "NIVEL_ALCANZADO"
  | "NIVEL_PROXIMO"
  | "CAPACITACION_POR_VENCER_PERIODO"
  | "CALIFICACION_PENDIENTE"
  | "DOCUMENTO_FALTANTE";

export interface AlertaCalculada {
  tipo: TipoAlertaCalculada;
  fechaHito: FechaCivil;
  mensaje: string;
  /** tipo + fecha del hito: identifica la alerta para no duplicarla */
  clave: string;
}

export interface ContextoAlertas {
  /** Proceso de calificación abierto sin calificación registrada para este funcionario */
  calificacionPendiente?: { fechaCierre: FechaCivil } | null;
}

function alerta(tipo: TipoAlertaCalculada, fechaHito: FechaCivil, mensaje: string): AlertaCalculada {
  return { tipo, fechaHito, mensaje, clave: `${tipo}:${fechaHito}` };
}

function formatearPuntos(valor: { toDecimalPlaces(n: number): { toString(): string } }): string {
  return valor.toDecimalPlaces(2).toString().replace(".", ",");
}

export function generarAlertas(estado: EstadoCarrera, reglas: ConjuntoReglas, contexto: ContextoAlertas = {}): AlertaCalculada[] {
  if (estado.sinInformacion) return [];
  const { fechaCorte, categoria } = estado;
  const umbrales = reglas.parametrosODefecto("ALERTAS", fechaCorte, categoria);
  const alertas: AlertaCalculada[] = [];

  // Bienio próximo
  const proximo = estado.bienios.proximoBienio;
  if (proximo !== null && diasEntre(fechaCorte, proximo) <= umbrales.diasAvisoBienio) {
    alertas.push(alerta("BIENIO_PROXIMO", proximo, `Cumple su próximo bienio el ${formatearChileno(proximo)}`));
  }

  // Bienios cumplidos sin reconocer hace más de N días
  for (const b of estado.bienios.bienios) {
    if (b.fechaReconocido !== null || b.incluidoEnApertura) continue;
    if (diasEntre(b.fechaCumplido, fechaCorte) > umbrales.diasBienioSinReconocer) {
      alertas.push(
        alerta("BIENIO_PENDIENTE_RECONOCER", b.fechaCumplido, `Bienio ${b.numero} cumplido el ${formatearChileno(b.fechaCumplido)} sin decreto de reconocimiento`),
      );
    }
  }

  // Nivel alcanzado o próximo
  if (estado.nivel.cumpleAscenso) {
    alertas.push(alerta("NIVEL_ALCANZADO", fechaCorte, `Cumple requisitos para el nivel ${estado.nivel.calculado} y su nivel vigente sigue en ${estado.nivel.vigente}`));
  } else if (estado.nivel.puntajeFaltante !== null && estado.nivel.siguiente && estado.nivel.puntajeFaltante.gt(0) && estado.nivel.puntajeFaltante.lte(umbrales.puntosAvisoNivel)) {
    alertas.push(alerta("NIVEL_PROXIMO", fechaCorte, `Le faltan ${formatearPuntos(estado.nivel.puntajeFaltante)} puntos para el nivel ${estado.nivel.siguiente.nivel}`));
  }

  // Cierre de período con tope de capacitación sin completar (informativa)
  const cierre = finDeAnio(estado.periodoActual);
  const periodo = estado.capacitacion.periodos.find((p) => p.periodo === estado.periodoActual);
  if (periodo && diasEntre(fechaCorte, cierre) <= umbrales.diasAvisoCierrePeriodo && periodo.aplicado.lt(periodo.tope)) {
    alertas.push(
      alerta("CAPACITACION_POR_VENCER_PERIODO", cierre, `El período ${estado.periodoActual} cierra el ${formatearChileno(cierre)} con ${formatearPuntos(periodo.aplicado)} de ${formatearPuntos(periodo.tope)} puntos de capacitación`),
    );
  }

  // Calificación pendiente
  if (contexto.calificacionPendiente) {
    alertas.push(alerta("CALIFICACION_PENDIENTE", contexto.calificacionPendiente.fechaCierre, "Proceso de calificación abierto sin calificación registrada"));
  }

  // Documentos de respaldo faltantes (posteriores a la apertura)
  for (const b of estado.bienios.bienios) {
    if (!b.incluidoEnApertura && b.fechaReconocido !== null && b.documentoId === null) {
      alertas.push(alerta("DOCUMENTO_FALTANTE", b.fechaCumplido, `Bienio ${b.numero} reconocido sin decreto adjunto`));
    }
  }
  for (const a of estado.capacitacion.actividades) {
    if (a.documentoId === null) {
      const hito = sumarDias(finDeAnio(a.periodo), 0);
      alertas.push(alerta("DOCUMENTO_FALTANTE", hito, `Capacitación "${a.nombre ?? `${a.horas} horas`}" (${a.periodo}) sin certificado adjunto`));
    }
  }
  for (const e of estado.estudios.estudios) {
    if (!e.incluidoEnApertura && e.reconocidoEl !== null && e.documentoId === null) {
      alertas.push(alerta("DOCUMENTO_FALTANTE", e.reconocidoEl, `Estudio "${e.nombre ?? e.tipo}" reconocido sin documento adjunto`));
    }
  }

  // Claves únicas: si dos documentos faltantes comparten fecha, se agrupa en un mensaje
  const porClave = new Map<string, AlertaCalculada>();
  for (const a of alertas) {
    const previa = porClave.get(a.clave);
    porClave.set(a.clave, previa ? { ...previa, mensaje: `${previa.mensaje}; ${a.mensaje}` } : a);
  }
  return [...porClave.values()];
}
