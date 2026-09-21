// Reglas de demostración (doc 14): internamente consistentes y plausibles, NO son las de Lota.
// Las usan los tests del motor y el seed de la demo. Cuando llegue el reglamento comunal se reemplazan en
// Parámetros, sin tocar código.
//
// Diferencia declarada respecto del doc 14: la versión 1 rige aquí desde el 01/01/2015 y no desde el
// 01/01/2020, porque el dataset de demostración trae historia desde 2015 (capacitación importada del
// ejemplo 1) y el motor exige una regla vigente para cada hecho. El cambio de tope 8 → 10 el 01/01/2025,
// que es lo que demuestra el subcriterio 10, se mantiene igual.

import type { ReglaFila } from "../motor/reglas";

const V1_DESDE = "2015-01-01";
const V1_HASTA = "2024-12-31";
const V2_DESDE = "2025-01-01";
const FUENTE = "Parametrización de demostración (doc 14); reemplazar por el reglamento comunal";

function regla(id: string, tipo: ReglaFila["tipo"], vigenteDesde: string, vigenteHasta: string | null, parametros: unknown): ReglaFila {
  return { id, tipo, categoria: null, vigenteDesde, vigenteHasta, parametros, fuente: FUENTE };
}

const TABLA_CAPACITACION_DEMO = {
  tramosHoras: [
    { desde: 8, hasta: 19, puntos: 1 },
    { desde: 20, hasta: 39, puntos: 2 },
    { desde: 40, hasta: 79, puntos: 3 },
    { desde: 80, hasta: 159, puntos: 4 },
    { desde: 160, hasta: 199, puntos: 6 },
    { desde: 200, hasta: null, puntos: 8 },
  ],
  requiereAprobacion: true,
  factorPorEvaluacion: { conNota: 1, sinNota: 1 },
};

export const REGLAS_DEMO: readonly ReglaFila[] = [
  regla("demo-puntos-bienio", "PUNTOS_BIENIO", V1_DESDE, null, { puntos: 10 }),
  regla("demo-dias-bienio", "DIAS_BIENIO", V1_DESDE, null, { modo: "calendario" }),
  regla("demo-tabla-capacitacion", "TABLA_CAPACITACION", V1_DESDE, null, TABLA_CAPACITACION_DEMO),
  regla("demo-tope-v1", "TOPE_CAPACITACION_ANUAL", V1_DESDE, V1_HASTA, { tope: 8 }),
  regla("demo-tope-v2", "TOPE_CAPACITACION_ANUAL", V2_DESDE, null, { tope: 10 }),
  regla("demo-arrastre", "ARRASTRE_EXCEDENTE", V1_DESDE, null, { modo: "integro", periodosMaximos: 2 }),
  regla("demo-estudios", "PUNTAJE_ESTUDIOS", V1_DESDE, null, {
    categorias: ["A", "B"],
    puntos: { POSTITULO: 5, MAGISTER: 10, DOCTORADO: 15 },
  }),
  regla("demo-umbral-nivel", "UMBRAL_NIVEL", V1_DESDE, null, { modo: "lineal", puntosPorNivel: 20 }),
  regla("demo-niveles", "NIVELES", V1_DESDE, null, { nivelIngreso: 15, nivelMaximo: 1 }),
  regla("demo-periodo", "PERIODO", V1_DESDE, null, { modo: "anio-calendario" }),
  regla("demo-calificacion", "CALIFICACION", V1_DESDE, null, {
    escalaMinima: 1,
    escalaMaxima: 7,
    listas: [
      { nombre: "Lista 1", puntajeMinimo: 6 },
      { nombre: "Lista 2", puntajeMinimo: 5 },
      { nombre: "Lista 3", puntajeMinimo: 4 },
      { nombre: "Lista 4", puntajeMinimo: 1 },
    ],
    listaConMerito: "Lista 1",
  }),
  regla("demo-alertas", "ALERTAS", V1_DESDE, null, {
    diasAvisoBienio: 60,
    diasBienioSinReconocer: 30,
    puntosAvisoNivel: 15,
    diasAvisoCierrePeriodo: 60,
  }),
];
