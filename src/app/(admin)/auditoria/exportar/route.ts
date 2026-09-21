// Exportación de la bitácora (doc 05 §11: "Exportable"): XLSX o CSV con los filtros vigentes, completa.

import type { NextRequest } from "next/server";
import { listarAuditoria } from "@/lib/auditoria/consulta";
import { filasDeCambio } from "@/lib/auditoria/detalle";
import { ETIQUETAS_AUDITORIA } from "@/lib/auditoria/etiquetas";
import { exigirSesion } from "@/lib/auth/sesion";
import { registrarExportacion } from "@/lib/db/exportaciones";
import { prisma } from "@/lib/db/prisma";
import { reporteACsv } from "@/lib/exportacion/csv";
import { reporteAXlsx } from "@/lib/exportacion/xlsx";
import { hoyEnChile } from "@/lib/fechas/civil";
import { nombreCompleto } from "@/lib/formato";
import type { ReporteGenerado } from "@/lib/reportes/tipos";
import { leerFiltrosAuditoria } from "../filtros-lectura";

const TIPOS = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv; charset=utf-8" } as const;

export async function GET(request: NextRequest) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const parametros = Object.fromEntries(request.nextUrl.searchParams.entries());
  const formato = parametros.formato as keyof typeof TIPOS | undefined;
  if (!formato || !(formato in TIPOS)) return new Response("Formato desconocido", { status: 404 });
  const institucionId = sesion.user.institucionId!;
  const filtros = leerFiltrosAuditoria(parametros);

  try {
    const [{ filas }, institucion] = await Promise.all([
      listarAuditoria(institucionId, { ...filtros, pagina: 1 }, 100_000),
      prisma.institucion.findUniqueOrThrow({ where: { id: institucionId }, select: { nombre: true } }),
    ]);
    const hoy = hoyEnChile();
    const reporte: ReporteGenerado = {
      id: "auditoria",
      numero: 0,
      nombre: "Bitácora de auditoría",
      descripcion: "",
      archivo: "auditoria",
      secciones: [
        {
          id: "auditoria",
          titulo: "Bitácora",
          columnas: [
            { clave: "fecha", titulo: "Fecha", tipo: "texto", ancho: 18 },
            { clave: "usuario", titulo: "Usuario", tipo: "texto", ancho: 24 },
            { clave: "accion", titulo: "Acción", tipo: "texto", ancho: 16 },
            { clave: "entidad", titulo: "Entidad", tipo: "texto", ancho: 18 },
            { clave: "entidadId", titulo: "Id del registro", tipo: "texto", ancho: 38 },
            { clave: "funcionario", titulo: "Funcionario afectado", tipo: "texto", ancho: 30 },
            { clave: "detalle", titulo: "Detalle", tipo: "texto", ancho: 40 },
            { clave: "cambios", titulo: "Cambios (campo: anterior → nuevo)", tipo: "texto", ancho: 80 },
          ],
          filas: filas.map((e) => ({
            fecha: new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "medium" }).format(e.fecha),
            usuario: e.usuario.name,
            accion: ETIQUETAS_AUDITORIA.accion[e.accion] ?? e.accion,
            entidad: ETIQUETAS_AUDITORIA.entidad[e.entidad] ?? e.entidad,
            entidadId: e.entidadId,
            funcionario: e.funcionario ? nombreCompleto(e.funcionario) : null,
            detalle: e.detalle,
            cambios: filasDeCambio(e.antes, e.despues).map((c) => `${c.etiqueta}: ${c.antes} → ${c.despues}`).join("; "),
          })),
        },
      ],
      contexto: {
        institucion: institucion.nombre,
        fechaCorte: hoy,
        generadoEl: new Date(),
        generadoPor: sesion.user.name,
        alcance: "Bitácora completa con los filtros indicados",
        filtros: Object.entries(filtros).filter(([k, v]) => v && k !== "pagina").map(([k, v]) => ({ etiqueta: k, valor: String(v) })),
        reglas: [],
        totalFuncionarios: 0,
      },
    };
    const cuerpo = formato === "xlsx" ? await reporteAXlsx(reporte) : reporteACsv(reporte);
    const nombre = `auditoria_${hoy}.${formato}`;
    await registrarExportacion({ usuarioId: sesion.user.id }, { reporteId: "auditoria", nombre: reporte.nombre, formato, alcance: reporte.contexto.alcance, fechaCorte: hoy, filtros: { ...filtros }, filas: filas.length });
    return new Response(typeof cuerpo === "string" ? cuerpo : new Blob([cuerpo as BlobPart]), {
      headers: { "Content-Type": TIPOS[formato], "Content-Disposition": `attachment; filename="${nombre}"`, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("exportar auditoría", error);
    return new Response("No se pudo generar el archivo. Reintenta; si persiste, avisa al administrador.", { status: 500 });
  }
}
