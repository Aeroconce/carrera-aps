// Datos de la demo (docs 08, 14 y 18): institución de Lota con sus cuatro establecimientos reales y los cuatro
// casos resueltos del doc 14, expresados como llegan los datos reales: apertura al 31/12/2024 (saldo al cierre
// de 2024) y movimientos posteriores. Ningún funcionario real: nombres y RUT ficticios.

import { generarRutConDv } from "../../src/lib/rut";
import type { DatosApertura, DatosCapacitacion, DatosEstudio, DatosFuncionario } from "../../src/lib/db/carrera";

export const FECHA_APERTURA = "2024-12-31";
export const FUENTE_APERTURA = "Planilla de carga inicial de demostración (doc 14)";

export const INSTITUCION_DEMO = {
  nombre: "Departamento de Salud, I. Municipalidad de Lota",
  comuna: "Lota",
};

export const ESTABLECIMIENTOS_DEMO = [
  { clave: "cartes", nombre: "CESFAM Juan Cartes Arias", tipo: "CESFAM" },
  { clave: "lagos", nombre: "CESFAM Sergio Lagos Olave", tipo: "CESFAM" },
  { clave: "colcura", nombre: "CECOSF de Colcura", tipo: "CECOSF" },
  { clave: "das", nombre: "Departamento de Salud de Lota", tipo: "DIRECCION" },
] as const;

export type ClaveEstablecimiento = (typeof ESTABLECIMIENTOS_DEMO)[number]["clave"];

type SinInstitucion = Omit<DatosFuncionario, "institucionId" | "establecimientoId">;

export interface CasoDemo {
  clave: string;
  establecimiento: ClaveEstablecimiento;
  funcionario: SinInstitucion;
  apertura: DatosApertura | null;
  capacitaciones: DatosCapacitacion[];
  estudios: DatosEstudio[];
  experienciasExternas: Array<{ institucion: string; fechaDesde: string; fechaHasta: string; reconocidaEl: string }>;
  bieniosReconocidosDespues: Array<{ numero: number; fechaCumplido: string; fechaReconocido: string; decretoNumero: string; decretoFecha: string }>;
  cambiosDeNivel: Array<{ nivel: number; fechaDesde: string; puntajeAlCambio: number; decretoNumero: string; decretoFecha: string }>;
}

function curso(nombre: string, horas: number, fechaInicio: string, fechaTermino: string, tipo: DatosCapacitacion["tipo"] = "CURSO"): DatosCapacitacion {
  return {
    nombre,
    institucionDicta: "Servicio de Salud Concepción",
    tipo,
    horas,
    fechaInicio,
    fechaTermino,
    notaOEvaluacion: 6.5,
    aprobado: true,
    esOtraComuna: false,
    periodo: Number(fechaTermino.slice(0, 4)),
  };
}

export const CASOS_DEMO: CasoDemo[] = [
  {
    clave: "maria",
    establecimiento: "cartes",
    funcionario: {
      rut: generarRutConDv(12345678),
      nombres: "María Ignacia",
      apellidos: "Pérez Soto",
      categoria: "B",
      tipoContrato: "TITULAR",
      fechaIngreso: "2014-03-01",
      cargo: "Enfermera · Caso 1",
      jornadaHoras: 44,
      email: "maria.perez@demo.local",
      fechaNacimiento: "1986-07-12",
    },
    apertura: {
      fecha: FECHA_APERTURA,
      nivel: 10,
      nivelDesde: "2024-01-01",
      puntajeTotal: 105,
      desglosado: true,
      puntajeExperiencia: 50,
      puntajeCapacitacion: 50,
      fechaUltimoBienio: "2024-03-01",
      bieniosReconocidos: 5,
      fuente: FUENTE_APERTURA,
    },
    capacitaciones: [
      curso("Diplomado en gestión de atención primaria", 200, "2025-03-10", "2025-06-30", "DIPLOMADO"),
      curso("Curso de urgencias en APS", 40, "2025-09-01", "2025-09-30"),
      curso("Curso de salud digital", 40, "2026-05-04", "2026-05-30"),
    ],
    estudios: [
      { tipo: "POSTITULO", nombre: "Postítulo en salud familiar", institucion: "Universidad de Concepción", fechaObtencion: "2019-01-15", reconocidoEl: "2019-06-01", puntaje: 5 },
    ],
    experienciasExternas: [],
    bieniosReconocidosDespues: [
      { numero: 6, fechaCumplido: "2026-03-01", fechaReconocido: "2026-03-20", decretoNumero: "145", decretoFecha: "2026-03-20" },
    ],
    cambiosDeNivel: [{ nivel: 9, fechaDesde: "2026-03-01", puntajeAlCambio: 125, decretoNumero: "146", decretoFecha: "2026-03-20" }],
  },
  {
    clave: "juan",
    establecimiento: "das",
    funcionario: {
      rut: generarRutConDv(20111222),
      nombres: "Juan Andrés",
      apellidos: "Soto Rojas",
      categoria: "E",
      tipoContrato: "PLAZO_FIJO",
      fechaIngreso: "2025-11-15",
      cargo: "Administrativo · Caso 2",
      jornadaHoras: 44,
      email: "juan.soto@demo.local",
      fechaNacimiento: "1999-02-03",
    },
    apertura: null,
    capacitaciones: [curso("Curso de atención al usuario", 16, "2026-05-04", "2026-05-10")],
    estudios: [],
    experienciasExternas: [],
    bieniosReconocidosDespues: [],
    cambiosDeNivel: [],
  },
  {
    clave: "carmen",
    establecimiento: "lagos",
    funcionario: {
      rut: generarRutConDv(10222333),
      nombres: "Carmen Gloria",
      apellidos: "Riquelme Vidal",
      categoria: "A",
      tipoContrato: "TITULAR",
      fechaIngreso: "2008-06-01",
      cargo: "Médica · Caso 3",
      jornadaHoras: 44,
      email: "carmen.riquelme@demo.local",
      fechaNacimiento: "1978-11-20",
    },
    apertura: {
      fecha: FECHA_APERTURA,
      nivel: 4,
      nivelDesde: "2023-08-01",
      puntajeTotal: 210,
      desglosado: true,
      puntajeExperiencia: 90,
      puntajeCapacitacion: 110,
      fechaUltimoBienio: "2023-06-01",
      bieniosReconocidos: 9,
      fuente: FUENTE_APERTURA,
    },
    capacitaciones: [
      curso("Curso de actualización clínica", 40, "2025-04-01", "2025-04-30"),
      curso("Curso de gestión clínica", 80, "2026-03-02", "2026-03-31"),
      curso("Taller de RCP", 8, "2026-08-10", "2026-08-11"),
    ],
    estudios: [
      { tipo: "MAGISTER", nombre: "Magíster en salud pública", institucion: "Universidad de Chile", fechaObtencion: "2014-12-15", reconocidoEl: "2015-06-01", puntaje: 10 },
    ],
    experienciasExternas: [{ institucion: "Servicio de Salud Concepción", fechaDesde: "2005-06-01", fechaHasta: "2008-05-31", reconocidaEl: "2008-08-01" }],
    bieniosReconocidosDespues: [],
    cambiosDeNivel: [],
  },
  {
    clave: "pedro",
    establecimiento: "colcura",
    funcionario: {
      rut: generarRutConDv(15333444),
      nombres: "Pedro Antonio",
      apellidos: "Lagos Muñoz",
      categoria: "C",
      tipoContrato: "TITULAR",
      fechaIngreso: "2018-03-01",
      cargo: "TENS · Caso 4",
      jornadaHoras: 44,
      email: "pedro.lagos@demo.local",
      fechaNacimiento: "1991-05-30",
    },
    apertura: {
      fecha: FECHA_APERTURA,
      nivel: 12,
      nivelDesde: "2022-03-01",
      puntajeTotal: 70,
      desglosado: true,
      puntajeExperiencia: 30,
      puntajeCapacitacion: 40,
      fechaUltimoBienio: "2024-03-01",
      bieniosReconocidos: 3,
      excedentePendiente: 6,
      fuente: FUENTE_APERTURA,
    },
    capacitaciones: [
      curso("Diplomado en cuidados de enfermería", 200, "2025-03-03", "2025-06-30", "DIPLOMADO"),
      curso("Curso de vacunación", 40, "2025-09-01", "2025-09-30"),
      curso("Diplomado en salud comunitaria", 200, "2026-03-02", "2026-06-30", "DIPLOMADO"),
      curso("Curso de primeros auxilios", 40, "2026-09-01", "2026-09-30"),
    ],
    estudios: [],
    experienciasExternas: [],
    bieniosReconocidosDespues: [],
    cambiosDeNivel: [],
  },
];
