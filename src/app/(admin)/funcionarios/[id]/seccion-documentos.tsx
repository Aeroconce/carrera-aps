// Pestaña Documentos de la ficha (BT 4.8): adjuntos del funcionario, descarga y subida con vínculo al hecho
// que respaldan (bienio, capacitación, estudio, nivel o experiencia sin documento).

import { SubirDocumento, type OpcionVinculo } from "@/app/(admin)/documentos/subir";
import { textosDocumentos } from "@/app/(admin)/documentos/textos";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CarreraDeFuncionario } from "@/lib/carrera/funcionario";
import { prisma } from "@/lib/db/prisma";
import { formatearFecha, formatearFechaHora, formatearTamano } from "@/lib/formato";

const t = textosDocumentos;

export async function SeccionDocumentos({ carrera, puedeEditar }: { carrera: CarreraDeFuncionario; puedeEditar: boolean }) {
  const f = carrera.funcionario;
  const documentos = await prisma.documento.findMany({ where: { funcionarioId: f.id }, include: { subidoPor: { select: { name: true } } }, orderBy: { createdAt: "desc" } });
  const vinculos: OpcionVinculo[] = [
    ...f.capacitaciones.filter((c) => !c.documentoId).map((c) => ({ valor: `capacitacion:${c.id}`, etiqueta: `${t.ficha.vinculos.capacitacion}: ${c.nombre} (${c.periodo})` })),
    ...f.bienios.filter((b) => !b.documentoId).map((b) => ({ valor: `bienio:${b.id}`, etiqueta: `${t.ficha.vinculos.bienio} ${b.numero} (${formatearFecha(b.fechaCumplido)})` })),
    ...f.estudios.filter((e) => !e.documentoId).map((e) => ({ valor: `estudio:${e.id}`, etiqueta: `${t.ficha.vinculos.estudio}: ${e.nombre}` })),
    ...f.niveles.filter((n) => !n.documentoId && n.decretoNumero).map((n) => ({ valor: `nivel:${n.id}`, etiqueta: `${t.ficha.vinculos.nivel} ${n.nivel} (decreto ${n.decretoNumero})` })),
    ...f.experiencias.filter((e) => !e.documentoId && !e.esPropia).map((e) => ({ valor: `experiencia:${e.id}`, etiqueta: `${t.ficha.vinculos.experiencia}: ${e.institucion}` })),
  ];

  return (
    <section className="rounded-lg border border-linea bg-superficie">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-3">
        <h2 className="text-base font-medium">{t.titulo}</h2>
        {puedeEditar && <SubirDocumento funcionarioId={f.id} vinculos={vinculos} variante="outline" />}
      </header>
      <div className="p-4">
        {documentos.length === 0 ? (
          <p className="text-sm text-tinta-secundaria">{t.ficha.vacio}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columnas.nombre}</TableHead>
                <TableHead>{t.columnas.tipo}</TableHead>
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
        )}
      </div>
    </section>
  );
}
