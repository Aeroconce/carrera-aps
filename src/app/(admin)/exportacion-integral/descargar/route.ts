// Genera y descarga la exportación integral (doc 06, subcriterio 12). Solo ADMIN; queda como EXPORTAR.

import { exigirSesion } from "@/lib/auth/sesion";
import { registrarExportacion } from "@/lib/db/exportaciones";
import { generarExportacionIntegral } from "@/lib/exportacion/integral";
import { hoyEnChile } from "@/lib/fechas/civil";

export const maxDuration = 300;

export async function GET() {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  try {
    const r = await generarExportacionIntegral(sesion.user.institucionId!, { name: sesion.user.name });
    await registrarExportacion(
      { usuarioId: sesion.user.id },
      { reporteId: "exportacion-integral", nombre: "Exportación integral", formato: "xlsx", alcance: "Dotación completa, base de datos y documentos", fechaCorte: hoyEnChile(), filtros: { archivos: r.archivos, tamano: r.tamano, hash: r.hash, advertencias: r.advertencias }, filas: r.archivos },
    );
    return new Response(new Blob([r.contenido as BlobPart]), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${r.nombre}"`,
        "Content-Length": String(r.tamano),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("exportación integral", error);
    return new Response("No se pudo generar la exportación. Reintenta; si persiste, avisa al administrador.", { status: 500 });
  }
}
