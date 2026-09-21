import { describe, expect, it } from "vitest";
import { calcularNivel, estructuraNiveles } from "@/lib/motor/niveles";
import { puntos } from "@/lib/motor/puntaje";
import { ConjuntoReglas, type ReglaFila } from "@/lib/motor/reglas";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

const reglas = new ConjuntoReglas(REGLAS_DEMO);
const CORTE = "2026-09-25";

describe("estructuraNiveles", () => {
  it("umbral lineal de demostración: nivel n requiere (15 − n) × 20", () => {
    const e = estructuraNiveles({ nivelIngreso: 15, nivelMaximo: 1 }, { modo: "lineal", puntosPorNivel: 20 });
    expect(e.progresion).toEqual([15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(e.umbralDe(15).toNumber()).toBe(0);
    expect(e.umbralDe(14).toNumber()).toBe(20);
    expect(e.umbralDe(9).toNumber()).toBe(120);
    expect(e.umbralDe(1).toNumber()).toBe(280);
  });

  it("acepta una tabla explícita y numeración ascendente", () => {
    const e = estructuraNiveles({ nivelIngreso: 1, nivelMaximo: 3 }, { modo: "tabla", umbrales: { "1": 0, "2": 50, "3": 120 } });
    expect(e.progresion).toEqual([1, 2, 3]);
    expect(e.umbralDe(3).toNumber()).toBe(120);
    expect(() => e.umbralDe(4)).toThrow("no define el umbral del nivel 4");
  });
});

describe("calcularNivel", () => {
  it("exactamente en el umbral alcanza el nivel; un punto bajo, no", () => {
    expect(calcularNivel(puntos(120), "B", [], CORTE, reglas).calculado).toBe(9);
    expect(calcularNivel(puntos(119), "B", [], CORTE, reglas).calculado).toBe(10);
    expect(calcularNivel(puntos(0), "B", [], CORTE, reglas).calculado).toBe(15);
  });

  it("nivel vigente distinto del calculado: cumple requisitos de ascenso", () => {
    const r = calcularNivel(puntos(125), "B", [{ nivel: 10, fechaDesde: "2024-01-01", fechaHasta: null }], CORTE, reglas);
    expect(r).toMatchObject({ vigente: 10, vigenteDesde: "2024-01-01", calculado: 9, cumpleAscenso: true });
    expect(r.siguiente).toMatchObject({ nivel: 8 });
    expect(r.siguiente?.umbral.toNumber()).toBe(140);
    expect(r.puntajeFaltante?.toNumber()).toBe(15);
  });

  it("nivel vigente igual al calculado: no cumple ascenso y el siguiente es el que sigue (ejemplo 1)", () => {
    const r = calcularNivel(puntos(129), "B", [{ nivel: 9, fechaDesde: "2026-03-01", fechaHasta: null }], CORTE, reglas);
    expect(r).toMatchObject({ vigente: 9, calculado: 9, cumpleAscenso: false });
    expect(r.puntajeFaltante?.toNumber()).toBe(11);
  });

  it("toma el nivel vigente a la fecha de corte, no el actual", () => {
    const niveles = [
      { nivel: 10, fechaDesde: "2024-01-01", fechaHasta: "2026-02-28" },
      { nivel: 9, fechaDesde: "2026-03-01", fechaHasta: null },
    ];
    expect(calcularNivel(puntos(105), "B", niveles, "2024-12-31", reglas).vigente).toBe(10);
    expect(calcularNivel(puntos(129), "B", niveles, CORTE, reglas).vigente).toBe(9);
  });

  it("sin nivel registrado no hay ascenso pendiente; en el nivel máximo no hay siguiente", () => {
    const sinRegistro = calcularNivel(puntos(125), "B", [], CORTE, reglas);
    expect(sinRegistro).toMatchObject({ vigente: null, calculado: 9, cumpleAscenso: false });
    const maximo = calcularNivel(puntos(300), "A", [{ nivel: 1, fechaDesde: "2020-01-01", fechaHasta: null }], CORTE, reglas);
    expect(maximo).toMatchObject({ calculado: 1, siguiente: null, puntajeFaltante: null });
  });

  it("usa la regla de umbrales vigente a la fecha de corte", () => {
    const filas: ReglaFila[] = [
      ...REGLAS_DEMO,
      { id: "umbral-v2", tipo: "UMBRAL_NIVEL", categoria: null, vigenteDesde: "2026-01-01", vigenteHasta: null, parametros: { modo: "lineal", puntosPorNivel: 25 }, fuente: "" },
    ];
    const conCambio = new ConjuntoReglas(filas);
    expect(calcularNivel(puntos(120), "B", [], "2025-12-31", conCambio).calculado).toBe(9);
    expect(calcularNivel(puntos(120), "B", [], "2026-01-01", conCambio).calculado).toBe(11);
  });
});
