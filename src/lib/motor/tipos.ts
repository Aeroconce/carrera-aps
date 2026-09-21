// Entradas del motor de carrera (doc 04): datos planos, sin dependencia de Prisma ni de la base.
// Las fechas son civiles ("AAAA-MM-DD") y los puntajes aceptan Decimal, number o string.

import type { FechaCivil } from "../fechas/civil";
import type { PuntajeEntrada } from "./puntaje";
import type { Categoria, TipoEstudio } from "./reglas";

/** Período de experiencia que cuenta para bienios (BT 4.2). */
export interface ExperienciaEntrada {
  id?: string;
  /** true = en esta institución; false = reconocida de otro servicio o centro de salud */
  esPropia: boolean;
  fechaDesde: FechaCivil;
  /** Último día trabajado; null = período vigente */
  fechaHasta: FechaCivil | null;
  jornadaHoras?: number | null;
  /** Fecha del acto que reconoce la experiencia externa. Sin ella, la externa no cuenta. */
  reconocidaEl?: FechaCivil | null;
}

/** Bienio ya registrado (importado o reconocido): un hecho que el motor respeta. */
export interface BienioRegistrado {
  id?: string;
  numero: number;
  fechaCumplido: FechaCivil;
  fechaReconocido: FechaCivil | null;
  decretoNumero?: string | null;
  puntaje: PuntajeEntrada;
  documentoId?: string | null;
}

/** Actividad de capacitación (BT 4.3). */
export interface CapacitacionEntrada {
  id?: string;
  nombre?: string;
  horas: number;
  fechaTermino: FechaCivil;
  aprobado: boolean;
  /** true si trae nota o evaluación (algunos reglamentos puntúan distinto) */
  conNota: boolean;
  /** Período al que se imputa (año calendario) */
  periodo: number;
  documentoId?: string | null;
}

/** Estudio reconocido (BT 4.4). */
export interface EstudioEntrada {
  id?: string;
  nombre?: string;
  tipo: TipoEstudio;
  /** Fecha del acto que lo reconoce; sin ella no puntúa */
  reconocidoEl: FechaCivil | null;
  documentoId?: string | null;
}

/** Nivel vigente en un tramo de tiempo (NivelHistorico). */
export interface NivelRegistrado {
  nivel: number;
  fechaDesde: FechaCivil;
  fechaHasta: FechaCivil | null;
}

/** Movimiento de apertura (doc 04 §0, doc 18): el saldo con que el funcionario entró al sistema. */
export interface AperturaEntrada {
  /** Puesta en marcha: desde aquí el motor acumula hacia adelante */
  fecha: FechaCivil;
  nivel: number;
  nivelDesde: FechaCivil;
  puntajeTotal: PuntajeEntrada;
  /** true si el Departamento entregó el desglose en experiencia y capacitación */
  desglosado: boolean;
  puntajeExperiencia?: PuntajeEntrada | null;
  puntajeCapacitacion?: PuntajeEntrada | null;
  /** Ancla del siguiente bienio; sin ella se usa la fecha de ingreso */
  fechaUltimoBienio?: FechaCivil | null;
  bieniosReconocidos?: number | null;
  /** Excedente de capacitación pendiente del período anterior a la apertura */
  excedentePendiente?: PuntajeEntrada | null;
}

export interface FuncionarioEntrada {
  id?: string;
  categoria: Categoria;
  fechaIngreso: FechaCivil;
  estado?: "ACTIVO" | "INACTIVO";
  apertura?: AperturaEntrada | null;
  experiencias: ExperienciaEntrada[];
  bienios: BienioRegistrado[];
  capacitaciones: CapacitacionEntrada[];
  estudios: EstudioEntrada[];
  niveles: NivelRegistrado[];
}
