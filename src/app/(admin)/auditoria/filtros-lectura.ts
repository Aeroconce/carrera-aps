// Lectura de los filtros de la bitácora desde la URL (compartida por la página y la exportación).

import { ACCIONES_AUDITORIA } from "@/lib/auditoria/etiquetas";
import type { FiltrosAuditoria } from "@/lib/auditoria/consulta";
import { leerFecha } from "@/lib/reportes/filtros";
import type { AccionAuditoria } from "@/generated/prisma/client";

export function leerFiltrosAuditoria(params: Record<string, string | string[] | undefined>): FiltrosAuditoria {
  const uno = (k: string) => (typeof params[k] === "string" && (params[k] as string).trim() ? (params[k] as string).trim() : undefined);
  const accion = uno("accion");
  const pagina = Number(uno("pagina") ?? "1");
  return {
    desde: leerFecha(uno("desde")) ?? undefined,
    hasta: leerFecha(uno("hasta")) ?? undefined,
    usuarioId: uno("usuario"),
    entidad: uno("entidad"),
    accion: (ACCIONES_AUDITORIA as readonly string[]).includes(accion ?? "") ? (accion as AccionAuditoria) : undefined,
    funcionarioId: uno("funcionario"),
    q: uno("q"),
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

export function queryAuditoria(filtros: FiltrosAuditoria, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (filtros.desde) p.set("desde", filtros.desde);
  if (filtros.hasta) p.set("hasta", filtros.hasta);
  if (filtros.usuarioId) p.set("usuario", filtros.usuarioId);
  if (filtros.entidad) p.set("entidad", filtros.entidad);
  if (filtros.accion) p.set("accion", filtros.accion);
  if (filtros.funcionarioId) p.set("funcionario", filtros.funcionarioId);
  if (filtros.q) p.set("q", filtros.q);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}
