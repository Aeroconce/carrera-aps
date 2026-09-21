// Catálogo de los nueve reportes de las bases (doc 06, BT 4.7) más el panel de alertas (subcriterio 13).
// Cada definición transforma las filas ya calculadas por el motor (estado a la fecha de corte) en secciones
// tabulares; no consulta la base. El reporte 8 (históricos) es cualquiera de los anteriores con "Situación al":
// aquí se materializa como el resumen de carrera con fecha por defecto al cierre del año anterior.

import { claveAlerta } from "@/lib/alertas/clave";
import type { FilaFuncionario } from "@/lib/carrera/listado";
import { desdeDate, finDeAnio, type FechaCivil } from "@/lib/fechas/civil";
import { formatearRut, nombreCompleto } from "@/lib/formato";
import type { ConjuntoReglas } from "@/lib/motor/reglas";
import type { CalificacionFuncionario, NotaMerito, ProcesoCalificacion } from "@/generated/prisma/client";
import { ETIQUETAS } from "./etiquetas";
import type { Celda, Columna, Fila, Seccion } from "./tipos";

export type CalificacionReporte = CalificacionFuncionario & { proceso: ProcesoCalificacion; notasMerito: NotaMerito[] };

export interface EntradaReporte {
  /** Funcionarios del alcance, vigentes a la fecha, con su estado de carrera calculado */
  filas: FilaFuncionario[];
  fechaCorte: FechaCivil;
  reglas: ConjuntoReglas;
  /** Calificaciones de esos funcionarios hasta la fecha (solo se cargan si el reporte las necesita) */
  calificaciones: CalificacionReporte[];
  /** Claves de alertas cerradas a mano (atendidas o descartadas) que el panel no debe volver a mostrar */
  alertasCerradas?: Set<string>;
}

export interface DefinicionReporte {
  id: string;
  numero: number;
  nombre: string;
  descripcion: string;
  archivo: string;
  necesitaCalificaciones?: boolean;
  /** Fecha de corte inicial cuando la URL no trae una (por defecto, hoy) */
  fechaPorDefecto?: (hoy: FechaCivil) => FechaCivil;
  /** Nota que explica el reporte en pantalla y en el pie del PDF */
  nota?: string;
  generar: (entrada: EntradaReporte) => Seccion[];
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const col = (clave: string, titulo: string, tipo: Columna["tipo"] = "texto", extra: Partial<Columna> = {}): Columna => ({ clave, titulo, tipo, ...extra });

const COLUMNAS_BASE: Columna[] = [
  col("rut", "RUT", "texto", { ancho: 14 }),
  col("nombre", "Nombre", "texto", { ancho: 32 }),
  col("categoria", "Categoría", "texto", { ancho: 10 }),
  col("establecimiento", "Establecimiento", "texto", { ancho: 26 }),
];

function base(fila: FilaFuncionario): Fila {
  const f = fila.funcionario;
  return { rut: formatearRut(f.rut), nombre: nombreCompleto(f), categoria: f.categoria, establecimiento: f.establecimiento.nombre };
}

function numero(valor: { toFixed(n: number): string } | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  return typeof valor === "number" ? Math.round(valor * 100) / 100 : Number(valor.toFixed(2));
}

function fecha(valor: Date | FechaCivil | null | undefined): Celda {
  if (!valor) return null;
  return valor instanceof Date ? desdeDate(valor) : valor;
}

function nivelVigente(fila: FilaFuncionario): number | null {
  if (fila.estado.sinInformacion) return null;
  return fila.estado.nivel.vigente ?? fila.estado.nivel.calculado;
}

// ---------------------------------------------------------------------------
// 1. Nómina
// ---------------------------------------------------------------------------

const nomina: DefinicionReporte = {
  id: "nomina",
  numero: 1,
  nombre: "Nómina de funcionarios",
  descripcion: "RUT, nombre, categoría, nivel, establecimiento, tipo de contrato, fecha de ingreso y estado de la dotación.",
  archivo: "nomina",
  generar: ({ filas }) => [
    {
      id: "nomina",
      titulo: "Nómina",
      columnas: [
        ...COLUMNAS_BASE.slice(0, 3),
        col("nivel", "Nivel", "entero", { ancho: 8 }),
        COLUMNAS_BASE[3]!,
        col("tipoContrato", "Tipo de contrato", "texto", { ancho: 16 }),
        col("fechaIngreso", "Fecha de ingreso", "fecha", { ancho: 16 }),
        col("cargo", "Cargo", "texto", { ancho: 22 }),
        col("jornada", "Jornada (h)", "entero", { ancho: 12 }),
        col("estado", "Estado", "texto", { ancho: 10 }),
      ],
      filas: filas.map((fila) => {
        const f = fila.funcionario;
        return {
          ...base(fila),
          nivel: nivelVigente(fila),
          tipoContrato: ETIQUETAS.contrato[f.tipoContrato],
          fechaIngreso: fecha(f.fechaIngreso),
          cargo: f.cargo ?? null,
          jornada: f.jornadaHoras ?? null,
          estado: fila.estado.activo ? ETIQUETAS.estadoFuncionario.ACTIVO : ETIQUETAS.estadoFuncionario.INACTIVO,
        };
      }),
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Resumen de carrera (también el reporte 8, a fecha)
// ---------------------------------------------------------------------------

function seccionResumenCarrera(filas: FilaFuncionario[]): Seccion {
  return {
    id: "carrera",
    titulo: "Resumen de carrera",
    columnas: [
      ...COLUMNAS_BASE,
      col("nivelVigente", "Nivel vigente", "entero", { ancho: 12 }),
      col("nivelDesde", "Desde", "fecha", { ancho: 12 }),
      col("experiencia", "Experiencia", "decimal", { ancho: 12, sumar: true }),
      col("capacitacion", "Capacitación", "decimal", { ancho: 12, sumar: true }),
      col("estudios", "Estudios", "decimal", { ancho: 10, sumar: true }),
      col("otrosApertura", "Otros (apertura)", "decimal", { ancho: 14, sumar: true }),
      col("saldoSinDesglose", "Saldo sin desglose", "decimal", { ancho: 16, sumar: true }),
      col("total", "Puntaje total", "decimal", { ancho: 12, sumar: true }),
      col("bienios", "Bienios", "entero", { ancho: 9 }),
      col("nivelCalculado", "Nivel calculado", "entero", { ancho: 14 }),
      col("cumpleAscenso", "Cumple ascenso", "booleano", { ancho: 14 }),
      col("proximoBienio", "Próximo bienio", "fecha", { ancho: 14 }),
    ],
    filas: filas.map((fila) => {
      const { estado } = fila;
      if (estado.sinInformacion) {
        return { ...base(fila), nivelVigente: null, nivelDesde: null, experiencia: null, capacitacion: null, estudios: null, otrosApertura: null, saldoSinDesglose: null, total: null, bienios: null, nivelCalculado: null, cumpleAscenso: null, proximoBienio: null };
      }
      return {
        ...base(fila),
        nivelVigente: estado.nivel.vigente ?? estado.nivel.calculado,
        nivelDesde: fecha(estado.nivel.vigenteDesde),
        experiencia: numero(estado.puntaje.experiencia),
        capacitacion: numero(estado.puntaje.capacitacion),
        estudios: numero(estado.puntaje.estudios),
        otrosApertura: numero(estado.puntaje.otrosApertura),
        saldoSinDesglose: numero(estado.puntaje.saldoAperturaSinDesglose),
        total: numero(estado.puntaje.total),
        bienios: estado.bienios.totalBienios,
        nivelCalculado: estado.nivel.calculado,
        cumpleAscenso: estado.nivel.cumpleAscenso,
        proximoBienio: fecha(estado.bienios.proximoBienio),
      };
    }),
  };
}

const carrera: DefinicionReporte = {
  id: "carrera",
  numero: 2,
  nombre: "Resumen de carrera funcionaria",
  descripcion: "Por funcionario: nivel vigente, puntaje total desglosado en experiencia, capacitación y estudios, bienios, nivel calculado y si cumple requisitos de ascenso.",
  archivo: "carrera",
  generar: ({ filas }) => [seccionResumenCarrera(filas)],
};

// ---------------------------------------------------------------------------
// 3. Experiencia y bienios
// ---------------------------------------------------------------------------

const experiencia: DefinicionReporte = {
  id: "experiencia",
  numero: 3,
  nombre: "Experiencia y bienios reconocidos",
  descripcion: "Períodos de experiencia propios y reconocidos, y los bienios con fecha cumplida, fecha de reconocimiento, decreto y puntaje.",
  archivo: "experiencia-bienios",
  generar: ({ filas, fechaCorte }) => [
    {
      id: "periodos",
      titulo: "Períodos de experiencia",
      columnas: [
        ...COLUMNAS_BASE.slice(0, 2),
        col("institucion", "Institución", "texto", { ancho: 30 }),
        col("tipo", "Tipo", "texto", { ancho: 12 }),
        col("desde", "Desde", "fecha", { ancho: 12 }),
        col("hasta", "Hasta", "fecha", { ancho: 12 }),
        col("jornada", "Jornada (h)", "entero", { ancho: 12 }),
        col("reconocidaEl", "Reconocida el", "fecha", { ancho: 14 }),
      ],
      filas: filas.flatMap((fila) =>
        fila.funcionario.experiencias
          .filter((e) => desdeDate(e.fechaDesde) <= fechaCorte)
          .map((e) => ({
            rut: formatearRut(fila.funcionario.rut),
            nombre: nombreCompleto(fila.funcionario),
            institucion: e.institucion,
            tipo: e.esPropia ? ETIQUETAS.experiencia.propia : ETIQUETAS.experiencia.reconocida,
            desde: fecha(e.fechaDesde),
            hasta: fecha(e.fechaHasta),
            jornada: e.jornadaHoras ?? null,
            reconocidaEl: e.esPropia ? null : fecha(e.reconocidaEl),
          })),
      ),
    },
    {
      id: "bienios",
      titulo: "Bienios",
      columnas: [
        ...COLUMNAS_BASE.slice(0, 2),
        col("numero", "N°", "entero", { ancho: 6 }),
        col("fechaCumplido", "Fecha cumplido", "fecha", { ancho: 14 }),
        col("fechaReconocido", "Fecha reconocido", "fecha", { ancho: 16 }),
        col("decreto", "Decreto", "texto", { ancho: 14 }),
        col("decretoFecha", "Fecha decreto", "fecha", { ancho: 14 }),
        col("puntaje", "Puntos", "decimal", { ancho: 9, sumar: true }),
        col("estado", "Estado", "texto", { ancho: 24 }),
      ],
      filas: filas.flatMap((fila) => {
        if (fila.estado.sinInformacion) return [];
        const registrados = new Map(fila.funcionario.bienios.map((b) => [b.numero, b]));
        return fila.estado.bienios.bienios.map((b) => {
          const registrado = registrados.get(b.numero);
          return {
            rut: formatearRut(fila.funcionario.rut),
            nombre: nombreCompleto(fila.funcionario),
            numero: b.numero,
            fechaCumplido: b.fechaCumplido,
            fechaReconocido: b.fechaReconocido,
            decreto: b.decretoNumero,
            decretoFecha: fecha(registrado?.decretoFecha),
            puntaje: b.incluidoEnApertura ? null : numero(b.puntaje),
            estado: b.incluidoEnApertura ? ETIQUETAS.bienioEstado.enSaldo : b.fechaReconocido ? ETIQUETAS.bienioEstado.reconocido : ETIQUETAS.bienioEstado.pendiente,
          };
        });
      }),
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Historial de capacitaciones
// ---------------------------------------------------------------------------

const capacitaciones: DefinicionReporte = {
  id: "capacitaciones",
  numero: 4,
  nombre: "Historial de capacitaciones",
  descripcion: "Actividades con horas, fechas, aprobación, período, puntaje calculado, aplicado y excedente, según la tabla vigente a cada fecha de término.",
  archivo: "capacitaciones",
  generar: ({ filas, fechaCorte }) => [
    {
      id: "capacitaciones",
      titulo: "Capacitaciones",
      columnas: [
        ...COLUMNAS_BASE.slice(0, 2),
        col("actividad", "Actividad", "texto", { ancho: 34 }),
        col("institucion", "Institución", "texto", { ancho: 26 }),
        col("tipo", "Tipo", "texto", { ancho: 11 }),
        col("horas", "Horas", "entero", { ancho: 8, sumar: true }),
        col("fechaInicio", "Inicio", "fecha", { ancho: 12 }),
        col("fechaTermino", "Término", "fecha", { ancho: 12 }),
        col("aprobado", "Aprobada", "booleano", { ancho: 10 }),
        col("periodo", "Período", "entero", { ancho: 9 }),
        col("calculado", "Calculado", "decimal", { ancho: 10, sumar: true }),
        col("aplicado", "Aplicado", "decimal", { ancho: 10, sumar: true }),
        col("excedente", "Excedente", "decimal", { ancho: 10, sumar: true }),
        col("enSaldo", "En saldo de apertura", "booleano", { ancho: 18 }),
      ],
      filas: filas.flatMap((fila) => {
        const calculadas = new Map(fila.estado.capacitacion.actividades.map((a) => [a.id, a]));
        const apertura = fila.estado.apertura;
        return fila.funcionario.capacitaciones
          .filter((c) => desdeDate(c.fechaTermino) <= fechaCorte)
          .map((c) => {
            const calc = calculadas.get(c.id);
            const enSaldo = apertura !== null && desdeDate(c.fechaTermino) <= apertura.fecha;
            const calculado = enSaldo ? null : numero(calc?.puntaje ?? c.puntajeCalculado);
            const aplicado = enSaldo ? null : numero(calc?.puntajeAplicado ?? c.puntajeAplicado);
            return {
              rut: formatearRut(fila.funcionario.rut),
              nombre: nombreCompleto(fila.funcionario),
              actividad: c.nombre,
              institucion: c.institucionDicta,
              tipo: ETIQUETAS.tipoCapacitacion[c.tipo],
              horas: c.horas,
              fechaInicio: fecha(c.fechaInicio),
              fechaTermino: fecha(c.fechaTermino),
              aprobado: c.aprobado,
              periodo: c.periodo,
              calculado,
              aplicado,
              excedente: calculado !== null && aplicado !== null ? Math.round((calculado - aplicado) * 100) / 100 : null,
              enSaldo,
            };
          });
      }),
    },
  ],
};

// ---------------------------------------------------------------------------
// 5. Cambios de nivel
// ---------------------------------------------------------------------------

const niveles: DefinicionReporte = {
  id: "niveles",
  numero: 5,
  nombre: "Cambios de nivel",
  descripcion: "Historial de niveles con fechas y decretos, y los ascensos pendientes: funcionarios que cumplen requisitos y aún no tienen decreto.",
  archivo: "cambios-de-nivel",
  generar: ({ filas, fechaCorte }) => [
    {
      id: "historial",
      titulo: "Historial de niveles",
      columnas: [
        ...COLUMNAS_BASE.slice(0, 3),
        col("nivel", "Nivel", "entero", { ancho: 8 }),
        col("desde", "Desde", "fecha", { ancho: 12 }),
        col("hasta", "Hasta", "fecha", { ancho: 12 }),
        col("motivo", "Motivo", "texto", { ancho: 14 }),
        col("decreto", "Decreto", "texto", { ancho: 14 }),
        col("decretoFecha", "Fecha decreto", "fecha", { ancho: 14 }),
        col("puntajeAlCambio", "Puntaje al cambio", "decimal", { ancho: 16 }),
      ],
      filas: filas.flatMap((fila) =>
        fila.funcionario.niveles
          .filter((n) => desdeDate(n.fechaDesde) <= fechaCorte)
          .map((n) => ({
            rut: formatearRut(fila.funcionario.rut),
            nombre: nombreCompleto(fila.funcionario),
            categoria: fila.funcionario.categoria,
            nivel: n.nivel,
            desde: fecha(n.fechaDesde),
            hasta: n.fechaHasta && desdeDate(n.fechaHasta) <= fechaCorte ? fecha(n.fechaHasta) : null,
            motivo: ETIQUETAS.motivoNivel[n.motivo],
            decreto: n.decretoNumero,
            decretoFecha: fecha(n.decretoFecha),
            puntajeAlCambio: numero(n.puntajeAlCambio),
          })),
      ),
    },
    {
      id: "pendientes",
      titulo: "Cumplen requisitos de ascenso sin decreto",
      columnas: [
        ...COLUMNAS_BASE,
        col("nivelVigente", "Nivel vigente", "entero", { ancho: 12 }),
        col("nivelCalculado", "Nivel calculado", "entero", { ancho: 14 }),
        col("puntajeTotal", "Puntaje total", "decimal", { ancho: 12 }),
        col("umbral", "Puntaje exigido", "decimal", { ancho: 14 }),
      ],
      filas: filas
        .filter((fila) => !fila.estado.sinInformacion && fila.estado.nivel.cumpleAscenso)
        .map((fila) => ({
          ...base(fila),
          nivelVigente: fila.estado.nivel.vigente,
          nivelCalculado: fila.estado.nivel.calculado,
          puntajeTotal: numero(fila.estado.puntaje.total),
          umbral: numero(fila.estado.nivel.umbralCalculado),
        })),
      nota: "El motor propone; el ascenso rige cuando se registra el decreto en la ficha.",
    },
  ],
};

// ---------------------------------------------------------------------------
// 6. Resultados de calificaciones
// ---------------------------------------------------------------------------

function filasCalificacion(entrada: EntradaReporte) {
  const porFuncionario = new Map(entrada.filas.map((f) => [f.funcionario.id, f]));
  return entrada.calificaciones
    .map((c) => ({ c, fila: porFuncionario.get(c.funcionarioId) }))
    .filter((x): x is { c: CalificacionReporte; fila: FilaFuncionario } => x.fila !== undefined)
    .sort((a, b) => b.c.proceso.periodoDesde.getTime() - a.c.proceso.periodoDesde.getTime() || Number(b.c.puntajeFinal) - Number(a.c.puntajeFinal));
}

const calificaciones: DefinicionReporte = {
  id: "calificaciones",
  numero: 6,
  nombre: "Resultados de calificaciones",
  descripcion: "Por proceso: puntaje final, lista y anotaciones de mérito y demérito de cada funcionario calificado.",
  archivo: "calificaciones",
  necesitaCalificaciones: true,
  generar: (entrada) => [
    {
      id: "calificaciones",
      titulo: "Calificaciones",
      columnas: [
        col("proceso", "Proceso", "texto", { ancho: 22 }),
        col("periodoDesde", "Período desde", "fecha", { ancho: 14 }),
        col("periodoHasta", "Período hasta", "fecha", { ancho: 14 }),
        ...COLUMNAS_BASE,
        col("puntajeFinal", "Puntaje final", "decimal", { ancho: 12 }),
        col("lista", "Lista", "texto", { ancho: 10 }),
        col("meritos", "Anotaciones de mérito", "entero", { ancho: 18 }),
        col("demeritos", "Anotaciones de demérito", "entero", { ancho: 20 }),
        col("observaciones", "Observaciones", "texto", { ancho: 36 }),
      ],
      filas: filasCalificacion(entrada).map(({ c, fila }) => ({
        proceso: c.proceso.nombre,
        periodoDesde: fecha(c.proceso.periodoDesde),
        periodoHasta: fecha(c.proceso.periodoHasta),
        ...base(fila),
        puntajeFinal: numero(c.puntajeFinal),
        lista: c.lista,
        meritos: c.notasMerito.filter((n) => n.tipo === "MERITO").length,
        demeritos: c.notasMerito.filter((n) => n.tipo === "DEMERITO").length,
        observaciones: c.observaciones,
      })),
      nota: entrada.calificaciones.length === 0 ? "Sin calificaciones registradas a la fecha para el alcance elegido." : undefined,
    },
  ],
};

// ---------------------------------------------------------------------------
// 7. Proyección de cambios de nivel
// ---------------------------------------------------------------------------

const proyeccion: DefinicionReporte = {
  id: "proyeccion",
  numero: 7,
  nombre: "Proyección de cambios de nivel",
  descripcion: "Nivel siguiente, puntaje faltante, fecha estimada y supuestos de la proyección de cada funcionario.",
  archivo: "proyeccion",
  generar: ({ filas }) => [
    {
      id: "proyeccion",
      titulo: "Proyección",
      columnas: [
        ...COLUMNAS_BASE,
        col("nivelVigente", "Nivel vigente", "entero", { ancho: 12 }),
        col("puntajeTotal", "Puntaje total", "decimal", { ancho: 12 }),
        col("nivelSiguiente", "Nivel siguiente", "entero", { ancho: 14 }),
        col("umbral", "Puntaje exigido", "decimal", { ancho: 14 }),
        col("faltante", "Puntaje faltante", "decimal", { ancho: 14 }),
        col("fechaEstimada", "Fecha estimada", "fecha", { ancho: 14 }),
        col("supuestos", "Supuestos", "texto", { ancho: 60 }),
      ],
      filas: filas.map((fila) => {
        const { estado } = fila;
        const p = estado.proyeccion;
        return {
          ...base(fila),
          nivelVigente: nivelVigente(fila),
          puntajeTotal: estado.sinInformacion ? null : numero(estado.puntaje.total),
          nivelSiguiente: p?.nivelSiguiente ?? null,
          umbral: numero(p?.umbral),
          faltante: numero(p?.puntajeFaltante),
          fechaEstimada: p?.fechaEstimada ?? null,
          supuestos: p ? p.descripcion : estado.sinInformacion ? null : estado.nivel.siguiente ? null : ETIQUETAS.nivelMaximo,
        };
      }),
    },
  ],
};

// ---------------------------------------------------------------------------
// 8. Históricos a fecha (resumen de carrera con "Situación al")
// ---------------------------------------------------------------------------

const historico: DefinicionReporte = {
  id: "historico",
  numero: 8,
  nombre: "Reportes históricos a fechas determinadas",
  descripcion: "Cualquier reporte recalculado a una fecha pasada con las reglas vigentes entonces. Este muestra el resumen de carrera; el selector \"Situación al\" está en todos los demás.",
  archivo: "historico-carrera",
  fechaPorDefecto: (hoy) => finDeAnio(Number(hoy.slice(0, 4)) - 1),
  nota: "Los hechos posteriores a la fecha elegida se ignoran; los puntajes se calculan con las reglas vigentes a esa fecha.",
  generar: ({ filas }) => [seccionResumenCarrera(filas)],
};

// ---------------------------------------------------------------------------
// 9. Nómina con asignación de mérito
// ---------------------------------------------------------------------------

const merito: DefinicionReporte = {
  id: "merito",
  numero: 9,
  nombre: "Nómina con asignación de mérito",
  descripcion: "Funcionarios con derecho a la asignación de mérito según la lista obtenida en cada proceso de calificación, por categoría.",
  archivo: "asignacion-de-merito",
  necesitaCalificaciones: true,
  generar: (entrada) => {
    const filas = filasCalificacion(entrada)
      .map(({ c, fila }) => {
        const regla = entrada.reglas.parametrosOpcionales("CALIFICACION", desdeDate(c.proceso.periodoHasta), fila.funcionario.categoria);
        const conMerito = regla !== null && c.lista !== null && c.lista === regla.listaConMerito;
        return { c, fila, conMerito };
      })
      .filter((x) => x.conMerito)
      .sort((a, b) => a.c.proceso.nombre.localeCompare(b.c.proceso.nombre) || a.fila.funcionario.categoria.localeCompare(b.fila.funcionario.categoria) || Number(b.c.puntajeFinal) - Number(a.c.puntajeFinal));
    return [
      {
        id: "merito",
        titulo: "Asignación de mérito",
        columnas: [
          col("proceso", "Proceso", "texto", { ancho: 22 }),
          col("categoria", "Categoría", "texto", { ancho: 10 }),
          col("rut", "RUT", "texto", { ancho: 14 }),
          col("nombre", "Nombre", "texto", { ancho: 32 }),
          col("establecimiento", "Establecimiento", "texto", { ancho: 26 }),
          col("puntajeFinal", "Puntaje final", "decimal", { ancho: 12 }),
          col("lista", "Lista", "texto", { ancho: 10 }),
        ],
        filas: filas.map(({ c, fila }) => ({ proceso: c.proceso.nombre, ...base(fila), puntajeFinal: numero(c.puntajeFinal), lista: c.lista })),
        nota: filas.length === 0 ? "Ningún funcionario del alcance tiene la lista que otorga la asignación de mérito a la fecha." : undefined,
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Panel de alertas (subcriterio 13): la misma vista del módulo Alertas, dentro de Reportes
// ---------------------------------------------------------------------------

const alertas: DefinicionReporte = {
  id: "alertas",
  numero: 0,
  nombre: "Panel de alertas",
  descripcion: "Alertas automáticas activas a la fecha: bienios próximos y sin reconocer, niveles alcanzados o próximos, cierres de período y documentos faltantes.",
  archivo: "alertas",
  generar: ({ filas, alertasCerradas }) => [
    {
      id: "alertas",
      titulo: "Alertas",
      columnas: [
        ...COLUMNAS_BASE,
        col("tipo", "Tipo", "texto", { ancho: 22 }),
        col("fechaHito", "Fecha del hito", "fecha", { ancho: 14 }),
        col("mensaje", "Detalle", "texto", { ancho: 60 }),
      ],
      filas: filas.flatMap((fila) =>
        fila.alertas
          .filter((a) => !alertasCerradas?.has(`${claveAlerta(fila.funcionario.id, a.tipo, a.fechaHito)}|${a.mensaje}`))
          .map((a) => ({ ...base(fila), tipo: ETIQUETAS.tipoAlerta[a.tipo], fechaHito: a.fechaHito, mensaje: a.mensaje })),
      ),
    },
  ],
};

export const DEFINICIONES: readonly DefinicionReporte[] = [nomina, carrera, experiencia, capacitaciones, niveles, calificaciones, proyeccion, historico, merito, alertas];

export function definicionDe(id: string): DefinicionReporte | null {
  return DEFINICIONES.find((d) => d.id === id) ?? null;
}
