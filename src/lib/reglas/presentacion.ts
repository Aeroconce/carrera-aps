// Presentación de las reglas de carrera en Parámetros (doc 05 §10, doc 12): etiquetas en español de cada
// parámetro, opciones de los modos y resumen legible de una versión. Módulo puro (sin Prisma): lo usan la
// página (servidor) y el formulario de nueva versión (cliente).

import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import type { TipoRegla } from "@/lib/motor/reglas";

export interface Opcion {
  valor: string;
  etiqueta: string;
}

/** Modos de las reglas que admiten variantes (uniones discriminadas del esquema). */
export const OPCIONES_MODO = {
  DIAS_BIENIO: [
    { valor: "calendario", etiqueta: "Dos años calendario exactos" },
    { valor: "dias", etiqueta: "Una cantidad fija de días de servicio" },
  ],
  ARRASTRE_EXCEDENTE: [
    { valor: "integro", etiqueta: "Se arrastra íntegro a los períodos siguientes" },
    { valor: "ninguno", etiqueta: "No se arrastra: el excedente se pierde" },
  ],
  UMBRAL_NIVEL: [
    { valor: "lineal", etiqueta: "Lineal: cada nivel exige los mismos puntos adicionales" },
    { valor: "tabla", etiqueta: "Tabla: puntaje mínimo distinto por nivel" },
  ],
  PERIODO: [{ valor: "anio-calendario", etiqueta: "Año calendario (1 de enero a 31 de diciembre)" }],
} as const satisfies Partial<Record<TipoRegla, readonly Opcion[]>>;

/** Etiquetas de los parámetros, compartidas por el formulario y el resumen. */
export const ETIQUETAS_PARAMETRO = {
  modo: "Modo de cálculo",
  puntos: "Puntos por bienio",
  dias: "Días de servicio por bienio",
  activo: "Prorratear la experiencia por jornada parcial",
  jornadaCompleta: "Horas de la jornada completa",
  tramosHoras: "Tramos de horas",
  desde: "Desde (horas)",
  hasta: "Hasta (horas)",
  puntosTramo: "Puntos",
  requiereAprobacion: "Solo puntúan las actividades aprobadas",
  conNota: "Factor si la actividad tiene nota",
  sinNota: "Factor si no tiene nota",
  tope: "Tope anual (puntos)",
  periodosMaximos: "Períodos máximos de arrastre",
  categorias: "Categorías que suman puntaje por estudios",
  puntosEstudio: "Puntos por tipo de estudio",
  puntosPorNivel: "Puntos adicionales por nivel",
  umbrales: "Puntaje mínimo por nivel",
  nivel: "Nivel",
  nivelIngreso: "Nivel de ingreso",
  nivelMaximo: "Nivel máximo",
  escalaMinima: "Nota mínima de la escala",
  escalaMaxima: "Nota máxima de la escala",
  listas: "Listas según puntaje",
  nombreLista: "Nombre de la lista",
  puntajeMinimo: "Puntaje mínimo",
  listaConMerito: "Lista que otorga la asignación de mérito",
  diasAvisoBienio: "Aviso de bienio próximo (días antes)",
  diasBienioSinReconocer: "Bienio cumplido sin reconocer (días de espera)",
  puntosAvisoNivel: "Aviso de nivel próximo (puntos que faltan)",
  diasAvisoCierrePeriodo: "Aviso de cierre de período (días antes)",
} as const;

/** Ayudas cortas del formulario (doc 12: ayuda debajo del campo). */
export const AYUDAS_PARAMETRO = {
  hasta: "El último tramo puede quedar con «Hasta» vacío: no tiene límite superior.",
  factor: "1 = sin ajuste; 0,5 = la mitad de los puntos.",
  puntosEstudio: "Vacío: el estudio se registra como beneficio informativo, sin puntaje.",
  umbrales: "Niveles que no aparezcan en la tabla no tienen umbral.",
  listas: "Se asigna la lista de mayor puntaje mínimo que el funcionario alcance.",
} as const;

type Registro = Record<string, unknown>;
const esRegistro = (v: unknown): v is Registro => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown): string => (v === null || v === undefined ? "—" : typeof v === "number" ? formatearNumero(v) : String(v));
const etiquetaOpcion = (opciones: readonly Opcion[], valor: unknown) => opciones.find((o) => o.valor === valor)?.etiqueta ?? texto(valor);

export function formatearNumero(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n);
}

export interface FilaResumen {
  etiqueta: string;
  valor: string;
}

/** Una versión de regla como pares etiqueta → valor en lenguaje claro. Tolera parámetros de otra forma. */
export function resumenRegla(tipo: TipoRegla, parametros: unknown): FilaResumen[] {
  const p: Registro = esRegistro(parametros) ? parametros : {};
  const e = ETIQUETAS_PARAMETRO;
  switch (tipo) {
    case "PUNTOS_BIENIO":
      return [{ etiqueta: e.puntos, valor: texto(p.puntos) }];
    case "DIAS_BIENIO":
      return [
        { etiqueta: e.modo, valor: etiquetaOpcion(OPCIONES_MODO.DIAS_BIENIO, p.modo) },
        ...(p.modo === "dias" ? [{ etiqueta: e.dias, valor: texto(p.dias) }] : []),
      ];
    case "PRORRATEO_JORNADA":
      return [
        { etiqueta: e.activo, valor: p.activo ? "Sí" : "No" },
        { etiqueta: e.jornadaCompleta, valor: `${texto(p.jornadaCompleta)} h` },
      ];
    case "TABLA_CAPACITACION": {
      const tramos = Array.isArray(p.tramosHoras) ? (p.tramosHoras as Registro[]) : [];
      const factor = esRegistro(p.factorPorEvaluacion) ? p.factorPorEvaluacion : {};
      return [
        ...tramos.map((t) => ({
          etiqueta: t.hasta === null || t.hasta === undefined ? `${texto(t.desde)} h o más` : `${texto(t.desde)} a ${texto(t.hasta)} h`,
          valor: `${texto(t.puntos)} ${t.puntos === 1 ? "punto" : "puntos"}`,
        })),
        { etiqueta: e.requiereAprobacion, valor: p.requiereAprobacion ? "Sí" : "No" },
        { etiqueta: "Factor con nota / sin nota", valor: `${texto(factor.conNota)} / ${texto(factor.sinNota)}` },
      ];
    }
    case "TOPE_CAPACITACION_ANUAL":
      return [{ etiqueta: e.tope, valor: texto(p.tope) }];
    case "ARRASTRE_EXCEDENTE":
      return [
        { etiqueta: e.modo, valor: etiquetaOpcion(OPCIONES_MODO.ARRASTRE_EXCEDENTE, p.modo) },
        ...(p.modo === "integro" ? [{ etiqueta: e.periodosMaximos, valor: texto(p.periodosMaximos) }] : []),
      ];
    case "PUNTAJE_ESTUDIOS": {
      const categorias = Array.isArray(p.categorias) ? p.categorias.map(String) : [];
      const puntos = esRegistro(p.puntos) ? p.puntos : {};
      return [
        { etiqueta: e.categorias, valor: categorias.length ? categorias.join(", ") : "Ninguna" },
        ...Object.entries(puntos).map(([clave, valor]) => ({ etiqueta: ETIQUETAS.tipoEstudio[clave as keyof typeof ETIQUETAS.tipoEstudio] ?? clave, valor: `${texto(valor)} puntos` })),
      ];
    }
    case "UMBRAL_NIVEL": {
      if (p.modo === "tabla") {
        const umbrales = esRegistro(p.umbrales) ? p.umbrales : {};
        return [
          { etiqueta: e.modo, valor: etiquetaOpcion(OPCIONES_MODO.UMBRAL_NIVEL, p.modo) },
          ...Object.entries(umbrales)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([nivel, puntos]) => ({ etiqueta: `Nivel ${nivel}`, valor: `${texto(puntos)} puntos` })),
        ];
      }
      return [
        { etiqueta: e.modo, valor: etiquetaOpcion(OPCIONES_MODO.UMBRAL_NIVEL, p.modo) },
        { etiqueta: e.puntosPorNivel, valor: texto(p.puntosPorNivel) },
      ];
    }
    case "NIVELES":
      return [
        { etiqueta: e.nivelIngreso, valor: texto(p.nivelIngreso) },
        { etiqueta: e.nivelMaximo, valor: texto(p.nivelMaximo) },
      ];
    case "PERIODO":
      return [{ etiqueta: e.modo, valor: etiquetaOpcion(OPCIONES_MODO.PERIODO, p.modo) }];
    case "CALIFICACION": {
      const listas = Array.isArray(p.listas) ? (p.listas as Registro[]) : [];
      return [
        { etiqueta: "Escala", valor: `${texto(p.escalaMinima)} a ${texto(p.escalaMaxima)}` },
        ...listas.map((l) => ({ etiqueta: texto(l.nombre), valor: `desde ${texto(l.puntajeMinimo)}` })),
        { etiqueta: e.listaConMerito, valor: texto(p.listaConMerito) },
      ];
    }
    case "ALERTAS":
      return [
        { etiqueta: e.diasAvisoBienio, valor: texto(p.diasAvisoBienio) },
        { etiqueta: e.diasBienioSinReconocer, valor: texto(p.diasBienioSinReconocer) },
        { etiqueta: e.puntosAvisoNivel, valor: texto(p.puntosAvisoNivel) },
        { etiqueta: e.diasAvisoCierrePeriodo, valor: texto(p.diasAvisoCierrePeriodo) },
      ];
    default:
      return Object.entries(p).map(([clave, valor]) => ({ etiqueta: clave, valor: typeof valor === "object" ? JSON.stringify(valor) : texto(valor) }));
  }
}
