// Puntaje final de una calificación (BT 4.6, doc 04 §8): promedio ponderado de las notas por factor; un factor
// con subfactores toma el promedio ponderado de sus subfactores. Módulo puro (sin Prisma): lo usan la capa de
// datos, el seed y el diálogo de calificación para calcular en vivo.

export interface FactorBase {
  id: string;
  nombre: string;
  padreId: string | null;
  ponderacion: number;
  orden: number;
}

export interface FactorConSubfactores extends FactorBase {
  subfactores: FactorBase[];
}

function porOrden(a: FactorBase, b: FactorBase): number {
  return a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es");
}

/** Factores principales con sus subfactores, en el orden de captura. Los huérfanos (padre inexistente) se ignoran. */
export function arbolFactores(factores: readonly FactorBase[]): FactorConSubfactores[] {
  const raices = factores.filter((f) => f.padreId === null).sort(porOrden);
  return raices.map((f) => ({ ...f, subfactores: factores.filter((s) => s.padreId === f.id).sort(porOrden) }));
}

/** Ítems que reciben nota: los subfactores de cada factor, o el factor mismo cuando no tiene subfactores. */
export function itemsCalificables(factores: readonly FactorBase[]): Array<{ factor: FactorConSubfactores; item: FactorBase }> {
  return arbolFactores(factores).flatMap((factor) => (factor.subfactores.length > 0 ? factor.subfactores : [factor]).map((item) => ({ factor, item })));
}

function promedioPonderado(valores: Array<{ nota: number | null; ponderacion: number }>): number | null {
  const conNota = valores.filter((v): v is { nota: number; ponderacion: number } => v.nota !== null);
  if (conNota.length !== valores.length || valores.length === 0) return null;
  const pesoTotal = conNota.reduce((s, v) => s + v.ponderacion, 0);
  if (pesoTotal <= 0) return null;
  return conNota.reduce((s, v) => s + v.nota * v.ponderacion, 0) / pesoTotal;
}

export interface ResultadoPuntaje {
  /** Con dos decimales; null mientras falte alguna nota. */
  puntajeFinal: number | null;
  porFactor: Array<{ factorId: string; nombre: string; ponderacion: number; nota: number | null }>;
  completo: boolean;
}

/** Notas por ítem ({ factorId: nota }) → nota de cada factor principal y puntaje final. */
export function calcularPuntajeFinal(factores: readonly FactorBase[], notas: Readonly<Record<string, number | null | undefined>>): ResultadoPuntaje {
  const porFactor = arbolFactores(factores).map((factor) => {
    const nota =
      factor.subfactores.length > 0
        ? promedioPonderado(factor.subfactores.map((s) => ({ nota: notas[s.id] ?? null, ponderacion: s.ponderacion })))
        : (notas[factor.id] ?? null);
    return { factorId: factor.id, nombre: factor.nombre, ponderacion: factor.ponderacion, nota };
  });
  const final = promedioPonderado(porFactor.map((f) => ({ nota: f.nota, ponderacion: f.ponderacion })));
  return { puntajeFinal: final === null ? null : Math.round(final * 100) / 100, porFactor, completo: final !== null };
}

/** Lista según la escala de listas (mayor puntaje mínimo primero); null si no hay listas o el puntaje no alcanza ninguna. */
export function listaPorPuntaje(listas: ReadonlyArray<{ nombre: string; puntajeMinimo: number }>, puntaje: number): string | null {
  const ordenadas = [...listas].sort((a, b) => b.puntajeMinimo - a.puntajeMinimo);
  return ordenadas.find((l) => puntaje >= l.puntajeMinimo)?.nombre ?? ordenadas[ordenadas.length - 1]?.nombre ?? null;
}
