import { describe, expect, it } from "vitest";
import type { ResultadoCapacitacion } from "@/lib/motor/capacitacion";
import { calcularNivel } from "@/lib/motor/niveles";
import { proyectarAscenso } from "@/lib/motor/proyeccion";
import { CERO, puntos } from "@/lib/motor/puntaje";
import { ConjuntoReglas } from "@/lib/motor/reglas";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

const reglas = new ConjuntoReglas(REGLAS_DEMO);
const CORTE = "2026-09-25";

function capacitacionCon(aplicados: Record<number, number>): ResultadoCapacitacion {
  const periodos = Object.entries(aplicados).map(([periodo, aplicado]) => ({
    periodo: Number(periodo),
    calculado: puntos(aplicado),
    arrastreRecibido: CERO,
    tope: puntos(10),
    aplicado: puntos(aplicado),
    excedenteGenerado: CERO,
    caducado: CERO,
  }));
  const total = periodos.reduce((s, p) => s.plus(p.aplicado), CERO);
  return { actividades: [], periodos, excedentes: [], puntajeApertura: CERO, puntajePosterior: total, puntajeCapacitacion: total };
}

describe("proyectarAscenso", () => {
  it("ejemplo 1: faltan 11 puntos; con 6,67 por año y el bienio de marzo de 2028 cruza el umbral", () => {
    const total = puntos(129);
    const nivel = calcularNivel(total, "B", [{ nivel: 9, fechaDesde: "2026-03-01", fechaHasta: null }], CORTE, reglas);
    const p = proyectarAscenso(
      { puntajeTotal: total, nivel, proximoBienio: "2028-03-01", capacitacion: capacitacionCon({ 2023: 8, 2024: 6, 2025: 10, 2026: 4 }), categoria: "B", fechaCorte: CORTE },
      reglas,
    );
    expect(p).not.toBeNull();
    expect(p?.nivelSiguiente).toBe(8);
    expect(p?.puntajeFaltante.toNumber()).toBe(11);
    expect(p?.supuestos.capacitacionPromedioAnual.toDecimalPlaces(2).toNumber()).toBe(6.67);
    expect(p?.supuestos.periodosPromediados).toBe(3);
    expect(p?.fechaEstimada).toBe("2028-03-01");
    expect(p?.descripcion).toBe("Proyección con 10 puntos por bienio y 6,67 puntos de capacitación por año (promedio de los últimos 3 períodos)");
  });

  it("ejemplo 2: 1 punto, faltan 19; con 1 punto por año cruza los 20 con el segundo bienio, el 15/11/2029", () => {
    const total = puntos(1);
    const nivel = calcularNivel(total, "E", [{ nivel: 15, fechaDesde: "2025-11-15", fechaHasta: null }], CORTE, reglas);
    const p = proyectarAscenso(
      { puntajeTotal: total, nivel, proximoBienio: "2027-11-15", capacitacion: capacitacionCon({ 2026: 1 }), categoria: "E", fechaCorte: CORTE },
      reglas,
    );
    expect(p?.puntajeFaltante.toNumber()).toBe(19);
    expect(p?.supuestos.capacitacionPromedioAnual.toNumber()).toBe(1);
    expect(p?.fechaEstimada).toBe("2029-11-15");
    expect(p?.descripcion).toContain("1 punto de capacitación por año");
  });

  it("sin capacitación aplicada proyecta solo con bienios y lo dice", () => {
    const total = puntos(0);
    const nivel = calcularNivel(total, "E", [], CORTE, reglas);
    const p = proyectarAscenso(
      { puntajeTotal: total, nivel, proximoBienio: "2027-01-01", capacitacion: capacitacionCon({}), categoria: "E", fechaCorte: CORTE },
      reglas,
    );
    // Faltan 20 para el nivel 14: dos bienios de 10
    expect(p?.fechaEstimada).toBe("2029-01-01");
    expect(p?.descripcion).toBe("Proyección solo con bienios (10 puntos por bienio): sin capacitación aplicada en períodos anteriores");
  });

  it("sin bienios por venir ni capacitación no hay fecha estimada; en el nivel máximo no hay proyección", () => {
    const nivel = calcularNivel(puntos(5), "E", [], CORTE, reglas);
    const p = proyectarAscenso(
      { puntajeTotal: puntos(5), nivel, proximoBienio: null, capacitacion: capacitacionCon({}), categoria: "E", fechaCorte: CORTE },
      reglas,
    );
    expect(p?.fechaEstimada).toBeNull();
    const maximo = calcularNivel(puntos(300), "A", [], CORTE, reglas);
    expect(proyectarAscenso({ puntajeTotal: puntos(300), nivel: maximo, proximoBienio: "2027-01-01", capacitacion: capacitacionCon({}), categoria: "A", fechaCorte: CORTE }, reglas)).toBeNull();
  });
});
