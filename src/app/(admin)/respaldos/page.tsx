import type { Metadata } from "next";
import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { marcarVerificadoAction } from "@/lib/acciones/respaldos";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { formatearFechaHora, formatearTamano } from "@/lib/formato";
import { BotonRespaldo } from "./acciones";
import { textosRespaldos as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Módulo Respaldos (doc 05 §12, doc 13 F11, subcriterio 15): historial, último verificado y política publicada.
export default async function RespaldosPage() {
  await exigirSesion({ roles: ["ADMIN"] });
  const respaldos = await prisma.respaldo.findMany({ orderBy: { fecha: "desc" }, take: 200 });
  const verificado = respaldos.filter((r) => r.verificadoEl).sort((a, b) => b.verificadoEl!.getTime() - a.verificadoEl!.getTime())[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        <BotonRespaldo />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-institucional bg-institucional-suave p-4 text-tinta lg:col-span-1">
          <h2 className="text-sm font-medium">{t.ultimoVerificado}</h2>
          {verificado ? (
            <div className="mt-1 text-sm">
              <p className="text-lg font-semibold">{formatearFechaHora(verificado.fecha)}</p>
              <p className="text-xs">
                {t.tipos[verificado.tipo] ?? verificado.tipo} · {formatearTamano(Number(verificado.tamano))} · verificado el {formatearFechaHora(verificado.verificadoEl!)}
              </p>
              <p className="mt-1 truncate font-mono text-xs" title={verificado.hash}>{verificado.hash}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm">{t.ninguno}</p>
          )}
        </section>
        <section className="rounded-lg border border-linea bg-superficie p-4 lg:col-span-2">
          <h2 className="text-sm font-medium">{t.politica.titulo}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tinta-secundaria">
            {t.politica.puntos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      </div>

      {respaldos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columnas.fecha}</TableHead>
                <TableHead>{t.columnas.tipo}</TableHead>
                <TableHead className="text-right">{t.columnas.tamano}</TableHead>
                <TableHead>{t.columnas.destino}</TableHead>
                <TableHead>{t.columnas.resultado}</TableHead>
                <TableHead className="text-right">{t.columnas.duracion}</TableHead>
                <TableHead>{t.columnas.hash}</TableHead>
                <TableHead>{t.columnas.verificado}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {respaldos.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{formatearFechaHora(r.fecha)}</TableCell>
                  <TableCell>{t.tipos[r.tipo] ?? r.tipo}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatearTamano(Number(r.tamano))}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={r.destino}>{r.destino}</TableCell>
                  <TableCell>
                    <Badge className={r.resultado === "OK" ? "bg-correcto text-white" : "bg-error text-white"}>{r.resultado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.duracionSeg} s</TableCell>
                  <TableCell className="max-w-32 truncate font-mono text-xs" title={r.hash}>{r.hash.slice(0, 12)}</TableCell>
                  <TableCell>
                    {r.verificadoEl ? (
                      <span className="text-xs">{formatearFechaHora(r.verificadoEl)}</span>
                    ) : r.resultado === "OK" ? (
                      <DialogoFormulario
                        titulo={t.dialogoVerificar.titulo}
                        textoBoton={t.verificar}
                        varianteBoton="outline"
                        tamanoBoton="xs"
                        campos={[{ nombre: "fecha", etiqueta: t.dialogoVerificar.fecha, tipo: "text", ayuda: t.dialogoVerificar.ayuda, placeholder: "AAAA-MM-DD" }]}
                        accion={marcarVerificadoAction.bind(null, r.id)}
                        textoEnviar={t.dialogoVerificar.enviar}
                        exito={t.dialogoVerificar.exito}
                      />
                    ) : (
                      ""
                    )}
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
