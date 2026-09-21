// Documentos adjuntos (BT 4.8, doc 05 §7): registro del archivo guardado en disco y vínculo con el hecho que
// respalda (bienio, capacitación, estudio, nivel o experiencia). Todo auditado.

import type { Documento, TipoDocumento } from "@/generated/prisma/client";
import { conAuditoria, type ContextoAuditoria } from "./auditado";
import { diffCampos } from "./diff-campos";

export interface DatosDocumento {
  institucionId: string;
  funcionarioId: string | null;
  tipo: TipoDocumento;
  nombre: string;
  ruta: string;
  mime: string;
  tamano: number;
  hash: string;
}

export const ENTIDADES_VINCULABLES = ["capacitacion", "bienio", "estudio", "nivel", "experiencia"] as const;
export type EntidadVinculable = (typeof ENTIDADES_VINCULABLES)[number];

export async function crearDocumento(ctx: ContextoAuditoria, datos: DatosDocumento): Promise<Documento> {
  return conAuditoria(ctx, "CREAR", "Documento", async (tx) => {
    const creado = await tx.documento.create({ data: { ...datos, subidoPorId: ctx.usuarioId } });
    return { resultado: creado, entidadId: creado.id, despues: { nombre: creado.nombre, tipo: creado.tipo, funcionarioId: creado.funcionarioId, tamano: creado.tamano, hash: creado.hash } };
  });
}

/** Asocia el documento al registro que respalda; el registro debe ser del mismo funcionario. */
export async function vincularDocumento(ctx: ContextoAuditoria, entidad: EntidadVinculable, id: string, documentoId: string, funcionarioId: string): Promise<void> {
  const entidadNombre = { capacitacion: "Capacitacion", bienio: "Bienio", estudio: "Estudio", nivel: "NivelHistorico", experiencia: "Experiencia" }[entidad];
  await conAuditoria(ctx, "EDITAR", entidadNombre, async (tx) => {
    const tabla = { capacitacion: tx.capacitacion, bienio: tx.bienio, estudio: tx.estudio, nivel: tx.nivelHistorico, experiencia: tx.experiencia }[entidad];
    // Cada delegado tiene su propio tipo; el vínculo usa solo where/data comunes (id, funcionarioId, documentoId)
    const antes = await (tabla as typeof tx.capacitacion).findFirst({ where: { id, funcionarioId } });
    if (!antes) throw new Error("El registro no existe o no pertenece al funcionario.");
    const despues = await (tabla as typeof tx.capacitacion).update({ where: { id }, data: { documentoId } });
    return { resultado: undefined, entidadId: id, ...diffCampos({ documentoId: antes.documentoId }, { documentoId: despues.documentoId }), detalle: "Documento de respaldo adjuntado" };
  });
}
