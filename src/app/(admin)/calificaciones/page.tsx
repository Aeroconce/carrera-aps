import type { Metadata } from "next";
import Link from "next/link";
import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agregarNotaAction, calificarAction, crearProcesoAction } from "@/lib/acciones/calificaciones";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { cargarReglas } from "@/lib/carrera/reglas";
import { prisma } from "@/lib/db/prisma";
import { desdeDate, formatearChileno, hoyEnChile } from "@/lib/fechas/civil";
import { formatearFecha, formatearPuntos, formatearRut, nombreCompleto } from "@/lib/formato";
import { BotonEstadoProceso } from "./acciones";
import { textosCalificaciones as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Módulo Calificaciones (BT 4.6, doc 05 §6, doc 13 F15), simplificado: procesos mínimos y calificación por funcionario.
export default async function CalificacionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const puedeEditar = rolDe(sesion.user) === "ADMIN";
  const params = await searchParams;
  const uno = (k: string) => (typeof params[k] === "string" && (params[k] as string).trim() ? (params[k] as string).trim() : undefined);
  const procesos = await prisma.procesoCalificacion.findMany({ where: { institucionId }, include: { _count: { select: { calificaciones: true } } }, orderBy: { periodoDesde: "desc" } });
  const procesoId = uno("proceso") ?? procesos.find((p) => p.estado === "ABIERTO")?.id ?? procesos[0]?.id;
  const proceso = procesos.find((p) => p.id === procesoId) ?? null;
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
          include: { establecimiento: { select: { nombre: true } }, calificaciones: { where: { procesoId: proceso.id }, include: { notasMerito: true } } },
          orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
        })
      : [],
    cargarReglas(institucionId),
  ]);
  const filas = soloPendientes ? funcionarios.filter((f) => f.calificaciones.length === 0) : funcionarios;
  const totalActivos = await prisma.funcionario.count({ where: { institucionId, estado: "ACTIVO" } });
  const reglaDe = (categoria: "A" | "B" | "C" | "D" | "E" | "F") => (proceso ? reglas.parametrosOpcionales("CALIFICACION", desdeDate(proceso.periodoHasta), categoria) : null);

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
                    <TableHead>{t.columnas.notas}</TableHead>
                    {puedeEditar && <TableHead>{t.columnas.acciones}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((f) => {
                    const c = f.calificaciones[0];
                    const regla = reglaDe(f.categoria);
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
                        <TableCell>{c?.lista ? <Badge variant={regla && c.lista === regla.listaConMerito ? "default" : "secondary"}>{c.lista}</Badge> : ""}</TableCell>
                        <TableCell className="text-xs text-tinta-secundaria">{c ? `${meritos} ${t.merito} · ${demeritos} ${t.demerito}` : ""}</TableCell>
                        {puedeEditar && (
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {proceso.estado === "ABIERTO" && (
                                <DialogoFormulario
                                  titulo={t.dialogoCalificar.titulo(nombreCompleto(f))}
                                  descripcion={regla ? t.dialogoCalificar.descripcion(regla.escalaMinima, regla.escalaMaxima, regla.listaConMerito) : undefined}
                                  textoBoton={c ? t.editar : t.calificar}
                                  varianteBoton={c ? "outline" : "default"}
                                  tamanoBoton="xs"
                                  campos={[
                                    { nombre: "puntajeFinal", etiqueta: t.dialogoCalificar.puntaje, tipo: "number", requerido: true, min: regla?.escalaMinima, max: regla?.escalaMaxima, paso: "0.1", valorInicial: c ? Number(c.puntajeFinal) : null },
                                    { nombre: "observaciones", etiqueta: t.dialogoCalificar.observaciones, tipo: "textarea", valorInicial: c?.observaciones ?? "" },
                                  ]}
                                  accion={calificarAction.bind(null, proceso.id, f.id)}
                                  textoEnviar={t.dialogoCalificar.enviar}
                                  exito={t.dialogoCalificar.exito}
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
