// Reglas de una institución, de la base al motor (doc 03: `reglasVigentes`).
// El motor recibe todas las versiones y resuelve la vigente a la fecha de cada hecho; por eso se cargan
// completas. Los ids son los de la base: Bienio.reglaId y Capacitacion.reglaId apuntan a ellos.

import { prisma } from "@/lib/db/prisma";
import { desdeDate } from "@/lib/fechas/civil";
import { ConjuntoReglas, type ReglaFila } from "@/lib/motor/reglas";
import type { ReglaCarrera } from "@/generated/prisma/client";

export function aReglaFila(regla: ReglaCarrera): ReglaFila {
  return {
    id: regla.id,
    tipo: regla.tipo,
    categoria: regla.categoria,
    vigenteDesde: desdeDate(regla.vigenteDesde),
    vigenteHasta: regla.vigenteHasta ? desdeDate(regla.vigenteHasta) : null,
    parametros: regla.parametros,
    fuente: regla.fuente,
  };
}

export async function cargarReglas(institucionId: string): Promise<ConjuntoReglas> {
  const filas = await prisma.reglaCarrera.findMany({ where: { institucionId }, orderBy: { vigenteDesde: "asc" } });
  return new ConjuntoReglas(filas.map(aReglaFila));
}
