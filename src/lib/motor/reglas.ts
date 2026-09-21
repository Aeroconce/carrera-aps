// Reglas del reglamento comunal (doc 03 `ReglaCarrera`, doc 04, doc 14): forma de los parámetros de cada
// tipo y resolución de la versión vigente a una fecha.
//
// El motor nunca consulta reglas por su cuenta: recibe un ConjuntoReglas con TODAS las versiones y pide la
// vigente a la fecha de cada hecho (puntos del bienio a su fecha cumplida, tabla de capacitación a la fecha
// de término, tope por período, umbral a la fecha de corte). Por eso los reportes históricos "a fecha"
// salen del mismo cálculo y un cambio normativo nunca toca código.
//
// Una regla puede ser general (categoria null) o específica de una categoría; la específica manda.
// Si no hay regla vigente para un hecho, el motor falla con un mensaje claro: mejor un error visible que
// un puntaje calculado con una regla equivocada.

import { z } from "zod";
import { formatearChileno, type FechaCivil } from "../fechas/civil";

export const CATEGORIAS = ["A", "B", "C", "D", "E", "F"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export const categoriaSchema = z.enum(CATEGORIAS);

export const TIPOS_ESTUDIO = ["TITULO", "DIPLOMADO", "POSTITULO", "MAGISTER", "DOCTORADO"] as const;
export type TipoEstudio = (typeof TIPOS_ESTUDIO)[number];
export const tipoEstudioSchema = z.enum(TIPOS_ESTUDIO);

export const TIPOS_REGLA = [
  "PUNTOS_BIENIO",
  "DIAS_BIENIO",
  "PRORRATEO_JORNADA",
  "TABLA_CAPACITACION",
  "TOPE_CAPACITACION_ANUAL",
  "ARRASTRE_EXCEDENTE",
  "PUNTAJE_ESTUDIOS",
  "UMBRAL_NIVEL",
  "NIVELES",
  "PERIODO",
  "CALIFICACION",
  "ALERTAS",
] as const;
export type TipoRegla = (typeof TIPOS_REGLA)[number];

const puntosSchema = z.number().nonnegative();

/** Esquema de `ReglaCarrera.parametros` por tipo. Los valores concretos vienen del reglamento comunal. */
export const esquemasParametros = {
  /** Puntos que otorga cada bienio (por categoría si el reglamento diferencia). */
  PUNTOS_BIENIO: z.object({ puntos: puntosSchema }),

  /** Cómo se completa un bienio: dos años calendario exactos, o una cantidad fija de días de servicio. */
  DIAS_BIENIO: z.discriminatedUnion("modo", [
    z.object({ modo: z.literal("calendario") }),
    z.object({ modo: z.literal("dias"), dias: z.number().int().positive() }),
  ]),

  /** Prorrateo de la experiencia por jornada parcial (factor jornadaHoras / jornadaCompleta). */
  PRORRATEO_JORNADA: z.object({
    activo: z.boolean(),
    jornadaCompleta: z.number().int().positive(),
  }),

  /** Puntos por actividad aprobada según horas; opcionalmente un factor según tenga o no nota. */
  TABLA_CAPACITACION: z.object({
    tramosHoras: z
      .array(
        z.object({
          desde: z.number().int().nonnegative(),
          /** null = sin límite superior */
          hasta: z.number().int().positive().nullable(),
          puntos: puntosSchema,
        }),
      )
      .min(1),
    requiereAprobacion: z.boolean(),
    factorPorEvaluacion: z.object({ conNota: z.number().nonnegative(), sinNota: z.number().nonnegative() }),
  }),

  /** Máximo de puntos de capacitación que entran por período. */
  TOPE_CAPACITACION_ANUAL: z.object({ tope: puntosSchema }),

  /** Qué pasa con lo que excede el tope: se arrastra íntegro hasta N períodos y luego caduca, o no se arrastra. */
  ARRASTRE_EXCEDENTE: z.discriminatedUnion("modo", [
    z.object({ modo: z.literal("integro"), periodosMaximos: z.number().int().positive() }),
    z.object({ modo: z.literal("ninguno") }),
  ]),

  /** Puntos por reconocimiento de estudios, solo en las categorías indicadas. Tipos ausentes: beneficio informativo. */
  PUNTAJE_ESTUDIOS: z.object({
    categorias: z.array(categoriaSchema),
    puntos: z.partialRecord(tipoEstudioSchema, puntosSchema),
  }),

  /** Puntaje mínimo de cada nivel: lineal (cada nivel exige N puntos más que el anterior) o tabla explícita. */
  UMBRAL_NIVEL: z.discriminatedUnion("modo", [
    z.object({ modo: z.literal("lineal"), puntosPorNivel: z.number().positive() }),
    z.object({ modo: z.literal("tabla"), umbrales: z.record(z.string(), puntosSchema) }),
  ]),

  /** Estructura de niveles: cuál es el de ingreso y cuál el máximo (la dirección se deduce). */
  NIVELES: z.object({ nivelIngreso: z.number().int().positive(), nivelMaximo: z.number().int().positive() }),

  /** Cómo se cortan los períodos de capacitación. */
  PERIODO: z.object({ modo: z.literal("anio-calendario") }),

  /** Calificación: escala, listas por puntaje mínimo y lista que otorga la asignación de mérito. */
  CALIFICACION: z.object({
    escalaMinima: z.number(),
    escalaMaxima: z.number(),
    listas: z.array(z.object({ nombre: z.string().min(1), puntajeMinimo: z.number() })).min(1),
    listaConMerito: z.string().min(1),
  }),

  /** Umbrales de aviso de las alertas automáticas. */
  ALERTAS: z.object({
    diasAvisoBienio: z.number().int().nonnegative(),
    diasBienioSinReconocer: z.number().int().nonnegative(),
    puntosAvisoNivel: puntosSchema,
    diasAvisoCierrePeriodo: z.number().int().nonnegative(),
  }),
} satisfies Record<TipoRegla, z.ZodType>;

export type Parametros<T extends TipoRegla> = z.infer<(typeof esquemasParametros)[T]>;

/** Fila de regla tal como llega de la base (o de un fixture), con parámetros aún sin validar. */
export interface ReglaFila {
  id: string;
  tipo: TipoRegla;
  categoria: Categoria | null;
  vigenteDesde: FechaCivil;
  vigenteHasta: FechaCivil | null;
  parametros: unknown;
  fuente: string;
}

export interface ReglaResuelta<T extends TipoRegla> {
  id: string;
  tipo: T;
  categoria: Categoria | null;
  vigenteDesde: FechaCivil;
  vigenteHasta: FechaCivil | null;
  parametros: Parametros<T>;
  fuente: string;
}

export class ErrorSinRegla extends Error {
  constructor(
    public readonly tipo: TipoRegla,
    public readonly fecha: FechaCivil,
    public readonly categoria?: Categoria,
  ) {
    super(
      `No hay regla ${tipo} vigente al ${formatearChileno(fecha)}` +
        (categoria ? ` para la categoría ${categoria}` : "") +
        ". Registra la regla en Parámetros con su vigencia.",
    );
    this.name = "ErrorSinRegla";
  }
}

/** Valores por defecto de las reglas opcionales (doc 04): lo que rige si el reglamento no dice nada. */
const VALORES_POR_DEFECTO: { [T in "PRORRATEO_JORNADA" | "PERIODO" | "ALERTAS" | "ARRASTRE_EXCEDENTE"]: Parametros<T> } = {
  PRORRATEO_JORNADA: { activo: false, jornadaCompleta: 44 },
  PERIODO: { modo: "anio-calendario" },
  ALERTAS: { diasAvisoBienio: 60, diasBienioSinReconocer: 30, puntosAvisoNivel: 15, diasAvisoCierrePeriodo: 60 },
  ARRASTRE_EXCEDENTE: { modo: "ninguno" },
};

type TipoConDefecto = keyof typeof VALORES_POR_DEFECTO;

/** Todas las versiones de las reglas de una institución, validadas, con resolución por fecha y categoría. */
export class ConjuntoReglas {
  private readonly porTipo = new Map<TipoRegla, ReglaResuelta<TipoRegla>[]>();

  constructor(filas: readonly ReglaFila[]) {
    for (const fila of filas) {
      const esquema = esquemasParametros[fila.tipo];
      const resultado = esquema.safeParse(fila.parametros);
      if (!resultado.success) {
        throw new Error(
          `Parámetros inválidos en la regla ${fila.tipo} (${fila.id}): ${z.prettifyError(resultado.error)}`,
        );
      }
      const lista = this.porTipo.get(fila.tipo) ?? [];
      lista.push({ ...fila, parametros: resultado.data as Parametros<TipoRegla> });
      this.porTipo.set(fila.tipo, lista);
    }
  }

  /** Regla vigente a la fecha; la específica de la categoría manda sobre la general. Lanza si no hay. */
  vigente<T extends TipoRegla>(tipo: T, fecha: FechaCivil, categoria?: Categoria): ReglaResuelta<T> {
    const regla = this.buscar(tipo, fecha, categoria);
    if (!regla) throw new ErrorSinRegla(tipo, fecha, categoria);
    return regla;
  }

  /** Parámetros vigentes a la fecha, o el valor por defecto del doc 04 si el reglamento no fija la regla. */
  parametrosODefecto<T extends TipoConDefecto>(tipo: T, fecha: FechaCivil, categoria?: Categoria): Parametros<T> {
    const regla = this.buscar(tipo, fecha, categoria);
    return regla ? regla.parametros : VALORES_POR_DEFECTO[tipo];
  }

  /** Parámetros vigentes o null (para reglas que pueden no existir, como PUNTAJE_ESTUDIOS). */
  parametrosOpcionales<T extends TipoRegla>(tipo: T, fecha: FechaCivil, categoria?: Categoria): Parametros<T> | null {
    return this.buscar(tipo, fecha, categoria)?.parametros ?? null;
  }

  /** Fechas en que cambia alguna versión de un tipo de regla (para detectar cambios entre períodos). */
  vigenciasDe(tipo: TipoRegla): FechaCivil[] {
    return (this.porTipo.get(tipo) ?? []).map((r) => r.vigenteDesde).sort();
  }

  private buscar<T extends TipoRegla>(tipo: T, fecha: FechaCivil, categoria?: Categoria): ReglaResuelta<T> | null {
    const candidatas = (this.porTipo.get(tipo) ?? []).filter(
      (r) => r.vigenteDesde <= fecha && (r.vigenteHasta === null || fecha <= r.vigenteHasta),
    );
    const especifica = categoria ? candidatas.filter((r) => r.categoria === categoria) : [];
    const generales = candidatas.filter((r) => r.categoria === null);
    const elegida = masReciente(especifica) ?? masReciente(generales);
    return (elegida as ReglaResuelta<T> | undefined) ?? null;
  }
}

function masReciente<T extends TipoRegla>(reglas: ReglaResuelta<T>[]): ReglaResuelta<T> | undefined {
  return reglas.reduce<ReglaResuelta<T> | undefined>(
    (mejor, actual) => (!mejor || actual.vigenteDesde > mejor.vigenteDesde ? actual : mejor),
    undefined,
  );
}
