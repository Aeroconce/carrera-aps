import { describe, expect, it } from "vitest";
import { aJson, diffCampos, hayCambios } from "@/lib/db/diff-campos";

/** Imita Prisma.Decimal: expone toJSON como texto, igual que decimal.js. */
function decimal(valor: string) {
  return { toJSON: () => valor, toString: () => valor };
}

describe("diffCampos", () => {
  it("sin cambios devuelve objetos vacíos", () => {
    const registro = { nombre: "María", horas: 40, aprobado: true };
    const diferencia = diffCampos(registro, { ...registro });
    expect(diferencia).toEqual({ antes: {}, despues: {} });
    expect(hayCambios(diferencia)).toBe(false);
  });

  it("solo incluye los campos que cambiaron, con valor anterior y nuevo", () => {
    const diferencia = diffCampos(
      { nombre: "María", horas: 40, aprobado: true },
      { nombre: "María", horas: 44, aprobado: false },
    );
    expect(diferencia).toEqual({
      antes: { horas: 40, aprobado: true },
      despues: { horas: 44, aprobado: false },
    });
    expect(hayCambios(diferencia)).toBe(true);
  });

  it("ignora updatedAt y los campos indicados en ignorar", () => {
    const diferencia = diffCampos(
      { cargo: "Técnico", updatedAt: new Date("2026-01-01"), interno: 1 },
      { cargo: "Técnico", updatedAt: new Date("2026-02-01"), interno: 2 },
      { ignorar: ["interno"] },
    );
    expect(hayCambios(diferencia)).toBe(false);
  });

  it("compara fechas por instante y las serializa en ISO 8601", () => {
    const igual = diffCampos({ fecha: new Date("2026-03-01T00:00:00Z") }, { fecha: new Date("2026-03-01T00:00:00Z") });
    expect(hayCambios(igual)).toBe(false);

    const distinta = diffCampos({ fecha: new Date("2026-03-01T00:00:00Z") }, { fecha: new Date("2026-03-02T00:00:00Z") });
    expect(distinta.antes).toEqual({ fecha: "2026-03-01T00:00:00.000Z" });
    expect(distinta.despues).toEqual({ fecha: "2026-03-02T00:00:00.000Z" });
  });

  it("compara Decimal por su valor y BigInt por texto", () => {
    const igual = diffCampos({ puntaje: decimal("10") }, { puntaje: decimal("10") });
    expect(hayCambios(igual)).toBe(false);

    const distinta = diffCampos({ puntaje: decimal("10"), tamano: 5n }, { puntaje: decimal("12.5"), tamano: 6n });
    expect(distinta.antes).toEqual({ puntaje: "10", tamano: "5" });
    expect(distinta.despues).toEqual({ puntaje: "12.5", tamano: "6" });
  });

  it("trata null y undefined como el mismo sin valor", () => {
    const diferencia = diffCampos({ email: null }, { email: undefined });
    expect(hayCambios(diferencia)).toBe(false);
  });

  it("compara objetos y arreglos por contenido, sin importar el orden de las claves", () => {
    const igual = diffCampos({ parametros: { b: 1, a: [1, 2] } }, { parametros: { a: [1, 2], b: 1 } });
    expect(hayCambios(igual)).toBe(false);

    const distinta = diffCampos({ parametros: { a: [1, 2] } }, { parametros: { a: [1, 3] } });
    expect(distinta.despues).toEqual({ parametros: { a: [1, 3] } });
  });

  it("en una creación deja el valor anterior en null", () => {
    const diferencia = diffCampos(null, { rut: "123456785", nombres: "Juan" });
    expect(diferencia.antes).toEqual({ rut: null, nombres: null });
    expect(diferencia.despues).toEqual({ rut: "123456785", nombres: "Juan" });
  });
});

describe("aJson", () => {
  it("convierte valores no serializables y ordena claves", () => {
    expect(aJson({ z: new Date("2026-01-01T00:00:00Z"), a: 1n, m: decimal("3.5") })).toEqual({
      a: "1",
      m: "3.5",
      z: "2026-01-01T00:00:00.000Z",
    });
    expect(JSON.stringify(aJson({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}');
  });
});
