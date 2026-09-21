"use server";

// Server actions de Documentos (BT 4.8, doc 05 §7): subir (PDF, JPG o PNG hasta 10 MB) con tipo, funcionario
// opcional y vínculo opcional con el hecho que respalda; la alerta DOCUMENTO_FALTANTE se resuelve al sincronizar.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion } from "@/lib/auth/sesion";
import { sincronizarAlertasDeFuncionario } from "@/lib/db/alertas";
import { crearDocumento, ENTIDADES_VINCULABLES, vincularDocumento, type EntidadVinculable } from "@/lib/db/documentos";
import { prisma } from "@/lib/db/prisma";
import { guardarArchivo, TAMANO_MAXIMO_DOCUMENTO } from "@/lib/documentos/almacenamiento";
import { errorInterno, type RespuestaAccion } from "./tipos";

const TIPOS = ["CERTIFICADO_CAPACITACION", "TITULO", "RESOLUCION", "DECRETO", "ACTA", "CONTRATO", "OTRO"] as const;

const esquema = z.object({
  tipo: z.enum(TIPOS, { error: "Elige un tipo." }),
  nombre: z.string().trim().max(200).optional(),
  funcionarioId: z.string().trim().optional(),
  vincular: z.string().trim().optional(),
});

function validacion(campos: Record<string, string[]>, mensaje = "Revisa los campos marcados."): RespuestaAccion<never> {
  return { ok: false, error: { codigo: "VALIDACION", mensaje, campos } };
}

export async function subirDocumentoAction(fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return validacion({ archivo: ["Elige un archivo PDF, JPG o PNG."] });
  if (archivo.size > TAMANO_MAXIMO_DOCUMENTO) return validacion({ archivo: ["El archivo supera 10 MB."] });
  const datos = esquema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!datos.success) return validacion({ tipo: datos.error.issues.map((i) => i.message) });

  const funcionarioId = datos.data.funcionarioId || null;
  if (funcionarioId) {
    const f = await prisma.funcionario.findFirst({ where: { id: funcionarioId, institucionId }, select: { id: true } });
    if (!f) return validacion({ funcionarioId: ["El funcionario no existe en tu institución."] });
  }
  let vinculo: { entidad: EntidadVinculable; id: string } | null = null;
  if (datos.data.vincular) {
    const [entidad, id] = datos.data.vincular.split(":");
    if (!funcionarioId || !entidad || !id || !(ENTIDADES_VINCULABLES as readonly string[]).includes(entidad)) return validacion({ vincular: ["Vínculo inválido."] });
    vinculo = { entidad: entidad as EntidadVinculable, id };
  }

  try {
    const contenido = new Uint8Array(await archivo.arrayBuffer());
    const guardado = await guardarArchivo(institucionId, contenido);
    const ctx = { usuarioId: sesion.user.id };
    const documento = await crearDocumento(ctx, {
      institucionId,
      funcionarioId,
      tipo: datos.data.tipo,
      nombre: datos.data.nombre || archivo.name,
      ruta: guardado.ruta,
      mime: guardado.mime,
      tamano: guardado.tamano,
      hash: guardado.hash,
    });
    if (vinculo && funcionarioId) {
      await vincularDocumento(ctx, vinculo.entidad, vinculo.id, documento.id, funcionarioId);
      await sincronizarAlertasDeFuncionario(ctx, funcionarioId).catch((error) => console.error("alertas tras adjuntar", error));
    }
    revalidatePath("/documentos");
    if (funcionarioId) revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: documento.id } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Tipo de archivo")) return validacion({ archivo: [error.message] });
    console.error("subirDocumentoAction", error);
    return errorInterno();
  }
}
