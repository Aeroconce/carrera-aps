// Pestaña Calificaciones de la ficha (BT 4.6): historial por proceso con notas por factor, puntaje, lista, acta
// adjunta y anotaciones.

import Link from "next/link";
import { textosCalificaciones } from "@/app/(admin)/calificaciones/textos";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcularPuntajeFinal } from "@/lib/calificaciones/puntaje";
import { aFactorBase } from "@/lib/db/calificaciones";
import { prisma } from "@/lib/db/prisma";
import { formatearFecha, formatearPuntos } from "@/lib/formato";

const t = textosCalificaciones.ficha;

export async function SeccionCalificaciones({ funcionarioId, puedeEditar }: { funcionarioId: string; puedeEditar: boolean }) {
  const calificaciones = await prisma.calificacionFuncionario.findMany({
    where: { funcionarioId },
    include: { proceso: { include: { factores: true } }, acta: { select: { id: true, nombre: true } }, notasMerito: { orderBy: { fecha: "asc" } } },
    orderBy: { proceso: { periodoDesde: "desc" } },
  });
  const abierto = await prisma.procesoCalificacion.findFirst({ where: { estado: "ABIERTO", institucion: { funcionarios: { some: { id: funcionarioId } } } }, select: { id: true } });
  return (
    <section className="rounded-lg border border-linea bg-superficie">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-3">
        <h2 className="text-base font-medium">{textosCalificaciones.titulo}</h2>
        {puedeEditar && abierto && (
          <Link href={`/calificaciones?proceso=${abierto.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{textosCalificaciones.calificar}</Link>
        )}
      </header>
      <div className="overflow-x-auto p-4">
        {calificaciones.length === 0 ? (
          <p className="text-sm text-tinta-secundaria">{t.vacio}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.proceso}</TableHead>
                <TableHead>{t.porFactor}</TableHead>
                <TableHead className="text-right">{t.puntaje}</TableHead>
                <TableHead>{t.lista}</TableHead>
                <TableHead>{t.acta}</TableHead>
                <TableHead>{t.notas}</TableHead>
                <TableHead>{t.observaciones}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calificaciones.map((c) => {
                const porFactor = calcularPuntajeFinal(c.proceso.factores.map(aFactorBase), (c.puntajes ?? {}) as Record<string, number>).porFactor;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {c.proceso.nombre}
                      <span className="block text-xs text-tinta-secundaria">{formatearFecha(c.proceso.periodoDesde)} – {formatearFecha(c.proceso.periodoHasta)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-tinta-secundaria">
                      {porFactor.length === 0 ? (
                        ""
                      ) : (
                        <ul className="space-y-0.5">
                          {porFactor.map((f) => (
                            <li key={f.factorId}>
                              {f.nombre}: <span className="text-tinta">{f.nota === null ? "—" : formatearPuntos(f.nota)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatearPuntos(c.puntajeFinal)}</TableCell>
                    <TableCell>{c.lista ? <Badge variant="secondary">{c.lista}</Badge> : ""}</TableCell>
                    <TableCell className="text-xs">
                      {c.acta ? (
                        <a href={`/documentos/${c.acta.id}/descargar`} className="text-institucional underline" aria-label={`${t.verActa}: ${c.proceso.nombre}`}>{t.verActa}</a>
                      ) : (
                        <span className="text-tinta-secundaria">{t.sinActa}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.notasMerito.length === 0 ? (
                        ""
                      ) : (
                        <ul className="space-y-0.5">
                          {c.notasMerito.map((n) => (
                            <li key={n.id}>
                              <Badge variant={n.tipo === "MERITO" ? "default" : "outline"}>{n.tipo === "MERITO" ? "Mérito" : "Demérito"}</Badge> {formatearFecha(n.fecha)} · {n.descripcion}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-tinta-secundaria">{c.observaciones ?? ""}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
