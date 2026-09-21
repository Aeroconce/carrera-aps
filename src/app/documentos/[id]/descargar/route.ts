// Descarga autenticada de un documento (doc 03: los archivos viven fuera de /public y se sirven solo por aquí).
// ADMIN y SUPERVISION: cualquier documento de su institución. FUNCIONARIO: solo los propios (BT 10).

import { notFound } from "next/navigation";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { leerArchivo } from "@/lib/documentos/almacenamiento";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await exigirSesion();
  const { id } = await params;
  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento || documento.institucionId !== sesion.user.institucionId) notFound();
  const rol = rolDe(sesion.user);
  if (rol === "FUNCIONARIO" && documento.funcionarioId !== sesion.user.funcionarioId) {
    return new Response("Sin permiso", { status: 403 });
  }
  const contenido = await leerArchivo(documento.ruta);
  const nombre = documento.nombre.replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, "_");
  return new Response(new Blob([contenido as BlobPart]), {
    headers: {
      "Content-Type": documento.mime,
      "Content-Disposition": `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
