import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { formatearFechaHora, formatearTamano } from "@/lib/formato";
import { textosExportacion as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

interface DetalleExportacion {
  filtros?: { archivos?: number; tamano?: number; hash?: string };
}

// Exportación integral (doc 05 §14, doc 06, subcriterio 12): qué contiene, botón que genera el ZIP e historial.
export default async function ExportacionIntegralPage() {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const historial = await prisma.auditoria.findMany({
    where: { accion: "EXPORTAR", entidad: "Reporte", entidadId: "exportacion-integral", usuario: { institucionId: sesion.user.institucionId! } },
    include: { usuario: { select: { name: true } } },
    orderBy: { fecha: "desc" },
    take: 20,
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-linea bg-superficie p-4 lg:col-span-2">
          <h2 className="text-sm font-medium">{t.contenido.titulo}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tinta-secundaria">
            {t.contenido.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col justify-center gap-3 rounded-lg border border-institucional bg-institucional-suave p-4 text-tinta">
          <a href="/exportacion-integral/descargar" className={buttonVariants({ className: "w-full" })} download>
            {t.generar}
          </a>
          <p className="text-xs">{t.nota}</p>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{t.historial}</h2>
        {historial.length === 0 ? (
          <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.sinHistorial}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columnas.fecha}</TableHead>
                  <TableHead>{t.columnas.usuario}</TableHead>
                  <TableHead className="text-right">{t.columnas.archivos}</TableHead>
                  <TableHead className="text-right">{t.columnas.tamano}</TableHead>
                  <TableHead>{t.columnas.hash}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((h) => {
                  const detalle = (h.despues ?? {}) as DetalleExportacion;
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap">{formatearFechaHora(h.fecha)}</TableCell>
                      <TableCell>{h.usuario.name}</TableCell>
                      <TableCell className="text-right">{detalle.filtros?.archivos ?? ""}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{detalle.filtros?.tamano ? formatearTamano(detalle.filtros.tamano) : ""}</TableCell>
                      <TableCell className="max-w-48 truncate font-mono text-xs" title={detalle.filtros?.hash}>{detalle.filtros?.hash?.slice(0, 16) ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
