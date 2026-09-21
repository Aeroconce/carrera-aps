import type { Metadata } from "next";
import Link from "next/link";
import { TabsFicha } from "@/app/(admin)/funcionarios/[id]/tabs-ficha";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { vistaCarrera } from "@/lib/carrera/vista-carrera";
import { formatearChileno } from "@/lib/fechas/civil";
import { formatearFecha, formatearMesAnio, formatearPuntos, formatearRut, nombreCompleto } from "@/lib/formato";
import { BotonRecalcular } from "./acciones";
import { BieniosPorReconocer } from "./bienios-por-reconocer";
import { textosCarrera as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Módulo Carrera (doc 05 §3): bienios por reconocer (con masiva), cumplen ascenso, proyecciones y recalcular.
export default async function CarreraPage({ searchParams }: { searchParams: Promise<{ pestana?: string }> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const { pestana } = await searchParams;
  const puedeEditar = rolDe(sesion.user) === "ADMIN";
  const vista = await vistaCarrera(sesion.user.institucionId!);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">
            {t.intro} {t.dotacion(vista.totalFuncionarios)} · Situación al {formatearChileno(vista.fechaCorte)}.
          </p>
        </div>
        {puedeEditar && <BotonRecalcular />}
      </div>

      <TabsFicha
        inicial={pestana ?? "bienios"}
        pestanas={[
          {
            valor: "bienios",
            etiqueta: `${t.pestanas.bienios} (${vista.bienios.length})`,
            contenido: (
              <BieniosPorReconocer
                puedeEditar={puedeEditar}
                filas={vista.bienios.map((b) => ({
                  clave: `${b.funcionario.id}:${b.numero}`,
                  funcionarioId: b.funcionario.id,
                  nombre: nombreCompleto(b.funcionario),
                  rut: b.funcionario.rut,
                  establecimiento: b.funcionario.establecimiento,
                  numero: b.numero,
                  fechaCumplido: b.fechaCumplido,
                  dias: b.diasDesdeCumplido,
                  puntos: formatearPuntos(b.puntaje),
                }))}
              />
            ),
          },
          {
            valor: "ascensos",
            etiqueta: `${t.pestanas.ascensos} (${vista.ascensos.length})`,
            contenido: (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-tinta-secundaria">{t.ascensos.intro}</p>
                {vista.ascensos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.ascensos.vacio}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.ascensos.columnas.funcionario}</TableHead>
                          <TableHead>{t.ascensos.columnas.establecimiento}</TableHead>
                          <TableHead className="text-right">{t.ascensos.columnas.vigente}</TableHead>
                          <TableHead>{t.ascensos.columnas.desde}</TableHead>
                          <TableHead className="text-right">{t.ascensos.columnas.calculado}</TableHead>
                          <TableHead className="text-right">{t.ascensos.columnas.puntaje}</TableHead>
                          <TableHead className="text-right">{t.ascensos.columnas.umbral}</TableHead>
                          {puedeEditar && <TableHead />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vista.ascensos.map((a) => (
                          <TableRow key={a.funcionario.id}>
                            <TableCell>
                              <Link href={`/funcionarios/${a.funcionario.id}?pestana=nivel`} className="font-medium text-institucional hover:underline">{nombreCompleto(a.funcionario)}</Link>
                              <span className="block text-xs text-tinta-secundaria">{formatearRut(a.funcionario.rut)} · Cat. {a.funcionario.categoria}</span>
                            </TableCell>
                            <TableCell>{a.funcionario.establecimiento}</TableCell>
                            <TableCell className="text-right">{a.nivelVigente ?? ""}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatearFecha(a.vigenteDesde)}</TableCell>
                            <TableCell className="text-right font-medium">{a.nivelCalculado}</TableCell>
                            <TableCell className="text-right">{formatearPuntos(a.puntajeTotal)}</TableCell>
                            <TableCell className="text-right">{formatearPuntos(a.umbral)}</TableCell>
                            {puedeEditar && (
                              <TableCell>
                                <Link href={`/funcionarios/${a.funcionario.id}?pestana=nivel`} className={buttonVariants({ variant: "outline", size: "xs" })}>{t.ascensos.registrar}</Link>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ),
          },
          {
            valor: "proyecciones",
            etiqueta: t.pestanas.proyecciones,
            contenido: (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-tinta-secundaria">{t.proyecciones.intro}</p>
                {vista.proyecciones.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.proyecciones.vacio}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.proyecciones.columnas.funcionario}</TableHead>
                          <TableHead className="text-right">{t.proyecciones.columnas.vigente}</TableHead>
                          <TableHead className="text-right">{t.proyecciones.columnas.siguiente}</TableHead>
                          <TableHead className="text-right">{t.proyecciones.columnas.puntaje}</TableHead>
                          <TableHead className="text-right">{t.proyecciones.columnas.faltan}</TableHead>
                          <TableHead>{t.proyecciones.columnas.fecha}</TableHead>
                          <TableHead>{t.proyecciones.columnas.supuestos}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vista.proyecciones.map((p) => (
                          <TableRow key={p.funcionario.id}>
                            <TableCell>
                              <Link href={`/funcionarios/${p.funcionario.id}?pestana=nivel`} className="font-medium text-institucional hover:underline">{nombreCompleto(p.funcionario)}</Link>
                              <span className="block text-xs text-tinta-secundaria">{formatearRut(p.funcionario.rut)} · {p.funcionario.establecimiento}</span>
                            </TableCell>
                            <TableCell className="text-right">{p.nivelVigente ?? ""}</TableCell>
                            <TableCell className="text-right">{p.nivelSiguiente}</TableCell>
                            <TableCell className="text-right">{formatearPuntos(p.puntajeTotal)}</TableCell>
                            <TableCell className="text-right font-medium">{formatearPuntos(p.puntajeFaltante)}</TableCell>
                            <TableCell className="whitespace-nowrap">{p.fechaEstimada ? `${formatearFecha(p.fechaEstimada)} (${formatearMesAnio(p.fechaEstimada)})` : t.proyecciones.noAlcanzable}</TableCell>
                            <TableCell className="max-w-md text-xs text-tinta-secundaria">{p.descripcion}</TableCell>
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
