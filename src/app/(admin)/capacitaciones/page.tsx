import type { Metadata } from "next";
import Link from "next/link";
import { TabsFicha } from "@/app/(admin)/funcionarios/[id]/tabs-ficha";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { listarCapacitaciones, resumenPorPeriodo, type FiltrosCapacitaciones } from "@/lib/capacitaciones/consulta";
import { prisma } from "@/lib/db/prisma";
import { hoyEnChile } from "@/lib/fechas/civil";
import { formatearFecha, formatearPuntos, formatearRut, nombreCompleto } from "@/lib/formato";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import { FiltrosCapacitacionesForm } from "./filtros";
import { DialogoRegistrarCapacitacion } from "./registrar";
import { textosCapacitaciones as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };
const POR_PAGINA = 100;

function leerFiltros(params: Record<string, string | string[] | undefined>): FiltrosCapacitaciones {
  const uno = (k: string) => (typeof params[k] === "string" && (params[k] as string).trim() ? (params[k] as string).trim() : undefined);
  const periodo = Number(uno("periodo") ?? "");
  const aprobada = uno("aprobada");
  const pagina = Number(uno("pagina") ?? "1");
  return {
    q: uno("q"),
    establecimientoId: uno("establecimiento"),
    periodo: Number.isInteger(periodo) && periodo > 0 ? periodo : undefined,
    aprobado: aprobada === "si" ? true : aprobada === "no" ? false : undefined,
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

// Módulo Capacitaciones (doc 05 §4): actividades de la dotación y vista por período; registro con funcionario.
export default async function CapacitacionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const institucionId = sesion.user.institucionId!;
  const puedeEditar = rolDe(sesion.user) === "ADMIN";
  const params = await searchParams;
  const filtros = leerFiltros(params);
  const pestana = typeof params.pestana === "string" ? params.pestana : "listado";
  const anioActual = Number(hoyEnChile().slice(0, 4));
  const periodoResumen = Number(typeof params.resumen === "string" ? params.resumen : "") || filtros.periodo || anioActual;

  const [listado, resumen, establecimientos, funcionarios] = await Promise.all([
    listarCapacitaciones(institucionId, filtros, POR_PAGINA),
    resumenPorPeriodo(institucionId, periodoResumen),
    prisma.establecimiento.findMany({ where: { institucionId, activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.funcionario.findMany({ where: { institucionId, estado: "ACTIVO" }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], select: { id: true, nombres: true, apellidos: true, rut: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(listado.total / POR_PAGINA));
  const desde = (filtros.pagina - 1) * POR_PAGINA;
  const query = (pagina: number) => {
    const p = new URLSearchParams();
    if (filtros.q) p.set("q", filtros.q);
    if (filtros.establecimientoId) p.set("establecimiento", filtros.establecimientoId);
    if (filtros.periodo) p.set("periodo", String(filtros.periodo));
    if (filtros.aprobado !== undefined) p.set("aprobada", filtros.aprobado ? "si" : "no");
    p.set("pagina", String(pagina));
    return p.toString();
  };
  const periodosResumen = [...new Set([anioActual, ...listado.periodos])].sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        {puedeEditar && (
          <div className="flex flex-wrap gap-2">
            <DialogoRegistrarCapacitacion funcionarios={funcionarios.map((f) => ({ id: f.id, etiqueta: `${f.apellidos}, ${f.nombres} · ${formatearRut(f.rut)}` }))} />
            <Link href="/importar" className={buttonVariants({ variant: "outline" })}>{t.importar}</Link>
          </div>
        )}
      </div>

      <TabsFicha
        inicial={pestana}
        pestanas={[
          {
            valor: "listado",
            etiqueta: t.pestanas.listado,
            contenido: (
              <div className="flex flex-col gap-3">
                <FiltrosCapacitacionesForm filtros={filtros} establecimientos={establecimientos} periodos={listado.periodos} />
                <p className="text-sm text-tinta-secundaria">{t.total(listado.total)}</p>
                {listado.filas.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto rounded-lg border border-linea bg-superficie md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.columnas.funcionario}</TableHead>
                            <TableHead>{t.columnas.actividad}</TableHead>
                            <TableHead>{t.columnas.tipo}</TableHead>
                            <TableHead className="text-right">{t.columnas.horas}</TableHead>
                            <TableHead>{t.columnas.termino}</TableHead>
                            <TableHead>{t.columnas.aprobada}</TableHead>
                            <TableHead className="text-right">{t.columnas.periodo}</TableHead>
                            <TableHead className="text-right">{t.columnas.calculado}</TableHead>
                            <TableHead className="text-right">{t.columnas.aplicado}</TableHead>
                            <TableHead className="text-right">{t.columnas.excedente}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listado.filas.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <Link href={`/funcionarios/${c.funcionario.id}?pestana=capacitaciones`} className="font-medium text-institucional hover:underline">{nombreCompleto(c.funcionario)}</Link>
                                <span className="block text-xs text-tinta-secundaria">{formatearRut(c.funcionario.rut)} · {c.funcionario.establecimiento.nombre}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{c.nombre}</span>
                                <span className="block text-xs text-tinta-secundaria">{c.institucionDicta}</span>
                              </TableCell>
                              <TableCell>{ETIQUETAS.tipoCapacitacion[c.tipo]}</TableCell>
                              <TableCell className="text-right">{c.horas}</TableCell>
                              <TableCell className="whitespace-nowrap">{formatearFecha(c.fechaTermino)}</TableCell>
                              <TableCell>{c.aprobado ? <Badge className="bg-correcto text-white">Sí</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                              <TableCell className="text-right">{c.periodo}</TableCell>
                              <TableCell className="text-right">{formatearPuntos(c.puntajeCalculado)}</TableCell>
                              <TableCell className="text-right">{formatearPuntos(c.puntajeAplicado)}</TableCell>
                              <TableCell className="text-right">{formatearPuntos(Math.max(0, Number(c.puntajeCalculado) - Number(c.puntajeAplicado)))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ul className="flex flex-col gap-2 md:hidden">
                      {listado.filas.map((c) => (
                        <li key={c.id} className="rounded-lg border border-linea bg-superficie p-3">
                          <Link href={`/funcionarios/${c.funcionario.id}?pestana=capacitaciones`} className="font-medium text-institucional">{nombreCompleto(c.funcionario)}</Link>
                          <p className="text-sm">{c.nombre}</p>
                          <p className="text-xs text-tinta-secundaria">
                            {c.institucionDicta} · {c.horas} h · {formatearFecha(c.fechaTermino)} · {c.aprobado ? "Aprobada" : "No aprobada"} · {c.periodo}
                          </p>
                          <p className="text-sm">Calculado {formatearPuntos(c.puntajeCalculado)} · Aplicado {formatearPuntos(c.puntajeAplicado)}</p>
                        </li>
                      ))}
                    </ul>
                    {paginas > 1 && (
                      <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Paginación">
                        <span className="text-tinta-secundaria">{t.paginacion.mostrando(desde + 1, Math.min(desde + POR_PAGINA, listado.total), listado.total)}</span>
                        <div className="flex gap-2">
                          {filtros.pagina > 1 && <Link href={`/capacitaciones?${query(filtros.pagina - 1)}`} className={buttonVariants({ variant: "outline" })}>{t.paginacion.anterior}</Link>}
                          {filtros.pagina < paginas && <Link href={`/capacitaciones?${query(filtros.pagina + 1)}`} className={buttonVariants({ variant: "outline" })}>{t.paginacion.siguiente}</Link>}
                        </div>
                      </nav>
                    )}
                  </>
                )}
              </div>
            ),
          },
          {
            valor: "periodo",
            etiqueta: t.pestanas.periodo,
            contenido: (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-tinta-secundaria">{t.porPeriodo.intro(periodoResumen)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {periodosResumen.map((p) => (
                      <Link key={p} href={`/capacitaciones?pestana=periodo&resumen=${p}`} className={buttonVariants({ variant: p === periodoResumen ? "default" : "outline", size: "xs" })}>
                        {p}
                      </Link>
                    ))}
                  </div>
                </div>
                {resumen.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.porPeriodo.vacio}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.porPeriodo.columnas.funcionario}</TableHead>
                          <TableHead className="text-right">{t.porPeriodo.columnas.actividades}</TableHead>
                          <TableHead className="text-right">{t.porPeriodo.columnas.calculado}</TableHead>
                          <TableHead className="text-right">{t.porPeriodo.columnas.arrastre}</TableHead>
                          <TableHead className="text-right">{t.porPeriodo.columnas.tope}</TableHead>
                          <TableHead className="text-right">{t.porPeriodo.columnas.aplicado}</TableHead>
                          <TableHead className="text-right">{t.porPeriodo.columnas.excedente}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumen.map((r) => (
                          <TableRow key={r.funcionario.id}>
                            <TableCell>
                              <Link href={`/funcionarios/${r.funcionario.id}?pestana=capacitaciones`} className="font-medium text-institucional hover:underline">{nombreCompleto(r.funcionario)}</Link>
                              <span className="block text-xs text-tinta-secundaria">{formatearRut(r.funcionario.rut)} · Cat. {r.funcionario.categoria} · {r.funcionario.establecimiento}</span>
                            </TableCell>
                            <TableCell className="text-right">{r.actividades}</TableCell>
                            <TableCell className="text-right">{formatearPuntos(r.calculado)}</TableCell>
                            <TableCell className="text-right">{formatearPuntos(r.arrastreRecibido)}</TableCell>
                            <TableCell className="text-right">{r.tope === null ? "" : formatearPuntos(r.tope)}</TableCell>
                            <TableCell className="text-right font-medium">{formatearPuntos(r.aplicado)}</TableCell>
                            <TableCell className="text-right">{formatearPuntos(r.excedente)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
