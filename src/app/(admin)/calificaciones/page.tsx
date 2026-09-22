import type { Metadata } from "next";
import Link from "next/link";
import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adjuntarActaAction, agregarNotaAction, crearProcesoAction } from "@/lib/acciones/calificaciones";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { cargarReglas } from "@/lib/carrera/reglas";
import { aFactorBase } from "@/lib/db/calificaciones";
import { prisma } from "@/lib/db/prisma";
import { desdeDate, formatearChileno, hoyEnChile } from "@/lib/fechas/civil";
import { formatearFecha, formatearPuntos, formatearRut, nombreCompleto } from "@/lib/formato";
import { BotonEstadoProceso } from "./acciones";
import { DialogoCalificar, type EscalaCalificacion } from "./dialogo-calificar";
import { PanelComision, PanelFactores } from "./panel-proceso";
import { textosCalificaciones as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Módulo Calificaciones (BT 4.6, doc 05 §6, doc 13 F15): procesos con comisión y factores; calificación por
// funcionario con notas por factor, puntaje final calculado, lista, acta y anotaciones.
export default async function CalificacionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const puedeEditar = rolDe(sesion.user) === "ADMIN";
  const params = await searchParams;
  const uno = (k: string) => (typeof params[k] === "string" && (params[k] as string).trim() ? (params[k] as string).trim() : undefined);
  const procesos = await prisma.procesoCalificacion.findMany({
    where: { institucionId },
    include: { _count: { select: { calificaciones: true, factores: true } }, comision: { orderBy: { createdAt: "asc" } }, factores: true },
    orderBy: { periodoDesde: "desc" },
  });
  const procesoId = uno("proceso") ?? procesos.find((p) => p.estado === "ABIERTO")?.id ?? procesos[0]?.id;
  const proceso = procesos.find((p) => p.id === procesoId) ?? null;
  const origen = proceso ? (procesos.find((p) => p.id !== proceso.id && p._count.factores > 0) ?? null) : null;
  const q = uno("q");
  const soloPendientes = uno("pendientes") === "1";
  const rut = q ? q.replace(/[^0-9kK]/g, "").toUpperCase() : "";

  const [funcionarios, reglas] = await Promise.all([
    proceso
      ? prisma.funcionario.findMany({
          where: {
            institucionId,
            estado: "ACTIVO",
            ...(q ? { OR: [{ nombres: { contains: q, mode: "insensitive" } }, { apellidos: { contains: q, mode: "insensitive" } }, ...(rut ? [{ rut: { startsWith: rut } }] : [])] } : {}),
          },
          include: {
            establecimiento: { select: { nombre: true } },
            calificaciones: { where: { procesoId: proceso.id }, include: { notasMerito: true, acta: { select: { id: true, nombre: true } } } },
          },
          orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
        })
      : [],
    cargarReglas(institucionId),
  ]);
  const filas = soloPendientes ? funcionarios.filter((f) => f.calificaciones.length === 0) : funcionarios;
  const totalActivos = await prisma.funcionario.count({ where: { institucionId, estado: "ACTIVO" } });
  const factores = proceso ? proceso.factores.map(aFactorBase) : [];
  const escalaDe = (categoria: "A" | "B" | "C" | "D" | "E" | "F"): EscalaCalificacion | null => {
    const regla = proceso ? reglas.parametrosOpcionales("CALIFICACION", desdeDate(proceso.periodoHasta), categoria) : null;
    return regla ? { minima: regla.escalaMinima, maxima: regla.escalaMaxima, listas: regla.listas.map((l) => ({ nombre: l.nombre, puntajeMinimo: l.puntajeMinimo })), listaConMerito: regla.listaConMerito } : null;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        {puedeEditar && (
          <DialogoFormulario
            titulo={t.dialogoProceso.titulo}
            textoBoton={t.nuevoProceso}
            campos={[
              { nombre: "nombre", etiqueta: t.dialogoProceso.nombre, tipo: "text", requerido: true, ancho: "completo", valorInicial: `Calificación ${hoyEnChile().slice(0, 4)}` },
              { nombre: "periodoDesde", etiqueta: t.dialogoProceso.periodoDesde, tipo: "fecha", requerido: true, valorInicial: `01/01/${hoyEnChile().slice(0, 4)}` },
              { nombre: "periodoHasta", etiqueta: t.dialogoProceso.periodoHasta, tipo: "fecha", requerido: true, valorInicial: `31/12/${hoyEnChile().slice(0, 4)}` },
            ]}
            accion={crearProcesoAction}
            textoEnviar={t.dialogoProceso.enviar}
            exito={t.dialogoProceso.exito}
          />
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{t.procesos}</h2>
        {procesos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.sinProcesos}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columnasProceso.nombre}</TableHead>
                  <TableHead>{t.columnasProceso.periodo}</TableHead>
                  <TableHead>{t.columnasProceso.estado}</TableHead>
                  <TableHead className="text-right">{t.columnasProceso.calificados}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {procesos.map((p) => (
                  <TableRow key={p.id} className={p.id === proceso?.id ? "bg-institucional-suave/40" : ""}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatearFecha(p.periodoDesde)} – {formatearFecha(p.periodoHasta)}</TableCell>
                    <TableCell>{p.estado === "ABIERTO" ? <Badge className="bg-correcto text-white">{t.estados.ABIERTO}</Badge> : <Badge variant="outline">{t.estados.CERRADO}</Badge>}</TableCell>
                    <TableCell className="text-right">{p._count.calificaciones}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/calificaciones?proceso=${p.id}`} className={buttonVariants({ variant: "outline", size: "xs" })}>{t.ver}</Link>
                        {puedeEditar && <BotonEstadoProceso id={p.id} estado={p.estado} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {proceso ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium">{proceso.nombre}</h2>
            <p className="text-sm text-tinta-secundaria">{t.resumen(proceso._count.calificaciones, totalActivos)}</p>
          </div>
          {puedeEditar && proceso.estado !== "ABIERTO" && <p className="rounded-lg border border-linea bg-superficie px-3 py-2 text-sm text-tinta-secundaria">{t.soloAbierto}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            <PanelComision procesoId={proceso.id} abierto={proceso.estado === "ABIERTO"} integrantes={proceso.comision} puedeEditar={puedeEditar} />
            <PanelFactores procesoId={proceso.id} abierto={proceso.estado === "ABIERTO"} factores={factores} puedeEditar={puedeEditar} origen={origen ? { id: origen.id, nombre: origen.nombre } : null} />
          </div>
          <form method="get" action="/calificaciones" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
            <input type="hidden" name="proceso" value={proceso.id} />
            <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-56">
              {t.filtros.buscar}
              <Input name="q" defaultValue={q ?? ""} placeholder="RUT o apellido" className="h-10" />
            </label>
            <label className="flex items-center gap-2 text-sm md:h-10">
              <input type="checkbox" name="pendientes" value="1" defaultChecked={soloPendientes} className="size-4" />
              {t.filtros.pendientes}
            </label>
            <div className="flex gap-2">
              <button type="submit" className={buttonVariants({ variant: "outline", className: "h-10" })}>{t.filtros.aplicar}</button>
              <Link href={`/calificaciones?proceso=${proceso.id}`} className={buttonVariants({ variant: "ghost", className: "h-10" })}>{t.filtros.limpiar}</Link>
            </div>
          </form>
          {filas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.columnas.funcionario}</TableHead>
                    <TableHead>{t.columnas.establecimiento}</TableHead>
                    <TableHead className="text-right">{t.columnas.puntaje}</TableHead>
                    <TableHead>{t.columnas.lista}</TableHead>
                    <TableHead>{t.columnas.acta}</TableHead>
                    <TableHead>{t.columnas.notas}</TableHead>
                    {puedeEditar && <TableHead>{t.columnas.acciones}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((f) => {
                    const c = f.calificaciones[0];
                    const escala = escalaDe(f.categoria);
                    const meritos = c?.notasMerito.filter((n) => n.tipo === "MERITO").length ?? 0;
                    const demeritos = c?.notasMerito.filter((n) => n.tipo === "DEMERITO").length ?? 0;
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Link href={`/funcionarios/${f.id}?pestana=calificaciones`} className="font-medium text-institucional hover:underline">{nombreCompleto(f)}</Link>
                          <span className="block text-xs text-tinta-secundaria">{formatearRut(f.rut)} · Cat. {f.categoria}</span>
                        </TableCell>
                        <TableCell>{f.establecimiento.nombre}</TableCell>
                        <TableCell className="text-right">{c ? formatearPuntos(c.puntajeFinal) : <span className="text-tinta-secundaria">{t.sinCalificar}</span>}</TableCell>
                        <TableCell>{c?.lista ? <Badge variant={escala && c.lista === escala.listaConMerito ? "default" : "secondary"}>{c.lista}</Badge> : ""}</TableCell>
                        <TableCell className="text-xs">
                          {c?.acta ? (
                            <a href={`/documentos/${c.acta.id}/descargar`} className="text-institucional underline" aria-label={`${t.acta.ver}: ${nombreCompleto(f)}`}>{t.acta.ver}</a>
                          ) : c ? (
                            <span className="text-tinta-secundaria">{t.acta.sinActa}</span>
                          ) : (
                            ""
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-tinta-secundaria">{c ? `${meritos} ${t.merito} · ${demeritos} ${t.demerito}` : ""}</TableCell>
                        {puedeEditar && (
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {proceso.estado === "ABIERTO" && (
                                <DialogoCalificar
                                  procesoId={proceso.id}
                                  funcionarioId={f.id}
                                  nombre={nombreCompleto(f)}
                                  factores={factores}
                                  escala={escala}
                                  inicial={c ? { puntajes: (c.puntajes ?? {}) as Record<string, number>, puntajeFinal: Number(c.puntajeFinal), observaciones: c.observaciones, tieneActa: c.acta !== null } : null}
                                />
                              )}
                              {c && !c.acta && (
                                <DialogoFormulario
                                  titulo={t.acta.dialogo.titulo(nombreCompleto(f))}
                                  descripcion={t.acta.dialogo.descripcion}
                                  textoBoton={t.acta.adjuntar}
                                  varianteBoton="outline"
                                  tamanoBoton="xs"
                                  campos={[{ nombre: "acta", etiqueta: t.acta.dialogo.archivo, tipo: "archivo", requerido: true, aceptar: ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" }]}
                                  accion={adjuntarActaAction.bind(null, c.id)}
                                  textoEnviar={t.acta.dialogo.enviar}
                                  exito={t.acta.dialogo.exito}
                                />
                              )}
                              {c && (
                                <DialogoFormulario
                                  titulo={t.dialogoNota.titulo}
                                  textoBoton={t.anotar}
                                  varianteBoton="outline"
                                  tamanoBoton="xs"
                                  campos={[
                                    { nombre: "tipo", etiqueta: t.dialogoNota.tipo, tipo: "select", requerido: true, valorInicial: "MERITO", opciones: t.dialogoNota.tipos },
                                    { nombre: "fecha", etiqueta: t.dialogoNota.fecha, tipo: "fecha", requerido: true, valorInicial: formatearChileno(hoyEnChile()) },
                                    { nombre: "descripcion", etiqueta: t.dialogoNota.descripcion, tipo: "textarea", requerido: true },
                                  ]}
                                  accion={agregarNotaAction.bind(null, c.id)}
                                  textoEnviar={t.dialogoNota.enviar}
                                  exito={t.dialogoNota.exito}
                                />
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : (
        procesos.length > 0 && <p className="text-sm text-tinta-secundaria">{t.elegirProceso}</p>
      )}
    </div>
  );
}
