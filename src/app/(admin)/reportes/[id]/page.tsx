import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoReporte } from "@/components/dominio/encabezado-reporte";
import { TablaReporte } from "@/components/dominio/tabla-reporte";
import { buttonVariants } from "@/components/ui/button";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { hoyEnChile } from "@/lib/fechas/civil";
import { formatearRut } from "@/lib/formato";
import { definicionDe } from "@/lib/reportes/definiciones";
import { filtrosAQuery, leerFiltrosReporte, type ParametrosUrl } from "@/lib/reportes/filtros";
import { generarReporte } from "@/lib/reportes/generar";
import { FiltrosReporteForm } from "./filtros";
import { textosReportes as t } from "../textos";

const FILAS_POR_PAGINA = 100;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: definicionDe(id)?.nombre ?? t.titulo };
}

// Un reporte (doc 06, doc 13 F8): filtros, encabezado "Situación al", exportación y la tabla paginada.
export default async function ReportePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ParametrosUrl> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const { id } = await params;
  const definicion = definicionDe(id);
  if (!definicion) notFound();
  const institucionId = sesion.user.institucionId!;
  const filtros = leerFiltrosReporte(await searchParams, definicion.fechaPorDefecto?.(hoyEnChile()));

  const [reporte, establecimientos, funcionarios] = await Promise.all([
    generarReporte(institucionId, definicion, filtros, { name: sesion.user.name }),
    prisma.establecimiento.findMany({ where: { institucionId, activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.funcionario.findMany({ where: { institucionId }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], select: { id: true, nombres: true, apellidos: true, rut: true } }),
  ]);

  const query = filtrosAQuery(filtros);
  const maxFilas = Math.max(0, ...reporte.secciones.map((s) => s.filas.length));
  const paginas = Math.max(1, Math.ceil(maxFilas / FILAS_POR_PAGINA));
  const pagina = Math.min(filtros.pagina, paginas);
  const desde = (pagina - 1) * FILAS_POR_PAGINA;
  const hasta = desde + FILAS_POR_PAGINA;

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-xs text-tinta-secundaria">
        <Link href="/reportes" className="hover:underline">{t.volver}</Link>
      </nav>
      <div>
        <h1 className="text-xl font-semibold">
          {definicion.numero > 0 ? `${definicion.numero}. ` : ""}
          {definicion.nombre}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{definicion.descripcion}</p>
        {definicion.nota && <p className="mt-1 max-w-3xl text-xs text-tinta-secundaria">{definicion.nota}</p>}
      </div>

      <FiltrosReporteForm
        reporteId={definicion.id}
        filtros={filtros}
        establecimientos={establecimientos}
        funcionarios={funcionarios.map((f) => ({ id: f.id, etiqueta: `${f.apellidos}, ${f.nombres} · ${formatearRut(f.rut)}` }))}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex-1">
          <EncabezadoReporte contexto={reporte.contexto} textos={t.encabezado} />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch" aria-label={t.exportar.titulo}>
          <span className="text-xs text-tinta-secundaria md:hidden">{t.exportar.titulo}:</span>
          {(["xlsx", "csv", "pdf"] as const).map((formato) => (
            <a key={formato} href={`/reportes/${definicion.id}/exportar?${query}&formato=${formato}`} className={buttonVariants({ variant: formato === "xlsx" ? "default" : "outline" })} download>
              {t.exportar[formato]}
            </a>
          ))}
        </div>
      </div>

      {reporte.secciones.map((seccion) => (
        <TablaReporte key={seccion.id} seccion={seccion} desde={desde} hasta={hasta} conTitulo={reporte.secciones.length > 1} textos={t.tabla} />
      ))}

      {paginas > 1 && (
        <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Paginación">
          <span className="text-tinta-secundaria">{t.paginacion.mostrando(desde + 1, Math.min(hasta, maxFilas), maxFilas)}</span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link href={`/reportes/${definicion.id}?${filtrosAQuery(filtros, { pagina: String(pagina - 1) })}`} className={buttonVariants({ variant: "outline" })}>
                {t.paginacion.anterior}
              </Link>
            )}
            {pagina < paginas && (
              <Link href={`/reportes/${definicion.id}?${filtrosAQuery(filtros, { pagina: String(pagina + 1) })}`} className={buttonVariants({ variant: "outline" })}>
                {t.paginacion.siguiente}
              </Link>
            )}
          </div>
        </nav>
      )}
      <p className="text-xs text-tinta-secundaria">{reporte.secciones.map((s) => `${s.titulo}: ${t.filas(s.filas.length)}`).join(" · ")}</p>
    </div>
  );
}
