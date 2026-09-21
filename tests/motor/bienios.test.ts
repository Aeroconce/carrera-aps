import { describe, expect, it } from "vitest";
import { calcularBienios } from "@/lib/motor/bienios";
import { ConjuntoReglas, type ReglaFila } from "@/lib/motor/reglas";
import type { BienioRegistrado, ExperienciaEntrada } from "@/lib/motor/tipos";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

const reglas = new ConjuntoReglas(REGLAS_DEMO);
// Las reglas de demostración rigen desde 2015; para casos con historia anterior se usan las mismas desde 2000
const reglasDesde2000 = new ConjuntoReglas(REGLAS_DEMO.map((r) => (r.vigenteDesde === "2015-01-01" ? { ...r, vigenteDesde: "2000-01-01" } : r)));

function propia(fechaDesde: string, fechaHasta: string | null = null): ExperienciaEntrada {
  return { esPropia: true, fechaDesde, fechaHasta };
}

function calcular(experiencias: ExperienciaEntrada[], fechaCorte: string, bienios: BienioRegistrado[] = [], conjunto = reglas) {
  const fechaIngreso = experiencias[0]?.fechaDesde ?? "2000-01-01";
  return calcularBienios({ categoria: "B", fechaIngreso, experiencias, bienios }, fechaCorte, conjunto);
}

describe("calcularBienios", () => {
  it("ingreso hace dos años exactos: un bienio cumplido hoy", () => {
    const r = calcular([propia("2024-09-25")], "2026-09-25");
    expect(r.bienios.map((b) => b.fechaCumplido)).toEqual(["2026-09-25"]);
    expect(r.bienios[0]?.puntaje.toNumber()).toBe(10);
    expect(r.bienios[0]?.origen).toBe("calculado");
    expect(r.puntajeExperiencia.toNumber()).toBe(10);
    expect(r.proximoBienio).toBe("2028-09-25");
  });

  it("un día antes de los dos años todavía no hay bienio", () => {
    const r = calcular([propia("2024-09-25")], "2026-09-24");
    expect(r.bienios).toHaveLength(0);
    expect(r.proximoBienio).toBe("2026-09-25");
  });

  it("tres años y once meses: un bienio y el próximo en un mes", () => {
    const r = calcular([propia("2022-10-25")], "2026-09-25");
    expect(r.bienios.map((b) => b.fechaCumplido)).toEqual(["2024-10-25"]);
    expect(r.proximoBienio).toBe("2026-10-25");
  });

  it("la brecha entre renuncia y reingreso no cuenta", () => {
    // Un año de servicio (2020, bisiesto: 366 días), seis meses fuera, reingreso el 01/07/2021
    const r = calcular([propia("2020-01-01", "2020-12-31"), propia("2021-07-01")], "2026-09-25");
    // Sin brecha el primer bienio sería el 01/01/2022; corrido por los 181 días de brecha: 01/07/2022.
    // Las metas se miden desde el ancla original (01/01/2020): el 29 de febrero de 2024 corre un día la tercera.
    expect(r.bienios.map((b) => b.fechaCumplido)).toEqual(["2022-07-01", "2024-06-30", "2026-07-01"]);
    expect(r.proximoBienio).toBe("2028-06-30");
  });

  it("dos períodos traslapados cuentan una sola vez", () => {
    const r = calcular([propia("2022-01-01", "2023-12-31"), propia("2023-01-01")], "2026-09-25");
    expect(r.bienios.map((b) => b.fechaCumplido)).toEqual(["2024-01-01", "2026-01-01"]);
  });

  it("la experiencia externa cuenta completa, pero solo desde que está reconocida", () => {
    const experiencias: ExperienciaEntrada[] = [
      { esPropia: false, fechaDesde: "2005-06-01", fechaHasta: "2008-05-31", reconocidaEl: "2008-08-01" },
      propia("2008-06-01"),
    ];
    const reconocida = calcular(experiencias, "2026-09-25", [], reglasDesde2000);
    expect(reconocida.bienios).toHaveLength(10);
    expect(reconocida.bienios[0]?.fechaCumplido).toBe("2007-06-01");
    expect(reconocida.bienios[9]?.fechaCumplido).toBe("2025-06-01");
    expect(reconocida.proximoBienio).toBe("2027-06-01");

    // Antes del acto de reconocimiento, la externa no existe para el cálculo
    const antes = calcular(experiencias, "2008-07-15", [], reglasDesde2000);
    expect(antes.bienios).toHaveLength(0);
    expect(antes.proximoBienio).toBe("2010-06-01");

    // Externa sin reconocer nunca cuenta
    const sinReconocer = calcular([{ ...experiencias[0]!, reconocidaEl: null }, propia("2008-06-01")], "2026-09-25", [], reglasDesde2000);
    expect(sinReconocer.bienios[0]?.fechaCumplido).toBe("2010-06-01");
  });

  it("ingreso el 29 de febrero: el bienio cae el 28 de febrero del año no bisiesto", () => {
    const r = calcular([propia("2024-02-29")], "2026-03-01");
    expect(r.bienios.map((b) => b.fechaCumplido)).toEqual(["2026-02-28"]);
  });

  it("fecha de corte anterior al primer bienio: nada cumplido, próximo informado", () => {
    const r = calcular([propia("2025-01-01")], "2026-06-30");
    expect(r.bienios).toHaveLength(0);
    expect(r.puntajeExperiencia.toNumber()).toBe(0);
    expect(r.proximoBienio).toBe("2027-01-01");
  });

  it("sin experiencia vigente no hay próximo bienio", () => {
    const r = calcular([propia("2020-01-01", "2021-06-30")], "2026-09-25");
    expect(r.bienios).toHaveLength(0);
    expect(r.proximoBienio).toBeNull();
  });

  it("respeta los bienios registrados y calcula hacia adelante desde el último (ejemplo 1)", () => {
    const registrados: BienioRegistrado[] = ["2016-03-01", "2018-03-01", "2020-03-01", "2022-03-01", "2024-03-01", "2026-03-01"].map(
      (fechaCumplido, i) => ({ numero: i + 1, fechaCumplido, fechaReconocido: fechaCumplido, decretoNumero: `D-${i + 1}`, puntaje: 10 }),
    );
    const hoy = calcular([propia("2014-03-01")], "2026-09-25", registrados);
    expect(hoy.bienios).toHaveLength(6);
    expect(hoy.bienios.every((b) => b.origen === "registrado")).toBe(true);
    expect(hoy.puntajeExperiencia.toNumber()).toBe(60);
    expect(hoy.proximoBienio).toBe("2028-03-01");

    // Situación al 31/12/2024: cinco bienios y el sexto como próximo
    const al2024 = calcular([propia("2014-03-01")], "2024-12-31", registrados);
    expect(al2024.bienios).toHaveLength(5);
    expect(al2024.puntajeExperiencia.toNumber()).toBe(50);
    expect(al2024.proximoBienio).toBe("2026-03-01");
  });

  it("calcula el bienio siguiente a los registrados con la regla vigente a su fecha (ejemplo 3)", () => {
    const registrados: BienioRegistrado[] = Array.from({ length: 9 }, (_, i) => ({
      numero: i + 1,
      fechaCumplido: `${2007 + 2 * i}-06-01`,
      fechaReconocido: `${2007 + 2 * i}-07-01`,
      puntaje: 10,
    }));
    const r = calcular(
      [{ esPropia: false, fechaDesde: "2005-06-01", fechaHasta: "2008-05-31", reconocidaEl: "2008-08-01" }, propia("2008-06-01")],
      "2026-09-25",
      registrados,
    );
    expect(r.bienios).toHaveLength(10);
    const decimo = r.bienios[9]!;
    expect(decimo).toMatchObject({ numero: 10, fechaCumplido: "2025-06-01", fechaReconocido: null, origen: "calculado", reglaId: "demo-puntos-bienio" });
    expect(r.puntajeExperiencia.toNumber()).toBe(100);
    expect(r.proximoBienio).toBe("2027-06-01");
  });

  it("modo días: 730 días de servicio por bienio", () => {
    const filas: ReglaFila[] = REGLAS_DEMO.map((r) =>
      r.tipo === "DIAS_BIENIO" ? { ...r, parametros: { modo: "dias", dias: 730 } } : r,
    );
    const r = calcular([propia("2014-03-01")], "2016-03-01", [], new ConjuntoReglas(filas));
    // 2016 es bisiesto: los 730 días se completan el 29 de febrero
    expect(r.bienios.map((b) => b.fechaCumplido)).toEqual(["2016-02-29"]);
  });

  it("prorratea por jornada parcial cuando la regla lo activa", () => {
    const filas: ReglaFila[] = [
      ...REGLAS_DEMO,
      { id: "prorrateo", tipo: "PRORRATEO_JORNADA", categoria: null, vigenteDesde: "2015-01-01", vigenteHasta: null, parametros: { activo: true, jornadaCompleta: 44 }, fuente: "" },
    ];
    const conProrrateo = new ConjuntoReglas(filas);
    const mediaJornada = calcularBienios(
      { categoria: "B", fechaIngreso: "2020-01-01", experiencias: [{ esPropia: true, fechaDesde: "2020-01-01", fechaHasta: null, jornadaHoras: 22 }], bienios: [] },
      "2026-09-25",
      conProrrateo,
    );
    // 731 días de servicio completo tardan 1462 días a media jornada: 2 de enero de 2024
    expect(mediaJornada.bienios.map((b) => b.fechaCumplido)).toEqual(["2024-01-02"]);
  });

  it("falla con un mensaje claro si no hay regla de puntos vigente al cumplirse el bienio", () => {
    expect(() => calcular([propia("2010-01-01")], "2026-09-25")).toThrow("No hay regla PUNTOS_BIENIO vigente al 01/01/2012");
  });
});
