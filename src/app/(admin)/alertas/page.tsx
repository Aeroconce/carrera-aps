import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarAlertas } from "@/lib/alertas/consulta";
import { TIPOS_ALERTA, type FiltrosAlertas } from "@/lib/alertas/tipos";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { sincronizarSiCorresponde } from "@/lib/db/alertas";
import { prisma } from "@/lib/db/prisma";
import { formatearFecha, formatearFechaHora, formatearRut, nombreCompleto } from "@/lib/formato";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import { leerFecha } from "@/lib/reportes/filtros";
import type { TipoAlerta } from "@/generated/prisma/client";
import { AccionesAlerta, BotonSincronizar } from "./acciones";
import { FiltrosAlertasForm } from "./filtros";
import { textosAlertas as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

const POR_PAGINA = 100;
const COLOR_ESTADO = { ACTIVA: "border-alerta bg-alerta/10 text-tinta", ATENDIDA: "bg-correcto text-white", DESCARTADA: "" } as const;

function leerFiltros(params: Record<string, string | string[] | undefined>): FiltrosAlertas {
  const uno = (k: string) => (typeof params[k] === "string" && (params[k] as string).trim() ? (params[k] as string).trim() : undefined);
  const tipo = uno("tipo");
  const estado = uno("estado");
  const pagina = Number(uno("pagina") ?? "1");
  return {
    tipo: (TIPOS_ALERTA as readonly string[]).includes(tipo ?? "") ? (tipo as TipoAlerta) : undefined,
    establecimientoId: uno("establecimiento"),
    estado: estado === "ATENDIDA" || estado === "DESCARTADA" || estado === "TODAS" ? estado : "ACTIVA",
    desde: leerFecha(uno("desde")) ?? undefined,
    hasta: leerFecha(uno("hasta")) ?? undefined,
    q: uno("q"),
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

function query(filtros: FiltrosAlertas, pagina: number): string {
  const p = new URLSearchParams();
  if (filtros.q) p.set("q", filtros.q);
  if (filtros.tipo) p.set("tipo", filtros.tipo);
  if (filtros.establecimientoId) p.set("establecimiento", filtros.establecimientoId);
  if (filtros.estado !== "ACTIVA") p.set("estado", filtros.estado);
  if (filtros.desde) p.set("desde", filtros.desde);
  if (filtros.hasta) p.set("hasta", filtros.hasta);
  p.set("pagina", String(pagina));
  return p.toString();
}

// Módulo Alertas (doc 05 §9, doc 13 F7, subcriterio 8): lista persistida con atender y descartar. Al abrirlo se
// sincroniza con el cálculo si la última pasada es antigua; el worker nocturno hace lo mismo.
export default async function AlertasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const institucionId = sesion.user.institucionId!;
  const puedeEditar = rolDe(sesion.user) === "ADMIN";
  await sincronizarSiCorresponde({ usuarioId: sesion.user.id }, institucionId);

  const filtros = leerFiltros(await searchParams);
  const [resultado, establecimientos] = await Promise.all([
    listarAlertas(institucionId, filtros, POR_PAGINA),
    prisma.establecimiento.findMany({ where: { institucionId, activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(resultado.total / POR_PAGINA));
  const desde = (filtros.pagina - 1) * POR_PAGINA;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeEditar && <BotonSincronizar />}
          <Link href="/reportes/alertas" className={buttonVariants({ variant: "outline" })}>
            {t.exportar}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{t.activas(resultado.totalActivas)}</span>
        {resultado.activasPorTipo.map((x) => (
          <Link key={x.tipo} href={`/alertas?tipo=${x.tipo}`} className="rounded-full border border-linea bg-superficie px-2.5 py-0.5 text-xs hover:bg-institucional-suave">
            {ETIQUETAS.tipoAlerta[x.tipo]} <span className="font-medium">{x.total}</span>
          </Link>
        ))}
      </div>

      <FiltrosAlertasForm filtros={filtros} establecimientos={establecimientos} />

      {resultado.filas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-linea bg-superficie md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columnas.funcionario}</TableHead>
                  <TableHead>{t.columnas.establecimiento}</TableHead>
                  <TableHead>{t.columnas.tipo}</TableHead>
                  <TableHead>{t.columnas.hito}</TableHead>
                  <TableHead>{t.columnas.detalle}</TableHead>
                  <TableHead>{t.columnas.estado}</TableHead>
                  {puedeEditar && <TableHead>{t.columnas.acciones}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.filas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/funcionarios/${a.funcionario.id}?pestana=alertas`} className="font-medium text-institucional hover:underline">
                        {nombreCompleto(a.funcionario)}
                      </Link>
                      <span className="block text-xs text-tinta-secundaria">{formatearRut(a.funcionario.rut)} · Cat. {a.funcionario.categoria}</span>
                    </TableCell>
                    <TableCell>{a.funcionario.establecimiento.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ETIQUETAS.tipoAlerta[a.tipo]}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatearFecha(a.fechaHito)}</TableCell>
                    <TableCell className="max-w-md text-sm">{a.mensaje}</TableCell>
                    <TableCell>
                      <Badge className={COLOR_ESTADO[a.estado]} variant={a.estado === "DESCARTADA" ? "outline" : "default"}>
                        {t.estados[a.estado]}
                      </Badge>
                      {a.estado !== "ACTIVA" && a.atendidaEl && (
                        <span className="mt-1 block max-w-56 text-xs text-tinta-secundaria">
                          {t.resolucion(a.atendidaPor?.name ?? null, formatearFechaHora(a.atendidaEl))}
                          {a.resolucionNota ? ` · ${a.resolucionNota}` : ""}
                        </span>
                      )}
                    </TableCell>
                    {puedeEditar && <TableCell>{a.estado === "ACTIVA" && <AccionesAlerta id={a.id} />}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {resultado.filas.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/funcionarios/${a.funcionario.id}?pestana=alertas`} className="font-medium text-institucional">
                    {nombreCompleto(a.funcionario)}
                  </Link>
                  <Badge className={COLOR_ESTADO[a.estado]} variant={a.estado === "DESCARTADA" ? "outline" : "default"}>
                    {t.estados[a.estado]}
                  </Badge>
                </div>
                <p className="text-xs text-tinta-secundaria">
                  {ETIQUETAS.tipoAlerta[a.tipo]} · {formatearFecha(a.fechaHito)} · {a.funcionario.establecimiento.nombre}
                </p>
                <p className="text-sm">{a.mensaje}</p>
                {a.estado !== "ACTIVA" && a.atendidaEl && (
                  <p className="text-xs text-tinta-secundaria">
                    {t.resolucion(a.atendidaPor?.name ?? null, formatearFechaHora(a.atendidaEl))}
                    {a.resolucionNota ? ` · ${a.resolucionNota}` : ""}
                  </p>
                )}
                {puedeEditar && a.estado === "ACTIVA" && <AccionesAlerta id={a.id} />}
              </li>
            ))}
          </ul>

          {paginas > 1 && (
            <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Paginación">
              <span className="text-tinta-secundaria">{t.paginacion.mostrando(desde + 1, Math.min(desde + POR_PAGINA, resultado.total), resultado.total)}</span>
              <div className="flex gap-2">
                {filtros.pagina > 1 && (
                  <Link href={`/alertas?${query(filtros, filtros.pagina - 1)}`} className={buttonVariants({ variant: "outline" })}>{t.paginacion.anterior}</Link>
                )}
                {filtros.pagina < paginas && (
                  <Link href={`/alertas?${query(filtros, filtros.pagina + 1)}`} className={buttonVariants({ variant: "outline" })}>{t.paginacion.siguiente}</Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
