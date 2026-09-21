import { notFound } from "next/navigation";
import { EncabezadoReporte } from "@/components/dominio/encabezado-reporte";
import { TablaReporte } from "@/components/dominio/tabla-reporte";
import { verificarToken } from "@/lib/exportacion/token";
import { hoyEnChile } from "@/lib/fechas/civil";
import { definicionDe } from "@/lib/reportes/definiciones";
import { leerFiltrosReporte } from "@/lib/reportes/filtros";
import { generarReporte } from "@/lib/reportes/generar";
import { textosReportes as t } from "@/app/(admin)/reportes/textos";

export const dynamic = "force-dynamic";

interface CargaToken extends Record<string, unknown> {
  institucionId: string;
  reporteId: string;
  filtros: string;
  usuario: string;
}

// Vista que imprime Chromium para el PDF (doc 10): mismo encabezado y misma tabla que la pantalla, sin paginar.
export default async function ImprimirReportePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const { id } = await params;
  const { token } = await searchParams;
  const carga = verificarToken<CargaToken>(token);
  const definicion = definicionDe(id);
  if (!carga || !definicion || carga.reporteId !== id) notFound();

  const filtros = leerFiltrosReporte(Object.fromEntries(new URLSearchParams(carga.filtros).entries()), definicion.fechaPorDefecto?.(hoyEnChile()));
  const reporte = await generarReporte(carga.institucionId, definicion, filtros, { name: carga.usuario });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">
        {definicion.numero > 0 ? `${definicion.numero}. ` : ""}
        {definicion.nombre}
      </h1>
      <EncabezadoReporte contexto={reporte.contexto} textos={t.encabezado} imprimir />
      {reporte.secciones.map((seccion) => (
        <TablaReporte key={seccion.id} seccion={seccion} conTitulo={reporte.secciones.length > 1} textos={t.tabla} imprimir />
      ))}
      {definicion.nota && <p className="text-[9px] text-tinta-secundaria">{definicion.nota}</p>}
    </div>
  );
}
