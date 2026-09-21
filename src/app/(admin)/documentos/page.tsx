import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { formatearFechaHora, formatearRut, formatearTamano, nombreCompleto } from "@/lib/formato";
import type { Prisma, TipoDocumento } from "@/generated/prisma/client";
import { SubirDocumento } from "./subir";
import { textosDocumentos as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };
const claseSelect =
  "h-10 rounded-lg border border-input bg-superficie px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Módulo Documentos (BT 4.8, doc 05 §7): repositorio por funcionario y tipo; subida (ADMIN) y descarga autenticada.
export default async function DocumentosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const institucionId = sesion.user.institucionId!;
  const puedeEditar = rolDe(sesion.user) === "ADMIN";
  const params = await searchParams;
  const uno = (k: string) => (typeof params[k] === "string" && (params[k] as string).trim() ? (params[k] as string).trim() : undefined);
  const q = uno("q");
  const tipo = uno("tipo");
  const institucionales = uno("institucionales") === "1";
  const rut = q ? q.replace(/[^0-9kK]/g, "").toUpperCase() : "";

  const where: Prisma.DocumentoWhereInput = {
    institucionId,
    tipo: (tipo as TipoDocumento) || undefined,
    ...(institucionales ? { funcionarioId: null } : {}),
    ...(q ? { funcionario: { OR: [{ nombres: { contains: q, mode: "insensitive" } }, { apellidos: { contains: q, mode: "insensitive" } }, ...(rut ? [{ rut: { startsWith: rut } }] : [])] } } : {}),
  };
  const [documentos, funcionarios] = await Promise.all([
    prisma.documento.findMany({ where, include: { funcionario: { select: { id: true, nombres: true, apellidos: true, rut: true } }, subidoPor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 300 }),
    puedeEditar ? prisma.funcionario.findMany({ where: { institucionId }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], select: { id: true, nombres: true, apellidos: true, rut: true } }) : [],
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        {puedeEditar && <SubirDocumento funcionarios={funcionarios.map((f) => ({ id: f.id, etiqueta: `${f.apellidos}, ${f.nombres} · ${formatearRut(f.rut)}` }))} />}
      </div>

      <form method="get" action="/documentos" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-48">
          {t.filtros.buscar}
          <Input name="q" defaultValue={q ?? ""} placeholder="RUT o apellido" className="h-10" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
          {t.filtros.tipo}
          <select name="tipo" defaultValue={tipo ?? ""} className={claseSelect}>
            <option value="">{t.filtros.todos}</option>
            {Object.entries(t.tipos).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm md:h-10">
          <input type="checkbox" name="institucionales" value="1" defaultChecked={institucionales} className="size-4" />
          {t.filtros.institucionales}
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" className="h-10">{t.filtros.aplicar}</Button>
          <Link href="/documentos" className="inline-flex h-10 items-center px-3 text-sm">{t.filtros.limpiar}</Link>
        </div>
      </form>
      <p className="text-sm text-tinta-secundaria">{t.total(documentos.length)}</p>

      {documentos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columnas.nombre}</TableHead>
                <TableHead>{t.columnas.tipo}</TableHead>
                <TableHead>{t.columnas.funcionario}</TableHead>
                <TableHead className="text-right">{t.columnas.tamano}</TableHead>
                <TableHead>{t.columnas.subidoPor}</TableHead>
                <TableHead>{t.columnas.fecha}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nombre}</TableCell>
                  <TableCell><Badge variant="secondary">{t.tipos[d.tipo] ?? d.tipo}</Badge></TableCell>
                  <TableCell>
                    {d.funcionario ? (
                      <Link href={`/funcionarios/${d.funcionario.id}?pestana=documentos`} className="text-institucional hover:underline">{nombreCompleto(d.funcionario)}</Link>
                    ) : (
                      <span className="text-tinta-secundaria">{t.institucional}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatearTamano(d.tamano)}</TableCell>
                  <TableCell>{d.subidoPor.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatearFechaHora(d.createdAt)}</TableCell>
                  <TableCell>
                    <a href={`/documentos/${d.id}/descargar`} className="text-sm text-institucional underline">{t.columnas.descargar}</a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
