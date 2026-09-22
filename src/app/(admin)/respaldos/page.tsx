import type { Metadata } from "next";
import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { marcarVerificadoAction } from "@/lib/acciones/respaldos";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { formatearChileno, hoyEnChile, sumarDias, ZONA_HORARIA_CHILE, type FechaCivil } from "@/lib/fechas/civil";
import { formatearFechaHora, formatearTamano } from "@/lib/formato";
import type { Respaldo } from "@/generated/prisma/client";
import { cn } from "cn";
import { BotonRespaldo } from "./acciones";
import { textosRespaldos as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

const DIAS_VISTA = 30;
const HORAS_TOLERANCIA = 26;

type EstadoDia = "ok" | "error" | "sin";
interface Dia {
  fecha: FechaCivil;
  estado: EstadoDia;
  verificado: boolean;
  detalle: string;
}

/** Nombre del archivo y si va cifrado (extensión .age), a partir del destino completo. */
function archivoDe(destino: string): { nombre: string; cifrado: boolean } {
  const nombre = destino.split(/[\\/]/).pop() ?? destino;
  return { nombre, cifrado: nombre.endsWith(".age") };
}

/** Un día por celda, del más antiguo al más reciente, con el mejor resultado del día. */
function ultimosDias(respaldos: Respaldo[], hoy: FechaCivil): Dia[] {
  const porDia = new Map<FechaCivil, Respaldo[]>();
  for (const r of respaldos) {
    const dia = hoyEnChile(r.fecha);
    porDia.set(dia, [...(porDia.get(dia) ?? []), r]);
  }
  const dias: Dia[] = [];
  for (let i = DIAS_VISTA - 1; i >= 0; i--) {
    const fecha = sumarDias(hoy, -i);
    const del = porDia.get(fecha) ?? [];
    const ok = del.find((r) => r.resultado === "OK");
    const estado: EstadoDia = ok ? "ok" : del.length > 0 ? "error" : "sin";
    const detalle = ok ? `${formatearChileno(fecha)} · OK · ${formatearTamano(Number(ok.tamano))}` : del.length > 0 ? `${formatearChileno(fecha)} · ${t.estado.error}` : `${formatearChileno(fecha)} · ${t.estado.sinRespaldo}`;
    dias.push({ fecha, estado, verificado: del.some((r) => r.verificadoEl !== null), detalle });
  }
  return dias;
}

function horaEnChile(ahora: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: ZONA_HORARIA_CHILE }).format(ahora));
}

// Módulo Respaldos (doc 05 §12, doc 13 F11, subcriterio 15): estado de un vistazo, último verificado, política e historial.
export default async function RespaldosPage() {
  await exigirSesion({ roles: ["ADMIN"] });
  const respaldos = await prisma.respaldo.findMany({ orderBy: { fecha: "desc" }, take: 200 });
  const verificado = respaldos.filter((r) => r.verificadoEl).sort((a, b) => b.verificadoEl!.getTime() - a.verificadoEl!.getTime())[0] ?? null;
  const ultimo = respaldos[0] ?? null;
  const ahora = new Date();
  const hoy = hoyEnChile(ahora);
  const horasDesdeUltimo = ultimo ? (ahora.getTime() - ultimo.fecha.getTime()) / 3_600_000 : Infinity;
  const situacion: "alDia" | "atrasado" | "error" | "ninguno" = !ultimo ? "ninguno" : ultimo.resultado !== "OK" ? "error" : horasDesdeUltimo <= HORAS_TOLERANCIA ? "alDia" : "atrasado";
  const dias = ultimosDias(respaldos, hoy);
  const conRespaldo = dias.filter((d) => d.estado === "ok").length;
  const conError = dias.filter((d) => d.estado === "error").length;
  const proximo = horaEnChile(ahora) < 3 ? t.estado.proximoHoy : t.estado.proximoManana;
  const colorSituacion = { alDia: "border-correcto", atrasado: "border-alerta", error: "border-error", ninguno: "border-linea" }[situacion];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
        </div>
        <BotonRespaldo />
      </div>

      {/* Estado de un vistazo: último respaldo, último verificado y los últimos 30 días */}
      <div className="grid gap-4 md:grid-cols-3">
        <section className={cn("rounded-lg border-2 bg-superficie p-4", colorSituacion)}>
          <h2 className="text-sm font-medium">{t.estado.ultimo}</h2>
          {ultimo ? (
            <div className="mt-1">
              <p className="text-lg font-semibold">{formatearFechaHora(ultimo.fecha)}</p>
              <p className="text-xs text-tinta-secundaria">
                {t.tipos[ultimo.tipo] ?? ultimo.tipo} · {formatearTamano(Number(ultimo.tamano))} · {ultimo.duracionSeg} s
              </p>
              {/* Texto en tinta sobre fondo tenue: el ámbar y el rojo sobre blanco no llegan al contraste AA */}
              <p
                className={cn(
                  "mt-2 inline-block rounded-md border px-2 py-0.5 text-sm font-medium text-tinta",
                  situacion === "alDia" ? "border-correcto bg-correcto/10" : situacion === "atrasado" ? "border-alerta bg-alerta/10" : "border-error bg-error/10",
                )}
              >
                {t.estado[situacion]}
              </p>
              <p className="text-xs text-tinta-secundaria">{proximo}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-tinta-secundaria">{t.vacio}</p>
          )}
        </section>
        <section className="rounded-lg border border-institucional bg-institucional-suave p-4 text-tinta">
          <h2 className="text-sm font-medium">{t.ultimoVerificado}</h2>
          {verificado ? (
            <div className="mt-1">
              <p className="text-lg font-semibold">{formatearFechaHora(verificado.fecha)}</p>
              <p className="text-xs">
                {t.tipos[verificado.tipo] ?? verificado.tipo} · {formatearTamano(Number(verificado.tamano))}
              </p>
              <p className="mt-2 text-sm font-medium">
                {t.estado.verificadoEl} {formatearFechaHora(verificado.verificadoEl!)}
              </p>
              <p className="text-xs" title={verificado.hash}>
                SHA-256 <span className="font-mono">{verificado.hash.slice(0, 12)}…</span>
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm">{t.ninguno}</p>
          )}
        </section>
        <section className="rounded-lg border border-linea bg-superficie p-4">
          <h2 className="text-sm font-medium">{t.estado.ultimos30}</h2>
          <p className="mt-1 text-lg font-semibold">{t.estado.resumen30(conRespaldo, DIAS_VISTA, conError)}</p>
          <ul className="mt-2 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1" aria-label={t.estado.ultimos30}>
            {dias.map((d) => (
              <li
                key={d.fecha}
                title={d.detalle}
                aria-label={d.detalle}
                className={cn(
                  "flex h-4 items-center justify-center rounded-sm text-[0.6rem] leading-none text-white",
                  d.estado === "ok" ? "bg-correcto" : d.estado === "error" ? "bg-error" : "bg-linea",
                )}
              >
                {d.verificado ? "✓" : ""}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-tinta-secundaria">{t.estado.leyenda}</p>
        </section>
      </div>

      <section className="rounded-lg border border-linea bg-superficie p-4">
        <h2 className="text-sm font-medium">{t.politica.titulo}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tinta-secundaria">
          {t.politica.puntos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{t.historial}</h2>
        {respaldos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-linea p-8 text-center text-sm text-tinta-secundaria">{t.vacio}</p>
        ) : (
          <>
            {/* Celular: una tarjeta por respaldo */}
            <ul className="flex flex-col gap-2 md:hidden">
              {respaldos.map((r) => {
                const archivo = archivoDe(r.destino);
                return (
                  <li key={r.id} className="flex flex-col gap-1 rounded-lg border border-linea bg-superficie p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{formatearFechaHora(r.fecha)}</span>
                      <Badge className={r.resultado === "OK" ? "bg-correcto text-white" : "bg-error text-white"}>{r.resultado}</Badge>
                    </div>
                    <p className="text-xs text-tinta-secundaria">
                      {t.tipos[r.tipo] ?? r.tipo} · {formatearTamano(Number(r.tamano))} · {r.duracionSeg} s{archivo.cifrado ? ` · ${t.estado.cifrado}` : ""}
                    </p>
                    <p className="truncate text-xs text-tinta-secundaria" title={r.destino}>{archivo.nombre}</p>
                    <p className="text-xs text-tinta-secundaria" title={r.hash}>
                      SHA-256 <span className="font-mono">{r.hash.slice(0, 12)}</span>
                    </p>
                    <Verificacion r={r} />
                  </li>
                );
              })}
            </ul>
            {/* Escritorio y tablet: tabla */}
            <div className="hidden overflow-x-auto rounded-lg border border-linea bg-superficie md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.columnas.fecha}</TableHead>
                    <TableHead>{t.columnas.resultado}</TableHead>
                    <TableHead>{t.columnas.archivo}</TableHead>
                    <TableHead className="text-right">{t.columnas.tamano}</TableHead>
                    <TableHead className="text-right">{t.columnas.duracion}</TableHead>
                    <TableHead>{t.columnas.hash}</TableHead>
                    <TableHead>{t.columnas.verificacion}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {respaldos.map((r) => {
                    const archivo = archivoDe(r.destino);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap font-medium">{formatearFechaHora(r.fecha)}</TableCell>
                        <TableCell>
                          <Badge className={r.resultado === "OK" ? "bg-correcto text-white" : "bg-error text-white"}>{r.resultado}</Badge>
                        </TableCell>
                        <TableCell className="text-xs" title={r.destino}>
                          <span className="block">{t.tipos[r.tipo] ?? r.tipo}</span>
                          <span className="text-tinta-secundaria">{archivo.nombre}</span>
                          {archivo.cifrado && (
                            <Badge variant="outline" className="ml-1.5">
                              {t.estado.cifrado}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatearTamano(Number(r.tamano))}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{r.duracionSeg} s</TableCell>
                        <TableCell className="font-mono text-xs" title={r.hash}>{r.hash.slice(0, 12)}</TableCell>
                        <TableCell>
                          <Verificacion r={r} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** Estado de verificación de un respaldo: fecha en verde si se restauró, botón discreto para marcarlo si está OK. */
function Verificacion({ r }: { r: Respaldo }) {
  if (r.verificadoEl) {
    return (
      <span className="text-xs font-medium text-correcto">
        ✓ {t.estado.verificadoEl} {formatearFechaHora(r.verificadoEl)}
      </span>
    );
  }
  if (r.resultado !== "OK") return <span className="text-xs text-tinta-secundaria">—</span>;
  return (
    <DialogoFormulario
      titulo={t.dialogoVerificar.titulo}
      textoBoton={t.verificar}
      varianteBoton="ghost"
      tamanoBoton="xs"
      campos={[{ nombre: "fecha", etiqueta: t.dialogoVerificar.fecha, tipo: "fecha", ayuda: t.dialogoVerificar.ayuda }]}
      accion={marcarVerificadoAction.bind(null, r.id)}
      textoEnviar={t.dialogoVerificar.enviar}
      exito={t.dialogoVerificar.exito}
    />
  );
}
