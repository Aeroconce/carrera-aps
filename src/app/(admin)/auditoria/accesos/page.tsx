import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { aDate, sumarDias } from "@/lib/fechas/civil";
import { formatearFechaHora } from "@/lib/formato";
import { leerFecha } from "@/lib/reportes/filtros";
import type { Prisma } from "@/generated/prisma/client";
import { textosAuditoria } from "../textos";

const t = textosAuditoria.accesosPagina;
export const metadata: Metadata = { title: t.titulo };
const POR_PAGINA = 100;

const claseSelect =
  "h-10 rounded-lg border border-input bg-superficie px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Registro de accesos (BT 3.2, doc 07): cada intento de inicio de sesión. Filtros por correo, resultado y fechas.
export default async function AccesosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const params = await searchParams;
  const uno = (k: string) => (typeof params[k] === "string" && (params[k] as string).trim() ? (params[k] as string).trim() : undefined);
  const email = uno("email");
  const resultado = uno("resultado");
  const desde = leerFecha(uno("desde"));
  const hasta = leerFecha(uno("hasta"));
  const pagina = Math.max(1, Number(uno("pagina") ?? "1") || 1);

  const where: Prisma.AccesoWhereInput = {
    email: email ? { contains: email, mode: "insensitive" } : undefined,
    exito: resultado === "exitosos" ? true : resultado === "fallidos" ? false : undefined,
    fecha: desde || hasta ? { gte: desde ? aDate(desde) : undefined, lt: hasta ? aDate(sumarDias(hasta, 1)) : undefined } : undefined,
  };
  const [accesos, total] = await Promise.all([
    prisma.acceso.findMany({ where, include: { usuario: { select: { name: true } } }, orderBy: { fecha: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    prisma.acceso.count({ where }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const query = (p: number) => {
    const q = new URLSearchParams();
    if (email) q.set("email", email);
    if (resultado) q.set("resultado", resultado);
    if (desde) q.set("desde", desde);
    if (hasta) q.set("hasta", hasta);
    q.set("pagina", String(p));
    return q.toString();
  };

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-xs text-tinta-secundaria">
        <Link href="/auditoria" className="hover:underline">{t.volver}</Link>
      </nav>
      <div>
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
      </div>

      <form method="get" action="/auditoria/accesos" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-56">
          {t.filtros.email}
          <Input name="email" defaultValue={email ?? ""} className="h-10" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
          {t.filtros.resultado}
          <select name="resultado" defaultValue={resultado ?? ""} className={claseSelect}>
            <option value="">{t.filtros.todos}</option>
            <option value="exitosos">{t.filtros.exitosos}</option>
            <option value="fallidos">{t.filtros.fallidos}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
          {t.filtros.desde}
          <EntradaNativa type="date" name="desde" defaultValue={desde ?? ""} className="h-10 w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
          {t.filtros.hasta}
          <EntradaNativa type="date" name="hasta" defaultValue={hasta ?? ""} className="h-10 w-40" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={buttonVariants({ variant: "outline", className: "h-10" })}>{t.filtros.aplicar}</button>
          <Link href="/auditoria/accesos" className={buttonVariants({ variant: "ghost", className: "h-10" })}>{t.filtros.limpiar}</Link>
        </div>
      </form>

      {accesos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columnas.fecha}</TableHead>
                <TableHead>{t.columnas.email}</TableHead>
                <TableHead>{t.columnas.usuario}</TableHead>
                <TableHead>{t.columnas.resultado}</TableHead>
                <TableHead>{t.columnas.ip}</TableHead>
                <TableHead>{t.columnas.navegador}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accesos.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{formatearFechaHora(a.fecha)}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.usuario?.name ?? ""}</TableCell>
                  <TableCell>
                    <Badge className={a.exito ? "bg-correcto text-white" : "bg-error text-white"}>{a.exito ? t.exitoso : t.fallido}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{a.ip}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-tinta-secundaria" title={a.userAgent}>{a.userAgent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {paginas > 1 && (
        <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Paginación">
          <span className="text-tinta-secundaria">{textosAuditoria.paginacion.mostrando((pagina - 1) * POR_PAGINA + 1, Math.min(pagina * POR_PAGINA, total), total)}</span>
          <div className="flex gap-2">
            {pagina > 1 && <Link href={`/auditoria/accesos?${query(pagina - 1)}`} className={buttonVariants({ variant: "outline" })}>{textosAuditoria.paginacion.anterior}</Link>}
            {pagina < paginas && <Link href={`/auditoria/accesos?${query(pagina + 1)}`} className={buttonVariants({ variant: "outline" })}>{textosAuditoria.paginacion.siguiente}</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
