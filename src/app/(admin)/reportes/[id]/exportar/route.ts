// Descarga de un reporte (doc 06, doc 13 F8): XLSX, CSV o PDF, completo (sin paginar), con auditoría EXPORTAR.
// El PDF lo produce Chromium en el servidor imprimiendo la vista /imprimir/reportes/<id> con un token firmado.

import { type NextRequest } from "next/server";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { registrarExportacion } from "@/lib/db/exportaciones";
import { reporteACsv } from "@/lib/exportacion/csv";
import { nombreArchivo } from "@/lib/exportacion/nombre-archivo";
import { imprimirPdf } from "@/lib/exportacion/pdf";
import { firmarToken } from "@/lib/exportacion/token";
import { reporteAXlsx } from "@/lib/exportacion/xlsx";
import { formatearChileno, hoyEnChile } from "@/lib/fechas/civil";
import { definicionDe } from "@/lib/reportes/definiciones";
import { filtrosAQuery, leerFiltrosReporte, type FiltrosReporte } from "@/lib/reportes/filtros";
import { generarReporte } from "@/lib/reportes/generar";

const TIPOS = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
} as const;

type Formato = keyof typeof TIPOS;

function parametrosDe(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function nombreDeArchivo(archivo: string, filtros: FiltrosReporte, formato: Formato): Promise<string> {
  const [funcionario, establecimiento] = await Promise.all([
    filtros.funcionarioId ? prisma.funcionario.findUnique({ where: { id: filtros.funcionarioId }, select: { rut: true } }) : null,
    filtros.establecimientoId ? prisma.establecimiento.findUnique({ where: { id: filtros.establecimientoId }, select: { nombre: true } }) : null,
  ]);
  return nombreArchivo(archivo, filtros, formato, { rut: funcionario?.rut, establecimiento: establecimiento?.nombre });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const { id } = await params;
  const definicion = definicionDe(id);
  const parametros = parametrosDe(request);
  const formato = parametros.formato as Formato | undefined;
  if (!definicion || !formato || !(formato in TIPOS)) {
    return new Response("Reporte o formato desconocido", { status: 404 });
  }
  const institucionId = sesion.user.institucionId!;
  const filtros = leerFiltrosReporte(parametros, definicion.fechaPorDefecto?.(hoyEnChile()));
  const usuario = { name: sesion.user.name };

  try {
    const reporte = await generarReporte(institucionId, definicion, filtros, usuario);
    let cuerpo: Uint8Array | string;
    if (formato === "xlsx") {
      cuerpo = await reporteAXlsx(reporte);
    } else if (formato === "csv") {
      cuerpo = reporteACsv(reporte);
    } else {
      const token = firmarToken({ institucionId, reporteId: definicion.id, filtros: filtrosAQuery(filtros), usuario: usuario.name });
      const base = process.env.INTERNAL_BASE_URL || request.nextUrl.origin;
      cuerpo = await imprimirPdf(`${base}/imprimir/reportes/${definicion.id}?token=${encodeURIComponent(token)}`, {
        encabezado: `${reporte.contexto.institucion} · ${reporte.nombre}`,
        pie: `Situación al ${formatearChileno(filtros.fecha)} · ${reporte.contexto.alcance} · ${usuario.name}`,
      });
    }
    const nombre = await nombreDeArchivo(reporte.archivo, filtros, formato);
    await registrarExportacion(
      { usuarioId: sesion.user.id },
      {
        reporteId: definicion.id,
        nombre: reporte.nombre,
        formato,
        alcance: reporte.contexto.alcance,
        fechaCorte: filtros.fecha,
        filtros: { ...filtros },
        filas: reporte.secciones.reduce((s, x) => s + x.filas.length, 0),
      },
    );
    return new Response(typeof cuerpo === "string" ? cuerpo : new Blob([cuerpo as BlobPart]), {
      headers: {
        "Content-Type": TIPOS[formato],
        "Content-Disposition": `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("exportar reporte", definicion.id, formato, error);
    return new Response("No se pudo generar el archivo. Reintenta; si persiste, avisa al administrador.", { status: 500 });
  }
}
