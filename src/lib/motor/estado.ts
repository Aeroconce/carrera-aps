// Estado de carrera a una fecha (doc 04 §7, subcriterio 10): la misma función para "hoy" y para
// "situación al dd/mm/aaaa". Recibe el funcionario con su historial y el conjunto de reglas con todas sus
// versiones, e ignora todo hecho posterior a la fecha de corte. No guarda snapshots: se recalcula, por eso
// todo el motor es determinista y puro.
//
// Con apertura (doc 04 §0) el puntaje parte del saldo: si viene desglosado, cada componente suma sobre su
// parte; si no, el saldo se informa aparte como "saldo de apertura sin desglose" y el total lo incluye.

import type { FechaCivil } from "../fechas/civil";
import { calcularBienios, periodoDe, type ResultadoBienios } from "./bienios";
import { calcularCapacitacion, type ResultadoCapacitacion } from "./capacitacion";
import { calcularEstudios, type ResultadoEstudios } from "./estudios";
import { calcularNivel, type EstadoNivel } from "./niveles";
import { proyectarAscenso, type OpcionesProyeccion, type Proyeccion } from "./proyeccion";
import { CERO, puntos, type Decimal } from "./puntaje";
import type { Categoria, ConjuntoReglas } from "./reglas";
import type { FuncionarioEntrada } from "./tipos";

export interface DesglosePuntaje {
  experiencia: Decimal;
  capacitacion: Decimal;
  estudios: Decimal;
  /** Parte del saldo de apertura desglosado que no es experiencia ni capacitación (estudios u otros) */
  otrosApertura: Decimal;
  /** Saldo de apertura cuando el Departamento no entregó desglose (0 en los demás casos) */
  saldoAperturaSinDesglose: Decimal;
  total: Decimal;
}

export interface EstadoCarrera {
  funcionarioId?: string;
  categoria: Categoria;
  fechaCorte: FechaCivil;
  periodoActual: number;
  /** true cuando la fecha de corte es anterior a la apertura: no hay información */
  sinInformacion: boolean;
  apertura: { fecha: FechaCivil; puntajeTotal: Decimal; desglosado: boolean } | null;
  bienios: ResultadoBienios;
  capacitacion: ResultadoCapacitacion;
  estudios: ResultadoEstudios;
  puntaje: DesglosePuntaje;
  nivel: EstadoNivel;
  proyeccion: Proyeccion | null;
}

export function calcularEstadoCarrera(
  funcionario: FuncionarioEntrada,
  fechaCorte: FechaCivil,
  reglas: ConjuntoReglas,
  opciones: OpcionesProyeccion = {},
): EstadoCarrera {
  const { categoria } = funcionario;
  const apertura = funcionario.apertura ?? null;

  if (apertura && apertura.fecha > fechaCorte) {
    return estadoSinInformacion(funcionario, fechaCorte, reglas);
  }

  const bienios = calcularBienios(funcionario, fechaCorte, reglas);
  const capacitacion = calcularCapacitacion(funcionario.capacitaciones, fechaCorte, reglas, categoria, apertura);
  const estudios = calcularEstudios(funcionario.estudios, categoria, fechaCorte, reglas, apertura);

  // Saldo de apertura: sin desglose va entero aparte; con desglose, lo que no es experiencia ni capacitación
  // (estudios u otros conceptos del reglamento anterior) se conserva como "otros de apertura"
  const saldoAperturaSinDesglose = apertura && !apertura.desglosado ? puntos(apertura.puntajeTotal) : CERO;
  const otrosApertura = apertura?.desglosado
    ? puntos(apertura.puntajeTotal).minus(bienios.puntajeApertura).minus(capacitacion.puntajeApertura)
    : CERO;
  const puntaje: DesglosePuntaje = {
    experiencia: bienios.puntajeExperiencia,
    capacitacion: capacitacion.puntajeCapacitacion,
    estudios: estudios.puntajeEstudios,
    otrosApertura,
    saldoAperturaSinDesglose,
    total: bienios.puntajeExperiencia
      .plus(capacitacion.puntajeCapacitacion)
      .plus(estudios.puntajeEstudios)
      .plus(otrosApertura)
      .plus(saldoAperturaSinDesglose),
  };

  // El nivel de apertura cuenta como nivel registrado si el historial no lo trae
  const niveles = funcionario.niveles.length > 0 || !apertura
    ? funcionario.niveles
    : [{ nivel: apertura.nivel, fechaDesde: apertura.nivelDesde, fechaHasta: null }];
  const nivel = calcularNivel(puntaje.total, categoria, niveles, fechaCorte, reglas);

  const proyeccion = proyectarAscenso(
    { puntajeTotal: puntaje.total, nivel, proximoBienio: bienios.proximoBienio, capacitacion, categoria, fechaCorte },
    reglas,
    opciones,
  );

  return {
    funcionarioId: funcionario.id,
    categoria,
    fechaCorte,
    periodoActual: periodoDe(fechaCorte),
    sinInformacion: false,
    apertura: apertura ? { fecha: apertura.fecha, puntajeTotal: puntos(apertura.puntajeTotal), desglosado: apertura.desglosado } : null,
    bienios,
    capacitacion,
    estudios,
    puntaje,
    nivel,
    proyeccion,
  };
}

function estadoSinInformacion(funcionario: FuncionarioEntrada, fechaCorte: FechaCivil, reglas: ConjuntoReglas): EstadoCarrera {
  const vacio = { categoria: funcionario.categoria, fechaIngreso: funcionario.fechaIngreso, experiencias: [], bienios: [] };
  const apertura = funcionario.apertura!;
  return {
    funcionarioId: funcionario.id,
    categoria: funcionario.categoria,
    fechaCorte,
    periodoActual: periodoDe(fechaCorte),
    sinInformacion: true,
    apertura: { fecha: apertura.fecha, puntajeTotal: puntos(apertura.puntajeTotal), desglosado: apertura.desglosado },
    bienios: { ...calcularBienios({ ...vacio, experiencias: [{ esPropia: true, fechaDesde: fechaCorte, fechaHasta: fechaCorte }] }, fechaCorte, reglas), proximoBienio: null },
    capacitacion: calcularCapacitacion([], fechaCorte, reglas, funcionario.categoria),
    estudios: calcularEstudios([], funcionario.categoria, fechaCorte, reglas),
    puntaje: { experiencia: CERO, capacitacion: CERO, estudios: CERO, otrosApertura: CERO, saldoAperturaSinDesglose: CERO, total: CERO },
    nivel: calcularNivel(CERO, funcionario.categoria, [], fechaCorte, reglas),
    proyeccion: null,
  };
}
