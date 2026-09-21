import { describe, expect, it } from "vitest";
import { calcularCapacitacion, puntuarActividad } from "@/lib/motor/capacitacion";
import { ConjuntoReglas } from "@/lib/motor/reglas";
import type { CapacitacionEntrada } from "@/lib/motor/tipos";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

const reglas = new ConjuntoReglas(REGLAS_DEMO);

function curso(periodo: number, horas: number, extra: Partial<CapacitacionEntrada> = {}): CapacitacionEntrada {
  return { horas, fechaTermino: `${periodo}-06-30`, aprobado: true, conNota: true, periodo, ...extra };
}

function periodo(resultado: ReturnType<typeof calcularCapacitacion>, anio: number) {
  const p = resultado.periodos.find((x) => x.periodo === anio);
  if (!p) throw new Error(`sin período ${anio}`);
  return {
    calculado: p.calculado.toNumber(),
    arrastre: p.arrastreRecibido.toNumber(),
    tope: p.tope.toNumber(),
    aplicado: p.aplicado.toNumber(),
    excedente: p.excedenteGenerado.toNumber(),
    caducado: p.caducado.toNumber(),
  };
}

describe("puntuarActividad", () => {
  it("asigna los puntos de cada tramo de horas de la tabla de demostración", () => {
    const casos: Array<[number, number]> = [[7, 0], [8, 1], [19, 1], [20, 2], [39, 2], [40, 3], [79, 3], [80, 4], [159, 4], [160, 6], [199, 6], [200, 8], [400, 8]];
    for (const [horas, esperado] of casos) {
      expect(puntuarActividad(curso(2025, horas), reglas).puntaje.toNumber(), `${horas} horas`).toBe(esperado);
    }
  });

  it("una actividad no aprobada vale 0 puntos y sigue en el historial", () => {
    const r = calcularCapacitacion([curso(2025, 40, { aprobado: false })], "2025-12-31", reglas);
    expect(r.actividades[0]?.puntaje.toNumber()).toBe(0);
    expect(r.actividades).toHaveLength(1);
    expect(periodo(r, 2025).aplicado).toBe(0);
  });
});

describe("calcularCapacitacion", () => {
  it("aplica el tope del período y arrastra el excedente al siguiente", () => {
    const r = calcularCapacitacion([curso(2023, 40), curso(2023, 24), curso(2023, 80)], "2023-12-31", reglas);
    expect(periodo(r, 2023)).toMatchObject({ calculado: 9, tope: 8, aplicado: 8, excedente: 1 });
    expect(r.excedentes).toEqual([{ periodoOrigen: 2023, periodoDestino: 2024, puntaje: expect.anything(), caducadoEl: null }]);
    expect(r.excedentes[0]?.puntaje.toNumber()).toBe(1);
    expect(r.puntajeCapacitacion.toNumber()).toBe(8);
  });

  it("el período siguiente recibe el arrastre y vuelve a aplicar el tope", () => {
    const r = calcularCapacitacion([curso(2023, 40), curso(2023, 24), curso(2023, 80), curso(2024, 160)], "2024-12-31", reglas);
    // 2024: 6 propios + 1 de arrastre = 7 ≤ 8
    expect(periodo(r, 2024)).toMatchObject({ calculado: 6, arrastre: 1, aplicado: 7, excedente: 0, caducado: 0 });
    expect(r.puntajeCapacitacion.toNumber()).toBe(15);
  });

  it("cada período usa el tope vigente en su cierre: 8 en 2024 y 10 en 2025", () => {
    const r = calcularCapacitacion([curso(2024, 200), curso(2024, 40), curso(2025, 200), curso(2025, 40)], "2025-12-31", reglas);
    expect(periodo(r, 2024)).toMatchObject({ calculado: 11, tope: 8, aplicado: 8, excedente: 3 });
    expect(periodo(r, 2025)).toMatchObject({ calculado: 11, tope: 10, arrastre: 0, aplicado: 10, excedente: 1 });
    // El arrastre de 2024 (3) no cupo en 2025 y sigue viajando a 2026
    expect(r.excedentes).toContainEqual(expect.objectContaining({ periodoOrigen: 2024, periodoDestino: 2026, caducadoEl: null }));
  });

  it("ejemplo 4: excedente en cadena que se aplica cuando cabe", () => {
    // 2021: 14 puntos calculados (200 h + 80 h + 20 h), tope 8 → excedente 6; 2022 sin actividades
    const r = calcularCapacitacion([curso(2021, 200), curso(2021, 80), curso(2021, 20)], "2022-12-31", reglas);
    expect(periodo(r, 2021)).toMatchObject({ calculado: 14, aplicado: 8, excedente: 6 });
    expect(periodo(r, 2022)).toMatchObject({ calculado: 0, arrastre: 6, aplicado: 6, excedente: 0, caducado: 0 });
    expect(r.puntajeCapacitacion.toNumber()).toBe(14);
  });

  it("ejemplo 4, variante: el arrastre que no cabe viaja un segundo año y caduca al tercero", () => {
    // 2021 excedente 6; 2022 con 8 propios (tope lleno): el arrastre pasa a 2023; 2023 también lleno: caduca
    const r = calcularCapacitacion(
      [curso(2021, 200), curso(2021, 80), curso(2021, 20), curso(2022, 200), curso(2023, 200)],
      "2023-12-31",
      reglas,
    );
    expect(periodo(r, 2022)).toMatchObject({ calculado: 8, arrastre: 0, aplicado: 8, caducado: 0 });
    expect(periodo(r, 2023)).toMatchObject({ calculado: 8, arrastre: 0, aplicado: 8, caducado: 6 });
    expect(r.excedentes).toEqual([
      expect.objectContaining({ periodoOrigen: 2021, periodoDestino: 2022, caducadoEl: null }),
      expect.objectContaining({ periodoOrigen: 2021, periodoDestino: 2023, caducadoEl: null }),
      expect.objectContaining({ periodoOrigen: 2021, periodoDestino: 2023, caducadoEl: "2023-12-31" }),
    ]);
    expect(r.puntajeCapacitacion.toNumber()).toBe(24);
  });

  it("los propios llenan el tope antes que el arrastre, y el arrastre más antiguo entra primero", () => {
    // 2020: 14 → excedente 6 (origen 2020); 2021: 14 → excedente 6 (origen 2021); 2022: 4 propios + 4 de arrastre
    const r = calcularCapacitacion(
      [curso(2020, 200), curso(2020, 80), curso(2020, 20), curso(2021, 200), curso(2021, 80), curso(2021, 20), curso(2022, 80)],
      "2022-12-31",
      reglas,
    );
    // En 2021 solo cabe lo propio (8): el arrastre de 2020 (6) pasa entero a 2022
    expect(periodo(r, 2021)).toMatchObject({ calculado: 14, arrastre: 0, aplicado: 8, excedente: 6 });
    // En 2022: 4 propios, 4 del arrastre de 2020 (el más antiguo); quedan 2 de 2020 y 6 de 2021 viajando
    expect(periodo(r, 2022)).toMatchObject({ calculado: 4, arrastre: 4, aplicado: 8, caducado: 2 });
    expect(r.excedentes).toContainEqual(expect.objectContaining({ periodoOrigen: 2020, periodoDestino: 2022, caducadoEl: "2022-12-31" }));
    expect(r.excedentes).toContainEqual(expect.objectContaining({ periodoOrigen: 2021, periodoDestino: 2023, caducadoEl: null }));
  });

  it("solo considera actividades terminadas hasta la fecha de corte", () => {
    const r = calcularCapacitacion([curso(2025, 40), curso(2025, 200, { fechaTermino: "2025-11-30" })], "2025-06-30", reglas);
    expect(periodo(r, 2025)).toMatchObject({ calculado: 3, aplicado: 3 });
  });

  it("sin arrastre en el reglamento, el excedente se pierde al cierre del período", () => {
    const sinArrastre = new ConjuntoReglas(REGLAS_DEMO.filter((r) => r.tipo !== "ARRASTRE_EXCEDENTE"));
    const r = calcularCapacitacion([curso(2023, 200), curso(2023, 80)], "2024-12-31", sinArrastre);
    expect(periodo(r, 2023)).toMatchObject({ calculado: 12, aplicado: 8, excedente: 4, caducado: 4 });
    expect(periodo(r, 2024)).toMatchObject({ arrastre: 0 });
  });

  it("ejemplo 1: detalle 2023 a 2026 de María Pérez", () => {
    const actividades: CapacitacionEntrada[] = [
      curso(2023, 40), curso(2023, 24), curso(2023, 80),
      curso(2024, 40), curso(2024, 20),
      curso(2025, 200), curso(2025, 40),
      curso(2026, 40),
    ];
    const r = calcularCapacitacion(actividades, "2026-09-25", reglas);
    expect(periodo(r, 2023)).toMatchObject({ calculado: 9, arrastre: 0, tope: 8, aplicado: 8, excedente: 1 });
    expect(periodo(r, 2024)).toMatchObject({ calculado: 5, arrastre: 1, tope: 8, aplicado: 6, excedente: 0 });
    expect(periodo(r, 2025)).toMatchObject({ calculado: 11, arrastre: 0, tope: 10, aplicado: 10, excedente: 1 });
    expect(periodo(r, 2026)).toMatchObject({ calculado: 3, arrastre: 1, tope: 10, aplicado: 4, excedente: 0 });
    expect(r.puntajeCapacitacion.toNumber()).toBe(28);
  });
});
