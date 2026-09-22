import type { Metadata } from "next";
import Link from "next/link";
import { DetalleAuditoria } from "@/components/dominio/detalle-auditoria";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarAuditoria, opcionesAuditoria } from "@/lib/auditoria/consulta";
import { filasDeCambio } from "@/lib/auditoria/detalle";
import { ETIQUETAS_AUDITORIA } from "@/lib/auditoria/etiquetas";
import { exigirSesion } from "@/lib/auth/sesion";
import { formatearFechaHora, formatearRut, nombreCompleto } from "@/lib/formato";
import { leerFiltrosAuditoria, queryAuditoria } from "./filtros-lectura";
import { FiltrosAuditoriaForm } from "./filtros";
import { textosAuditoria as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

const POR_PAGINA = 100;

// Módulo Auditoría (doc 05 §11, doc 13 F10, subcriterio 14): bitácora filtrable con antes y después por campo.
export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const institucionId = sesion.user.institucionId!;
  const filtros = leerFiltrosAuditoria(await searchParams);
  const [{ filas, total }, opciones] = await Promise.all([listarAuditoria(institucionId, filtros, POR_PAGINA), opcionesAuditoria(institucionId)]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = (filtros.pagina - 1) * POR_PAGINA;
  const query = queryAuditoria(filtros);
  const textosDetalle = { boton: t.verCambios, ...t.detalle, sinCambios: t.sinCambios };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/auditoria/accesos" className={buttonVariants({ variant: "outline" })}>{t.accesos}</Link>
          <a href={`/auditoria/exportar?${query}&formato=xlsx`} className={buttonVariants()} download>{t.exportar.xlsx}</a>
          <a href={`/auditoria/exportar?${query}&formato=csv`} className={buttonVariants({ variant: "outline" })} download>{t.exportar.csv}</a>
        </div>
      </div>

      <FiltrosAuditoriaForm
        filtros={filtros}
        usuarios={opciones.usuarios}
        entidades={opciones.entidades}
        funcionarios={opciones.funcionarios.map((f) => ({ id: f.id, etiqueta: `${f.apellidos}, ${f.nombres} · ${formatearRut(f.rut)}` }))}
      />
      <p className="text-sm text-tinta-secundaria">{t.total(total)}</p>

      {filas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-linea bg-superficie md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columnas.fecha}</TableHead>
                  <TableHead>{t.columnas.usuario}</TableHead>
                  <TableHead>{t.columnas.accion}</TableHead>
                  <TableHead>{t.columnas.entidad}</TableHead>
                  <TableHead>{t.columnas.funcionario}</TableHead>
                  <TableHead>{t.columnas.detalle}</TableHead>
                  <TableHead>{t.columnas.cambios}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatearFechaHora(e.fecha)}</TableCell>
                    <TableCell>{e.usuario.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ETIQUETAS_AUDITORIA.accion[e.accion] ?? e.accion}</Badge>
                    </TableCell>
                    <TableCell>{ETIQUETAS_AUDITORIA.entidad[e.entidad] ?? e.entidad}</TableCell>
                    <TableCell>
                      {e.funcionario ? (
                        <Link href={`/funcionarios/${e.funcionario.id}?pestana=historial`} className="text-institucional hover:underline">
                          {nombreCompleto(e.funcionario)}
                        </Link>
                      ) : (
                        ""
                      )}
                    </TableCell>
                    <TableCell className="min-w-64 max-w-sm whitespace-normal text-xs text-tinta-secundaria">{e.detalle ?? ""}</TableCell>
                    <TableCell>
                      <DetalleAuditoria
                        filas={filasDeCambio(e.antes, e.despues)}
                        titulo={`${ETIQUETAS_AUDITORIA.accion[e.accion] ?? e.accion} · ${ETIQUETAS_AUDITORIA.entidad[e.entidad] ?? e.entidad}`}
                        descripcion={`${formatearFechaHora(e.fecha)} · ${e.usuario.name}${e.funcionario ? ` · ${nombreCompleto(e.funcionario)}` : ""}`}
                        textos={textosDetalle}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {filas.map((e) => (
              <li key={e.id} className="flex flex-col gap-1.5 rounded-lg border border-linea bg-superficie p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-tinta-secundaria">{formatearFechaHora(e.fecha)}</span>
                  <Badge variant="outline">{ETIQUETAS_AUDITORIA.accion[e.accion] ?? e.accion}</Badge>
                </div>
                <p className="text-sm font-medium">
                  {ETIQUETAS_AUDITORIA.entidad[e.entidad] ?? e.entidad}
                  {e.funcionario ? ` · ${nombreCompleto(e.funcionario)}` : ""}
                </p>
                <p className="text-xs text-tinta-secundaria">{e.usuario.name}{e.detalle ? ` · ${e.detalle}` : ""}</p>
                <DetalleAuditoria
                  filas={filasDeCambio(e.antes, e.despues)}
                  titulo={`${ETIQUETAS_AUDITORIA.accion[e.accion] ?? e.accion} · ${ETIQUETAS_AUDITORIA.entidad[e.entidad] ?? e.entidad}`}
                  descripcion={`${formatearFechaHora(e.fecha)} · ${e.usuario.name}`}
                  textos={textosDetalle}
                />
              </li>
            ))}
          </ul>

          {paginas > 1 && (
            <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Paginación">
              <span className="text-tinta-secundaria">{t.paginacion.mostrando(desde + 1, Math.min(desde + POR_PAGINA, total), total)}</span>
              <div className="flex gap-2">
                {filtros.pagina > 1 && (
                  <Link href={`/auditoria?${queryAuditoria(filtros, { pagina: String(filtros.pagina - 1) })}`} className={buttonVariants({ variant: "outline" })}>{t.paginacion.anterior}</Link>
                )}
                {filtros.pagina < paginas && (
                  <Link href={`/auditoria?${queryAuditoria(filtros, { pagina: String(filtros.pagina + 1) })}`} className={buttonVariants({ variant: "outline" })}>{t.paginacion.siguiente}</Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
