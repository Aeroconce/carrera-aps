// Detalle legible de una entrada de auditoría (doc 13 F10): los campos cambiados con valor anterior y nuevo,
// lado a lado. Funciona con diffs (solo campos cambiados) y con registros completos (creaciones).

import { ETIQUETAS_AUDITORIA } from "./etiquetas";

export interface FilaCambio {
  campo: string;
  etiqueta: string;
  antes: string;
  despues: string;
}

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;
const OCULTOS = new Set(["id", "createdAt", "updatedAt", "institucionId"]);

export function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number") return String(valor).replace(".", ",");
  if (typeof valor === "string") {
    const m = FECHA_ISO.exec(valor);
    if (m) {
      const esMedianoche = valor.endsWith("T00:00:00.000Z");
      const fecha = `${m[3]}/${m[2]}/${m[1]}`;
      if (esMedianoche) return fecha;
      const instante = new Date(valor);
      return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(instante);
    }
    return valor;
  }
  return JSON.stringify(valor);
}

function aplanar(valor: unknown, prefijo = "", salida: Record<string, unknown> = {}, nivel = 0): Record<string, unknown> {
  if (valor && typeof valor === "object" && !Array.isArray(valor) && nivel < 2) {
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      const clave = prefijo ? `${prefijo}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) aplanar(v, clave, salida, nivel + 1);
      else salida[clave] = v;
    }
    return salida;
  }
  if (prefijo) salida[prefijo] = valor;
  return salida;
}

function etiquetaDe(campo: string): string {
  const partes = campo.split(".");
  const ultimo = partes[partes.length - 1] ?? campo;
  const base = ETIQUETAS_AUDITORIA.campo[ultimo] ?? ultimo;
  return partes.length > 1 ? `${ETIQUETAS_AUDITORIA.entidad[partes[0]!] ?? partes[0]} · ${base}` : base;
}

/** Filas campo/antes/después para mostrar. Omite los técnicos (id, createdAt) y los que no cambian. */
export function filasDeCambio(antes: unknown, despues: unknown): FilaCambio[] {
  const a = aplanar(antes ?? {});
  const d = aplanar(despues ?? {});
  const claves = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter((k) => !OCULTOS.has(k.split(".").pop() ?? k));
  return claves
    .map((campo) => ({ campo, etiqueta: etiquetaDe(campo), antes: formatearValor(a[campo]), despues: formatearValor(d[campo]) }))
    .filter((f) => f.antes !== f.despues || antes == null);
}
