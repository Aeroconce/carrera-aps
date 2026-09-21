// Reglas del reglamento comunal (doc 05 módulo 10, doc 13 F12): nunca se editan, se cierra la vigente y se
// crea una versión nueva. Ambas operaciones quedan auditadas como CAMBIO_REGLA.

import { aDate, sumarDias, type FechaCivil } from "@/lib/fechas/civil";
import { esquemasParametros, type Categoria, type TipoRegla } from "@/lib/motor/reglas";
import type { Prisma } from "@/generated/prisma/client";
import { conAuditoria, type ContextoAuditoria } from "./auditado";

export interface DatosRegla {
  tipo: TipoRegla;
  categoria: Categoria | null;
  vigenteDesde: FechaCivil;
  vigenteHasta?: FechaCivil | null;
  parametros: unknown;
  fuente: string;
}

/** Crea una regla validando sus parámetros. Si `cerrarAnterior`, la versión vigente del mismo tipo y categoría se cierra el día anterior. */
export async function crearRegla(ctx: ContextoAuditoria, institucionId: string, datos: DatosRegla, cerrarAnterior = true) {
  const validacion = esquemasParametros[datos.tipo].safeParse(datos.parametros);
  if (!validacion.success) {
    throw new Error(`Parámetros inválidos para ${datos.tipo}: ${validacion.error.message}`);
  }
  return conAuditoria(ctx, "CAMBIO_REGLA", "ReglaCarrera", async (tx) => {
    let anterior = null;
    if (cerrarAnterior) {
      anterior = await tx.reglaCarrera.findFirst({
        where: { institucionId, tipo: datos.tipo, categoria: datos.categoria, vigenteHasta: null },
        orderBy: { vigenteDesde: "desc" },
      });
      if (anterior) {
        await tx.reglaCarrera.update({ where: { id: anterior.id }, data: { vigenteHasta: aDate(sumarDias(datos.vigenteDesde, -1)) } });
      }
    }
    const creada = await tx.reglaCarrera.create({
      data: {
        institucionId,
        tipo: datos.tipo,
        categoria: datos.categoria,
        vigenteDesde: aDate(datos.vigenteDesde),
        vigenteHasta: datos.vigenteHasta ? aDate(datos.vigenteHasta) : null,
        parametros: validacion.data as Prisma.InputJsonValue,
        fuente: datos.fuente,
        creadoPorId: ctx.usuarioId,
      },
    });
    return {
      resultado: creada,
      entidadId: creada.id,
      antes: anterior ? { reglaAnteriorId: anterior.id, vigenteHasta: null } : undefined,
      despues: { tipo: creada.tipo, categoria: creada.categoria, vigenteDesde: creada.vigenteDesde, parametros: creada.parametros },
      detalle: datos.fuente,
    };
  });
}
