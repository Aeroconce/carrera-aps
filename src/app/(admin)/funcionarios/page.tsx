import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { listarFuncionarios, type FiltrosFuncionarios } from "@/lib/carrera/listado";
import { prisma } from "@/lib/db/prisma";
import { formatearFecha, formatearPuntos, formatearRut, nombreCompleto } from "@/lib/formato";
import type { Categoria, TipoContrato } from "@/generated/prisma/client";
import { FiltrosFuncionariosForm } from "./filtros";
import { textosFuncionarios as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

const CATEGORIAS = ["A", "B", "C", "D", "E", "F"] as const;
const CONTRATOS = ["TITULAR", "PLAZO_FIJO", "REEMPLAZO"] as const;

function leerFiltros(params: Record<string, string | string[] | undefined>): FiltrosFuncionarios {
  const uno = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const categoria = uno("categoria");
  const tipoContrato = uno("tipoContrato");
  const estado = uno("estado");
  return {
    q: uno("q"),
    establecimientoId: uno("establecimiento") || undefined,
    categoria: CATEGORIAS.includes(categoria as Categoria) ? (categoria as Categoria) : undefined,
    tipoContrato: CONTRATOS.includes(tipoContrato as TipoContrato) ? (tipoContrato as TipoContrato) : undefined,
    estado: estado === "INACTIVO" ? "INACTIVO" : estado === "TODOS" ? "TODOS" : "ACTIVO",
    nivel: uno("nivel") ? Number(uno("nivel")) : undefined,
  };
}

// Listado (doc 05 módulo 2): búsqueda al escribir, filtros, columnas clave; tarjetas en celular (doc 12).
export default async function FuncionariosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const institucionId = sesion.user.institucionId!;
  const filtros = leerFiltros(await searchParams);
  const [filas, establecimientos] = await Promise.all([
    listarFuncionarios(institucionId, filtros),
    prisma.establecimiento.findMany({ where: { institucionId, activo: true }, orderBy: { nombre: "asc" } }),
  ]);
  const puedeEditar = rolDe(sesion.user) === "ADMIN";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="text-sm text-tinta-secundaria">{t.total(filas.length)}</p>
        </div>
        {puedeEditar && (
          <Link href="/funcionarios/nuevo" className={buttonVariants()}>
            {t.nuevo}
          </Link>
        )}
      </div>

      <FiltrosFuncionariosForm filtros={filtros} establecimientos={establecimientos.map((e) => ({ id: e.id, nombre: e.nombre }))} />

      {filas.length === 0 ? (
        <div className="rounded-lg border border-linea bg-superficie p-8 text-center">
          <p className="text-sm text-tinta-secundaria">{t.vacio.titulo}</p>
          <Link href="/funcionarios" className={buttonVariants({ variant: "outline", className: "mt-3" })}>
            {t.vacio.accion}
          </Link>
        </div>
      ) : (
        <>
          {/* Tabla en escritorio y tablet */}
          <div className="hidden overflow-x-auto rounded-lg border border-linea bg-superficie md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columnas.rut}</TableHead>
                  <TableHead>{t.columnas.nombre}</TableHead>
                  <TableHead>{t.columnas.categoria}</TableHead>
                  <TableHead className="text-right">{t.columnas.nivel}</TableHead>
                  <TableHead>{t.columnas.establecimiento}</TableHead>
                  <TableHead className="text-right">{t.columnas.bienios}</TableHead>
                  <TableHead className="text-right">{t.columnas.puntaje}</TableHead>
                  <TableHead>{t.columnas.proximaAlerta}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map(({ funcionario: f, estado, proximaAlerta }) => (
                  <TableRow key={f.id}>
                    <TableCell className="whitespace-nowrap">{formatearRut(f.rut)}</TableCell>
                    <TableCell>
                      <Link href={`/funcionarios/${f.id}`} className="font-medium text-institucional hover:underline">
                        {nombreCompleto(f)}
                      </Link>
                      {f.estado === "INACTIVO" && <Badge variant="outline" className="ml-2">{t.ficha.estado.INACTIVO}</Badge>}
                    </TableCell>
                    <TableCell>{f.categoria}</TableCell>
                    <TableCell className="text-right">{estado.sinInformacion ? "" : (estado.nivel.vigente ?? estado.nivel.calculado)}</TableCell>
                    <TableCell>{f.establecimiento.nombre}</TableCell>
                    <TableCell className="text-right">{estado.sinInformacion ? "" : estado.bienios.totalBienios}</TableCell>
                    <TableCell className="text-right">{estado.sinInformacion ? "" : formatearPuntos(estado.puntaje.total)}</TableCell>
                    <TableCell className="text-xs text-tinta-secundaria">
                      {proximaAlerta ? `${formatearFecha(proximaAlerta.fechaHito)} · ${proximaAlerta.mensaje}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Tarjetas en celular */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filas.map(({ funcionario: f, estado }) => (
              <li key={f.id}>
                <Link href={`/funcionarios/${f.id}`} className="block rounded-lg border border-linea bg-superficie p-3 active:bg-institucional-suave">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{nombreCompleto(f)}</p>
                    <Badge variant="secondary">{f.categoria}</Badge>
                  </div>
                  <p className="text-xs text-tinta-secundaria">{formatearRut(f.rut)} · {f.establecimiento.nombre}</p>
                  {!estado.sinInformacion && (
                    <p className="mt-1 text-sm">
                      Nivel {estado.nivel.vigente ?? estado.nivel.calculado} · {formatearPuntos(estado.puntaje.total)} puntos · {estado.bienios.totalBienios} bienios
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
