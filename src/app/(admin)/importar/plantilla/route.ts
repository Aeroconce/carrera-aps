// Descarga de la plantilla de carga inicial (doc 08).

import { exigirSesion } from "@/lib/auth/sesion";
import { hoyEnChile, sumarDias, formatearChileno } from "@/lib/fechas/civil";
import { generarPlantilla, NOMBRE_PLANTILLA } from "@/lib/importacion/plantilla";

export async function GET() {
  await exigirSesion({ roles: ["ADMIN"] });
  const contenido = await generarPlantilla(formatearChileno(sumarDias(hoyEnChile(), -1)));
  return new Response(new Blob([contenido as BlobPart]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${NOMBRE_PLANTILLA}"`,
      "Cache-Control": "no-store",
    },
  });
}
