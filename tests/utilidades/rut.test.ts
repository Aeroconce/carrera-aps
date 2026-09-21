import { describe, expect, it } from "vitest";
import { digitoVerificador, formatearRut, generarRutConDv, limpiarRut, validarRut } from "@/lib/rut";

describe("rut", () => {
  it("calcula el dígito verificador, incluido K y 0", () => {
    expect(digitoVerificador(11111111)).toBe("1");
    expect(digitoVerificador(12345678)).toBe("5");
    expect(digitoVerificador(22222222)).toBe("2");
    expect(digitoVerificador(7654321)).toBe("6");
    expect(digitoVerificador(6000000)).toBe("K");
    expect(digitoVerificador(26685098)).toBe("0");
  });

  it("valida con y sin formato, y rechaza el verificador incorrecto o un número corto", () => {
    expect(validarRut("12.345.678-5")).toBe(true);
    expect(validarRut("123456785")).toBe(true);
    expect(validarRut("6.000.000-k")).toBe(true);
    expect(validarRut("12.345.678-9")).toBe(false);
    expect(validarRut("1-9")).toBe(false);
    expect(validarRut("")).toBe(false);
  });

  it("limpia y formatea", () => {
    expect(limpiarRut("12.345.678-k")).toBe("12345678K");
    expect(formatearRut("123456785")).toBe("12.345.678-5");
    expect(formatearRut("6000000K")).toBe("6.000.000-K");
    expect(formatearRut("12.345.678-5")).toBe("12.345.678-5");
  });

  it("genera RUT válidos para el seed", () => {
    const rut = generarRutConDv(12345678);
    expect(rut).toBe("123456785");
    expect(validarRut(rut)).toBe(true);
  });
});
