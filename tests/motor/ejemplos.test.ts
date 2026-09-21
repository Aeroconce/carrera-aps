// Los cuatro ejemplos del doc 14, cifra por cifra, en sus dos formas: con historia completa (como los
// describe el doc) y con movimiento de apertura al 31/12/2024 (como llegan los datos reales, doc 04 §0).

import { describe, expect, it } from "vitest";
import { generarAlertas } from "@/lib/motor/alertas";
import { calcularEstadoCarrera } from "@/lib/motor/estado";
import { ConjuntoReglas } from "@/lib/motor/reglas";
import type { BienioRegistrado, CapacitacionEntrada, FuncionarioEntrada } from "@/lib/motor/tipos";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

const reglas = new ConjuntoReglas(REGLAS_DEMO);
const HOY = "2026-09-25";

function curso(periodo: number, horas: number, mes = "06"): CapacitacionEntrada {
  return { nombre: `Curso ${horas} h ${periodo}`, horas, fechaTermino: `${periodo}-${mes}-30`, aprobado: true, conNota: true, periodo, documentoId: "doc" };
}

function numeros(estado: ReturnType<typeof calcularEstadoCarrera>) {
  return {
    bienios: estado.bienios.bienios.filter((b) => !b.incluidoEnApertura).length + estado.bienios.bienios.filter((b) => b.incluidoEnApertura).length,
    experiencia: estado.puntaje.experiencia.toNumber(),
    capacitacion: estado.puntaje.capacitacion.toNumber(),
    estudios: estado.puntaje.estudios.toNumber(),
    otros: estado.puntaje.otrosApertura.toNumber(),
    total: estado.puntaje.total.toNumber(),
    nivelCalculado: estado.nivel.calculado,
    nivelVigente: estado.nivel.vigente,
    cumpleAscenso: estado.nivel.cumpleAscenso,
    faltan: estado.nivel.puntajeFaltante?.toNumber() ?? null,
    proximoBienio: estado.bienios.proximoBienio,
    fechaEstimada: estado.proyeccion?.fechaEstimada ?? null,
  };
}

// Capacitación histórica de María Pérez: 36 puntos aplicados entre 2015 y 2022 (5 = 40 h + 20 h; 4 = 80 h)
const historiaCapacitacionMaria: CapacitacionEntrada[] = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022].flatMap((anio) =>
  anio % 2 === 1 ? [curso(anio, 40), curso(anio, 20, "09")] : [curso(anio, 80)],
);
const capacitacionMariaDesde2023: CapacitacionEntrada[] = [
  curso(2023, 40), curso(2023, 24, "08"), curso(2023, 80, "10"),
  curso(2024, 40), curso(2024, 20, "09"),
  curso(2025, 200), curso(2025, 40, "09"),
  curso(2026, 40),
];
const bieniosMaria: BienioRegistrado[] = ["2016-03-01", "2018-03-01", "2020-03-01", "2022-03-01", "2024-03-01", "2026-03-01"].map(
  (fechaCumplido, i) => ({ numero: i + 1, fechaCumplido, fechaReconocido: fechaCumplido, decretoNumero: i === 5 ? "145" : `D-${i + 1}`, puntaje: 10, documentoId: "doc" }),
);
const nivelesMaria = [
  { nivel: 10, fechaDesde: "2024-01-01", fechaHasta: "2026-02-28" },
  { nivel: 9, fechaDesde: "2026-03-01", fechaHasta: null },
];

describe("ejemplo 1: María Pérez, categoría B, titular", () => {
  const mariaHistoria: FuncionarioEntrada = {
    id: "maria",
    categoria: "B",
    fechaIngreso: "2014-03-01",
    experiencias: [{ esPropia: true, fechaDesde: "2014-03-01", fechaHasta: null }],
    bienios: bieniosMaria,
    capacitaciones: [...historiaCapacitacionMaria, ...capacitacionMariaDesde2023],
    estudios: [{ nombre: "Postítulo", tipo: "POSTITULO", reconocidoEl: "2019-06-01", documentoId: "doc" }],
    niveles: nivelesMaria,
  };

  it("hoy: 6 bienios, 64 de capacitación, 5 de estudios, 129 puntos, nivel 9, faltan 11, ascenso estimado en marzo de 2028", () => {
    const estado = calcularEstadoCarrera(mariaHistoria, HOY, reglas);
    expect(numeros(estado)).toEqual({
      bienios: 6, experiencia: 60, capacitacion: 64, estudios: 5, otros: 0, total: 129,
      nivelCalculado: 9, nivelVigente: 9, cumpleAscenso: false, faltan: 11,
      proximoBienio: "2028-03-01", fechaEstimada: "2028-03-01",
    });
    const p2025 = estado.capacitacion.periodos.find((p) => p.periodo === 2025)!;
    expect([p2025.calculado.toNumber(), p2025.tope.toNumber(), p2025.aplicado.toNumber(), p2025.excedenteGenerado.toNumber()]).toEqual([11, 10, 10, 1]);
    expect(generarAlertas(estado, reglas).map((a) => a.tipo)).toEqual(["NIVEL_PROXIMO"]);
  });

  it("situación al 31/12/2024: 5 bienios, 105 puntos, nivel 10 (subcriterio 10)", () => {
    const estado = calcularEstadoCarrera(mariaHistoria, "2024-12-31", reglas);
    expect(numeros(estado)).toMatchObject({
      bienios: 5, experiencia: 50, capacitacion: 50, estudios: 5, total: 105,
      nivelCalculado: 10, nivelVigente: 10, cumpleAscenso: false, proximoBienio: "2026-03-01",
    });
  });

  it("con apertura al 31/12/2024 (saldo 105 desglosado en 50 y 50) llega a las mismas cifras hoy", () => {
    const mariaApertura: FuncionarioEntrada = {
      id: "maria-apertura",
      categoria: "B",
      fechaIngreso: "2014-03-01",
      apertura: {
        fecha: "2024-12-31", nivel: 10, nivelDesde: "2024-01-01", puntajeTotal: 105, desglosado: true,
        puntajeExperiencia: 50, puntajeCapacitacion: 50, fechaUltimoBienio: "2024-03-01", bieniosReconocidos: 5,
      },
      experiencias: [],
      bienios: [],
      capacitaciones: capacitacionMariaDesde2023,
      estudios: [],
      niveles: nivelesMaria,
    };
    const hoy = calcularEstadoCarrera(mariaApertura, HOY, reglas);
    expect(numeros(hoy)).toEqual({
      bienios: 1, experiencia: 60, capacitacion: 64, estudios: 0, otros: 5, total: 129,
      nivelCalculado: 9, nivelVigente: 9, cumpleAscenso: false, faltan: 11,
      proximoBienio: "2028-03-01", fechaEstimada: "2028-03-01",
    });
    expect(hoy.bienios.bienios[0]).toMatchObject({ numero: 6, fechaCumplido: "2026-03-01", origen: "calculado" });

    const al2024 = calcularEstadoCarrera(mariaApertura, "2024-12-31", reglas);
    expect(al2024.sinInformacion).toBe(false);
    expect(numeros(al2024)).toMatchObject({ total: 105, nivelCalculado: 10, nivelVigente: 10, proximoBienio: "2026-03-01" });

    const antes = calcularEstadoCarrera(mariaApertura, "2024-06-30", reglas);
    expect(antes.sinInformacion).toBe(true);
    expect(antes.puntaje.total.toNumber()).toBe(0);
  });

  it("con apertura sin desglose el saldo se informa aparte y el total no cambia", () => {
    const sinDesglose: FuncionarioEntrada = {
      categoria: "B",
      fechaIngreso: "2014-03-01",
      apertura: { fecha: "2024-12-31", nivel: 10, nivelDesde: "2024-01-01", puntajeTotal: 105, desglosado: false, fechaUltimoBienio: "2024-03-01", bieniosReconocidos: 5 },
      experiencias: [], bienios: [], capacitaciones: capacitacionMariaDesde2023, estudios: [], niveles: nivelesMaria,
    };
    const hoy = calcularEstadoCarrera(sinDesglose, HOY, reglas);
    expect(hoy.puntaje.saldoAperturaSinDesglose.toNumber()).toBe(105);
    expect(hoy.puntaje.experiencia.toNumber()).toBe(10);
    expect(hoy.puntaje.capacitacion.toNumber()).toBe(14);
    expect(hoy.puntaje.total.toNumber()).toBe(129);
  });
});

describe("ejemplo 2: Juan Soto, categoría E, plazo fijo", () => {
  const juan: FuncionarioEntrada = {
    categoria: "E",
    fechaIngreso: "2025-11-15",
    experiencias: [],
    bienios: [],
    capacitaciones: [{ nombre: "Curso 16 h", horas: 16, fechaTermino: "2026-05-10", aprobado: true, conNota: true, periodo: 2026, documentoId: "doc" }],
    estudios: [],
    niveles: [{ nivel: 15, fechaDesde: "2025-11-15", fechaHasta: null }],
  };

  it("1 punto, nivel 15, próximo bienio el 15/11/2027 sin alerta, faltan 19, ascenso estimado el 15/11/2029", () => {
    const estado = calcularEstadoCarrera(juan, HOY, reglas);
    expect(numeros(estado)).toEqual({
      bienios: 0, experiencia: 0, capacitacion: 1, estudios: 0, otros: 0, total: 1,
      nivelCalculado: 15, nivelVigente: 15, cumpleAscenso: false, faltan: 19,
      proximoBienio: "2027-11-15", fechaEstimada: "2029-11-15",
    });
    expect(estado.proyeccion?.descripcion).toContain("1 punto de capacitación por año");
    expect(generarAlertas(estado, reglas).map((a) => a.tipo)).not.toContain("BIENIO_PROXIMO");
  });
});

describe("ejemplo 3: Carmen Riquelme, categoría A, con apertura al 31/12/2024", () => {
  const carmen: FuncionarioEntrada = {
    categoria: "A",
    fechaIngreso: "2008-06-01",
    apertura: {
      fecha: "2024-12-31", nivel: 4, nivelDesde: "2023-08-01", puntajeTotal: 210, desglosado: true,
      puntajeExperiencia: 90, puntajeCapacitacion: 110, fechaUltimoBienio: "2023-06-01", bieniosReconocidos: 9,
    },
    experiencias: [
      { esPropia: false, fechaDesde: "2005-06-01", fechaHasta: "2008-05-31", reconocidaEl: "2008-08-01" },
      { esPropia: true, fechaDesde: "2008-06-01", fechaHasta: null },
    ],
    bienios: [],
    capacitaciones: [curso(2025, 40), curso(2026, 80), curso(2026, 8, "08")],
    estudios: [],
    niveles: [{ nivel: 4, fechaDesde: "2023-08-01", fechaHasta: null }],
  };

  it("10 bienios (el décimo calculado y sin decreto), 118 de capacitación, 10 de magíster, 228 puntos, nivel 4, faltan 12", () => {
    const estado = calcularEstadoCarrera(carmen, HOY, reglas);
    expect(numeros(estado)).toEqual({
      bienios: 1, experiencia: 100, capacitacion: 118, estudios: 0, otros: 10, total: 228,
      nivelCalculado: 4, nivelVigente: 4, cumpleAscenso: false, faltan: 12,
      proximoBienio: "2027-06-01", fechaEstimada: expect.any(String),
    });
    const decimo = estado.bienios.bienios[0]!;
    expect(decimo).toMatchObject({ numero: 10, fechaCumplido: "2025-06-01", fechaReconocido: null, origen: "calculado" });

    const tipos = generarAlertas(estado, reglas).map((a) => a.tipo);
    expect(tipos).toContain("BIENIO_PENDIENTE_RECONOCER");
    expect(tipos).toContain("NIVEL_PROXIMO");
  });
});

describe("ejemplo 4: Pedro Lagos, categoría C, excedente pendiente en la apertura", () => {
  it("el excedente de la planilla entra como arrastre en 2025 y lo que no cabe caduca al cierre de 2026", () => {
    const pedro: FuncionarioEntrada = {
      categoria: "C",
      fechaIngreso: "2018-03-01",
      apertura: {
        fecha: "2024-12-31", nivel: 12, nivelDesde: "2022-03-01", puntajeTotal: 70, desglosado: true,
        puntajeExperiencia: 30, puntajeCapacitacion: 40, fechaUltimoBienio: "2024-03-01", bieniosReconocidos: 3, excedentePendiente: 6,
      },
      experiencias: [], bienios: [],
      // 2025 con el tope lleno (10 propios): el arrastre no cabe; 2026 igual: caduca al cierre de 2026
      capacitaciones: [curso(2025, 200), curso(2025, 40, "09"), curso(2026, 200), curso(2026, 40, "09")],
      estudios: [],
      niveles: [{ nivel: 12, fechaDesde: "2022-03-01", fechaHasta: null }],
    };
    const estado = calcularEstadoCarrera(pedro, "2026-12-31", reglas);
    const p2025 = estado.capacitacion.periodos.find((p) => p.periodo === 2025)!;
    const p2026 = estado.capacitacion.periodos.find((p) => p.periodo === 2026)!;
    expect([p2025.calculado.toNumber(), p2025.arrastreRecibido.toNumber(), p2025.aplicado.toNumber()]).toEqual([11, 0, 10]);
    expect([p2026.calculado.toNumber(), p2026.arrastreRecibido.toNumber(), p2026.aplicado.toNumber(), p2026.caducado.toNumber()]).toEqual([11, 0, 10, 6]);
    expect(estado.capacitacion.excedentes).toContainEqual(expect.objectContaining({ periodoOrigen: 2024, periodoDestino: 2026, caducadoEl: "2026-12-31" }));

    // Si 2025 hubiera venido vacío, el arrastre entra completo
    const pedroVacio = { ...pedro, capacitaciones: [] };
    const vacio = calcularEstadoCarrera(pedroVacio, "2025-12-31", reglas);
    const v2025 = vacio.capacitacion.periodos.find((p) => p.periodo === 2025)!;
    expect([v2025.arrastreRecibido.toNumber(), v2025.aplicado.toNumber()]).toEqual([6, 6]);
    expect(vacio.puntaje.capacitacion.toNumber()).toBe(46);
  });
});
