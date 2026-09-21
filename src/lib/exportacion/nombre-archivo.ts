// Nombres de archivo predecibles (doc 06): nomina_al_2026-09-25.xlsx, carrera_12345678-9_al_2024-12-31.pdf.

import type { FiltrosReporte } from "@/lib/reportes/filtros";

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function nombreArchivo(archivo: string, filtros: FiltrosReporte, extension: string, alcance?: { rut?: string; establecimiento?: string }): string {
  const partes = [archivo];
  if (filtros.alcance === "funcionario" && alcance?.rut) partes.push(`${alcance.rut.slice(0, -1)}-${alcance.rut.slice(-1)}`);
  if (filtros.alcance === "establecimiento" && alcance?.establecimiento) partes.push(slug(alcance.establecimiento));
  partes.push(`al_${filtros.fecha}`);
  return `${partes.join("_")}.${extension}`;
}
