// Puntaje final por factores y subfactores (BT 4.6): promedio ponderado en dos niveles, notas faltantes y listas.

import { describe, expect, it } from "vitest";
import { arbolFactores, calcularPuntajeFinal, itemsCalificables, listaPorPuntaje, type FactorBase } from "@/lib/calificaciones/puntaje";

const FACTORES: FactorBase[] = [
  { id: "rend", nombre: "Rendimiento", padreId: null, ponderacion: 40, orden: 0 },
  { id: "rend-cant", nombre: "Cantidad de trabajo", padreId: "rend", ponderacion: 50, orden: 0 },
  { id: "rend-cal", nombre: "Calidad del trabajo", padreId: "rend", ponderacion: 50, orden: 1 },
  { id: "cond", nombre: "Condiciones personales", padreId: null, ponderacion: 30, orden: 1 },
  { id: "comp", nombre: "Comportamiento funcionario", padreId: null, ponderacion: 30, orden: 2 },
];

const LISTAS = [
  { nombre: "Lista 1", puntajeMinimo: 6 },
  { nombre: "Lista 2", puntajeMinimo: 5 },
  { nombre: "Lista 3", puntajeMinimo: 4 },
  { nombre: "Lista 4", puntajeMinimo: 1 },
];

describe("arbolFactores e itemsCalificables", () => {
  it("agrupa subfactores bajo su factor y califica subfactores o el factor sin hijos", () => {
    const arbol = arbolFactores(FACTORES);
    expect(arbol.map((f) => f.id)).toEqual(["rend", "cond", "comp"]);
    expect(arbol[0]!.subfactores.map((s) => s.id)).toEqual(["rend-cant", "rend-cal"]);
    expect(itemsCalificables(FACTORES).map((x) => x.item.id)).toEqual(["rend-cant", "rend-cal", "cond", "comp"]);
  });
});

describe("calcularPuntajeFinal", () => {
  it("pondera en dos niveles: subfactores dentro del factor y factores en el total", () => {
    const r = calcularPuntajeFinal(FACTORES, { "rend-cant": 6, "rend-cal": 7, cond: 5, comp: 4 });
    // Rendimiento = (6·50 + 7·50)/100 = 6,5 → final = (6,5·40 + 5·30 + 4·30)/100 = 5,3
    expect(r.completo).toBe(true);
    expect(r.puntajeFinal).toBe(5.3);
    expect(r.porFactor.find((f) => f.factorId === "rend")?.nota).toBe(6.5);
  });

  it("normaliza ponderaciones que no suman 100", () => {
    const factores: FactorBase[] = [
      { id: "a", nombre: "A", padreId: null, ponderacion: 1, orden: 0 },
      { id: "b", nombre: "B", padreId: null, ponderacion: 3, orden: 1 },
    ];
    expect(calcularPuntajeFinal(factores, { a: 4, b: 6 }).puntajeFinal).toBe(5.5);
  });

  it("queda incompleto mientras falte una nota", () => {
    const r = calcularPuntajeFinal(FACTORES, { "rend-cant": 6, cond: 5, comp: 4 });
    expect(r.completo).toBe(false);
    expect(r.puntajeFinal).toBeNull();
    expect(r.porFactor.find((f) => f.factorId === "rend")?.nota).toBeNull();
  });

  it("redondea a dos decimales", () => {
    const factores: FactorBase[] = [
      { id: "a", nombre: "A", padreId: null, ponderacion: 1, orden: 0 },
      { id: "b", nombre: "B", padreId: null, ponderacion: 1, orden: 1 },
      { id: "c", nombre: "C", padreId: null, ponderacion: 1, orden: 2 },
    ];
    expect(calcularPuntajeFinal(factores, { a: 5, b: 5, c: 6 }).puntajeFinal).toBe(5.33);
  });

  it("sin factores no hay puntaje calculable", () => {
    expect(calcularPuntajeFinal([], {}).puntajeFinal).toBeNull();
  });
});

describe("listaPorPuntaje", () => {
  it("elige la lista de mayor exigencia alcanzada y la última como piso", () => {
    expect(listaPorPuntaje(LISTAS, 6)).toBe("Lista 1");
    expect(listaPorPuntaje(LISTAS, 5.99)).toBe("Lista 2");
    expect(listaPorPuntaje(LISTAS, 4)).toBe("Lista 3");
    expect(listaPorPuntaje(LISTAS, 0.5)).toBe("Lista 4");
    expect(listaPorPuntaje([], 6)).toBeNull();
  });
});
