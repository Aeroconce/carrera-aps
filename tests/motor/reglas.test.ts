import { describe, expect, it } from "vitest";
import { ConjuntoReglas, ErrorSinRegla, type ReglaFila } from "@/lib/motor/reglas";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

describe("ConjuntoReglas", () => {
  const reglas = new ConjuntoReglas(REGLAS_DEMO);

  it("resuelve la versión vigente a cada fecha (tope 8 hasta 2024, 10 desde 2025)", () => {
    expect(reglas.vigente("TOPE_CAPACITACION_ANUAL", "2024-12-31").parametros.tope).toBe(8);
    expect(reglas.vigente("TOPE_CAPACITACION_ANUAL", "2025-01-01").parametros.tope).toBe(10);
    expect(reglas.vigente("PUNTOS_BIENIO", "2026-03-01").parametros.puntos).toBe(10);
  });

  it("lanza un error claro cuando no hay regla vigente", () => {
    expect(() => reglas.vigente("TOPE_CAPACITACION_ANUAL", "2014-06-30")).toThrow(ErrorSinRegla);
    expect(() => reglas.vigente("PUNTOS_BIENIO", "2014-06-30", "B")).toThrow("categoría B");
  });

  it("la regla específica de una categoría manda sobre la general", () => {
    const filas: ReglaFila[] = [
      ...REGLAS_DEMO,
      {
        id: "bienio-A",
        tipo: "PUNTOS_BIENIO",
        categoria: "A",
        vigenteDesde: "2020-01-01",
        vigenteHasta: null,
        parametros: { puntos: 12 },
        fuente: "prueba",
      },
    ];
    const conEspecifica = new ConjuntoReglas(filas);
    expect(conEspecifica.vigente("PUNTOS_BIENIO", "2026-01-01", "A").parametros.puntos).toBe(12);
    expect(conEspecifica.vigente("PUNTOS_BIENIO", "2026-01-01", "B").parametros.puntos).toBe(10);
    expect(conEspecifica.vigente("PUNTOS_BIENIO", "2026-01-01").parametros.puntos).toBe(10);
  });

  it("entre dos versiones vigentes elige la más reciente", () => {
    const filas: ReglaFila[] = [
      { id: "vieja", tipo: "PUNTOS_BIENIO", categoria: null, vigenteDesde: "2020-01-01", vigenteHasta: null, parametros: { puntos: 8 }, fuente: "" },
      { id: "nueva", tipo: "PUNTOS_BIENIO", categoria: null, vigenteDesde: "2024-01-01", vigenteHasta: null, parametros: { puntos: 9 }, fuente: "" },
    ];
    expect(new ConjuntoReglas(filas).vigente("PUNTOS_BIENIO", "2025-01-01").parametros.puntos).toBe(9);
    expect(new ConjuntoReglas(filas).vigente("PUNTOS_BIENIO", "2022-01-01").parametros.puntos).toBe(8);
  });

  it("valida los parámetros al construir y nombra la regla con problemas", () => {
    const filas: ReglaFila[] = [
      { id: "tope-mal", tipo: "TOPE_CAPACITACION_ANUAL", categoria: null, vigenteDesde: "2020-01-01", vigenteHasta: null, parametros: { tope: -1 }, fuente: "" },
    ];
    expect(() => new ConjuntoReglas(filas)).toThrow("TOPE_CAPACITACION_ANUAL (tope-mal)");
  });

  it("aplica los valores por defecto del doc 04 a las reglas opcionales", () => {
    const sinOpcionales = new ConjuntoReglas(REGLAS_DEMO.filter((r) => r.tipo !== "ALERTAS" && r.tipo !== "PRORRATEO_JORNADA"));
    expect(sinOpcionales.parametrosODefecto("ALERTAS", "2026-01-01").diasAvisoBienio).toBe(60);
    expect(sinOpcionales.parametrosODefecto("PRORRATEO_JORNADA", "2026-01-01").activo).toBe(false);
    expect(sinOpcionales.parametrosOpcionales("PUNTAJE_ESTUDIOS", "2026-01-01")?.categorias).toEqual(["A", "B"]);
    expect(reglas.parametrosOpcionales("PUNTAJE_ESTUDIOS", "2010-01-01")).toBeNull();
  });
});
