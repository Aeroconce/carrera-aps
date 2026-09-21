import { describe, expect, it } from "vitest";
import {
  aDate,
  comparar,
  desdeDate,
  diasEntre,
  fechaCivil,
  formatearChileno,
  hoyEnChile,
  parsearChileno,
  sumarAnios,
  sumarDias,
} from "@/lib/fechas/civil";

describe("fechas civiles", () => {
  it("valida formato y existencia del día", () => {
    expect(fechaCivil("2026-02-28")).toBe("2026-02-28");
    expect(() => fechaCivil("2025-02-30")).toThrow("inexistente");
    expect(() => fechaCivil("28/02/2026")).toThrow("AAAA-MM-DD");
  });

  it("convierte desde y hacia Date en UTC, como una columna DATE de Prisma", () => {
    const fecha = aDate("2026-03-01");
    expect(fecha.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(desdeDate(fecha)).toBe("2026-03-01");
    // Un Date con hora en cualquier zona se lee por sus componentes UTC
    expect(desdeDate(new Date("2026-03-01T23:59:59Z"))).toBe("2026-03-01");
  });

  it("suma días y años; el 29 de febrero cae al 28 en años no bisiestos", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(sumarAnios("2014-03-01", 2)).toBe("2016-03-01");
    expect(sumarAnios("2024-02-29", 2)).toBe("2026-02-28");
    expect(sumarAnios("2024-02-29", 4)).toBe("2028-02-29");
  });

  it("cuenta días entre fechas y compara", () => {
    expect(diasEntre("2014-03-01", "2016-03-01")).toBe(731);
    expect(diasEntre("2026-01-01", "2025-12-31")).toBe(-1);
    expect(comparar("2026-01-01", "2026-01-02")).toBe(-1);
    expect(comparar("2026-01-02", "2026-01-02")).toBe(0);
  });

  it("formatea y parsea dd/mm/aaaa", () => {
    expect(formatearChileno("2026-09-25")).toBe("25/09/2026");
    expect(parsearChileno("25/09/2026")).toBe("2026-09-25");
    expect(parsearChileno("1/3/2014")).toBe("2014-03-01");
    expect(() => parsearChileno("31/02/2026")).toThrow();
  });

  it("calcula hoy en Chile a partir del instante, no de la zona del servidor", () => {
    // 02:30 UTC del 13 de septiembre es todavía 12 de septiembre en Chile (UTC-3 en horario de verano)
    expect(hoyEnChile(new Date("2026-09-13T02:30:00Z"))).toBe("2026-09-12");
    expect(hoyEnChile(new Date("2026-09-13T03:30:00Z"))).toBe("2026-09-13");
  });
});
