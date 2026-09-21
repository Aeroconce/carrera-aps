import { describe, expect, it } from "vitest";
import { calcularEstudios } from "@/lib/motor/estudios";
import { ConjuntoReglas } from "@/lib/motor/reglas";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

const reglas = new ConjuntoReglas(REGLAS_DEMO);
const CORTE = "2026-09-25";

describe("calcularEstudios", () => {
  it("puntúa postítulo, magíster y doctorado en categorías A y B", () => {
    const r = calcularEstudios(
      [
        { tipo: "POSTITULO", reconocidoEl: "2019-06-01" },
        { tipo: "MAGISTER", reconocidoEl: "2020-06-01" },
        { tipo: "DOCTORADO", reconocidoEl: "2021-06-01" },
      ],
      "A",
      CORTE,
      reglas,
    );
    expect(r.estudios.map((e) => e.puntaje.toNumber())).toEqual([5, 10, 15]);
    expect(r.estudios.every((e) => !e.soloBeneficio)).toBe(true);
    expect(r.puntajeEstudios.toNumber()).toBe(30);
  });

  it("un título en categoría A es beneficio informativo: la tabla no lo puntúa", () => {
    const r = calcularEstudios([{ tipo: "TITULO", reconocidoEl: "2019-06-01" }], "A", CORTE, reglas);
    expect(r.estudios[0]).toMatchObject({ soloBeneficio: true });
    expect(r.puntajeEstudios.toNumber()).toBe(0);
  });

  it("en categorías C a F ningún estudio puntúa", () => {
    const r = calcularEstudios([{ tipo: "MAGISTER", reconocidoEl: "2020-06-01" }], "C", CORTE, reglas);
    expect(r.estudios[0]?.soloBeneficio).toBe(true);
    expect(r.puntajeEstudios.toNumber()).toBe(0);
  });

  it("sin reconocimiento no puntúa; reconocido después del corte no existe todavía", () => {
    const sinReconocer = calcularEstudios([{ tipo: "MAGISTER", reconocidoEl: null }], "A", CORTE, reglas);
    expect(sinReconocer.estudios).toHaveLength(1);
    expect(sinReconocer.puntajeEstudios.toNumber()).toBe(0);
    const futuro = calcularEstudios([{ tipo: "MAGISTER", reconocidoEl: "2026-12-01" }], "A", CORTE, reglas);
    expect(futuro.estudios).toHaveLength(0);
  });

  it("con apertura, lo reconocido antes ya está en el saldo y no se suma", () => {
    const apertura = { fecha: "2024-12-31", nivel: 4, nivelDesde: "2023-06-01", puntajeTotal: 210, desglosado: true };
    const r = calcularEstudios(
      [
        { tipo: "MAGISTER", reconocidoEl: "2015-06-01" },
        { tipo: "DOCTORADO", reconocidoEl: "2025-06-01" },
      ],
      "A",
      CORTE,
      reglas,
      apertura,
    );
    expect(r.estudios.map((e) => e.incluidoEnApertura)).toEqual([true, false]);
    expect(r.puntajeEstudios.toNumber()).toBe(15);
  });
});
