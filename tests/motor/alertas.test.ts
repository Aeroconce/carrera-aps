import { describe, expect, it } from "vitest";
import { generarAlertas } from "@/lib/motor/alertas";
import { calcularEstadoCarrera } from "@/lib/motor/estado";
import { ConjuntoReglas } from "@/lib/motor/reglas";
import type { FuncionarioEntrada } from "@/lib/motor/tipos";
import { REGLAS_DEMO } from "@/lib/reglas/demo";

const reglas = new ConjuntoReglas(REGLAS_DEMO);

function funcionario(extra: Partial<FuncionarioEntrada>): FuncionarioEntrada {
  return { categoria: "B", fechaIngreso: "2020-01-01", experiencias: [], bienios: [], capacitaciones: [], estudios: [], niveles: [], ...extra };
}

describe("generarAlertas", () => {
  it("bienio próximo dentro de los 60 días de aviso", () => {
    // Ingreso 01/11/2024: próximo bienio el 01/11/2026, a 37 días del 25/09/2026
    const estado = calcularEstadoCarrera(funcionario({ fechaIngreso: "2024-11-01" }), "2026-09-25", reglas);
    const alertas = generarAlertas(estado, reglas);
    expect(alertas).toContainEqual(expect.objectContaining({ tipo: "BIENIO_PROXIMO", fechaHito: "2026-11-01", clave: "BIENIO_PROXIMO:2026-11-01" }));
    expect(alertas.find((a) => a.tipo === "BIENIO_PROXIMO")?.mensaje).toBe("Cumple su próximo bienio el 01/11/2026");
    // A 90 días no hay aviso
    expect(generarAlertas(calcularEstadoCarrera(funcionario({ fechaIngreso: "2024-11-01" }), "2026-08-01", reglas), reglas).map((a) => a.tipo)).not.toContain("BIENIO_PROXIMO");
  });

  it("bienio cumplido hace más de 30 días sin reconocer", () => {
    const estado = calcularEstadoCarrera(funcionario({ fechaIngreso: "2024-06-01" }), "2026-09-25", reglas);
    const alertas = generarAlertas(estado, reglas);
    expect(alertas).toContainEqual(expect.objectContaining({ tipo: "BIENIO_PENDIENTE_RECONOCER", fechaHito: "2026-06-01" }));
    // Recién cumplido (hace 10 días) todavía no alerta
    const reciente = calcularEstadoCarrera(funcionario({ fechaIngreso: "2024-09-15" }), "2026-09-25", reglas);
    expect(generarAlertas(reciente, reglas).map((a) => a.tipo)).not.toContain("BIENIO_PENDIENTE_RECONOCER");
  });

  it("nivel alcanzado cuando el calculado supera al vigente; nivel próximo cuando faltan 15 o menos", () => {
    const alcanzado = calcularEstadoCarrera(
      funcionario({ apertura: { fecha: "2024-12-31", nivel: 10, nivelDesde: "2024-01-01", puntajeTotal: 125, desglosado: false, fechaUltimoBienio: "2024-03-01", bieniosReconocidos: 5 } }),
      "2025-06-30",
      reglas,
    );
    expect(generarAlertas(alcanzado, reglas)).toContainEqual(expect.objectContaining({ tipo: "NIVEL_ALCANZADO", mensaje: "Cumple requisitos para el nivel 9 y su nivel vigente sigue en 10" }));

    const proximo = calcularEstadoCarrera(
      funcionario({ apertura: { fecha: "2024-12-31", nivel: 10, nivelDesde: "2024-01-01", puntajeTotal: 108, desglosado: false, fechaUltimoBienio: "2024-03-01", bieniosReconocidos: 5 } }),
      "2025-06-30",
      reglas,
    );
    expect(generarAlertas(proximo, reglas)).toContainEqual(expect.objectContaining({ tipo: "NIVEL_PROXIMO", mensaje: "Le faltan 12 puntos para el nivel 9" }));
  });

  it("cierre de período cercano con tope sin completar, calificación pendiente y documentos faltantes", () => {
    const estado = calcularEstadoCarrera(
      funcionario({
        fechaIngreso: "2025-01-15",
        capacitaciones: [{ nombre: "Curso sin certificado", horas: 40, fechaTermino: "2026-05-30", aprobado: true, conNota: true, periodo: 2026, documentoId: null }],
      }),
      "2026-11-15",
      reglas,
    );
    const alertas = generarAlertas(estado, reglas, { calificacionPendiente: { fechaCierre: "2026-12-15" } });
    const tipos = alertas.map((a) => a.tipo);
    expect(tipos).toContain("CAPACITACION_POR_VENCER_PERIODO");
    expect(tipos).toContain("CALIFICACION_PENDIENTE");
    expect(alertas.find((a) => a.tipo === "DOCUMENTO_FALTANTE")?.mensaje).toBe('Capacitación "Curso sin certificado" (2026) sin certificado adjunto');
    // Sin duplicados por clave
    expect(new Set(alertas.map((a) => a.clave)).size).toBe(alertas.length);
  });

  it("antes de la apertura no hay alertas", () => {
    const estado = calcularEstadoCarrera(
      funcionario({ apertura: { fecha: "2024-12-31", nivel: 10, nivelDesde: "2024-01-01", puntajeTotal: 100, desglosado: false } }),
      "2024-06-30",
      reglas,
    );
    expect(generarAlertas(estado, reglas)).toEqual([]);
  });
});
