// Secciones de la ficha (doc 05 módulo 2): componentes de servidor que muestran el historial y el estado de
// carrera calculado por el motor. Las acciones (registrar, reconocer, cambiar nivel) se montan aparte.

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CarreraDeFuncionario } from "@/lib/carrera/funcionario";
import { formatearFecha, formatearFechaHora, formatearMesAnio, formatearPuntos, formatearRut, puntosConUnidad } from "@/lib/formato";
import type { AlertaCalculada } from "@/lib/motor/alertas";
import type { Auditoria } from "@/generated/prisma/client";
import { textosFuncionarios } from "../textos";

const t = textosFuncionarios.ficha;

export function Definicion({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-tinta-secundaria">{etiqueta}</dt>
      <dd className="text-sm">{children || "—"}</dd>
    </div>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{texto}</p>;
}

function Tarjeta({ titulo, children, acciones }: { titulo?: string; children: ReactNode; acciones?: ReactNode }) {
  return (
    <section className="rounded-lg border border-linea bg-superficie">
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-3">
          {titulo && <h2 className="text-base font-medium">{titulo}</h2>}
          {acciones}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function SeccionDatos({ carrera, acciones }: { carrera: CarreraDeFuncionario; acciones?: ReactNode }) {
  const f = carrera.funcionario;
  const a = f.apertura;
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta acciones={acciones}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Definicion etiqueta={t.datos.rut}>{formatearRut(f.rut)}</Definicion>
          <Definicion etiqueta={t.datos.nombres}>{f.nombres}</Definicion>
          <Definicion etiqueta={t.datos.apellidos}>{f.apellidos}</Definicion>
          <Definicion etiqueta={t.datos.fechaNacimiento}>{formatearFecha(f.fechaNacimiento)}</Definicion>
          <Definicion etiqueta={t.datos.email}>{f.email}</Definicion>
          <Definicion etiqueta={t.datos.categoria}>{f.categoria}</Definicion>
          <Definicion etiqueta={t.datos.tipoContrato}>{t.contrato[f.tipoContrato]}</Definicion>
          <Definicion etiqueta={t.datos.fechaIngreso}>{formatearFecha(f.fechaIngreso)}</Definicion>
          <Definicion etiqueta={t.datos.establecimiento}>{f.establecimiento.nombre}</Definicion>
          <Definicion etiqueta={t.datos.cargo}>{f.cargo}</Definicion>
          <Definicion etiqueta={t.datos.jornada}>{f.jornadaHoras ? `${f.jornadaHoras} ${t.datos.horas}` : ""}</Definicion>
          <Definicion etiqueta={t.datos.estado}>{t.estado[f.estado]}</Definicion>
          {f.estado === "INACTIVO" && (
            <>
              <Definicion etiqueta={t.datos.fechaEgreso}>{formatearFecha(f.fechaEgreso)}</Definicion>
              <Definicion etiqueta={t.datos.motivoEgreso}>{f.motivoEgreso}</Definicion>
            </>
          )}
        </dl>
      </Tarjeta>
      {a && (
        <Tarjeta titulo={t.datos.apertura}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Definicion etiqueta={t.datos.aperturaFecha}>{formatearFecha(a.fecha)}</Definicion>
            <Definicion etiqueta={t.datos.aperturaTotal}>{puntosConUnidad(a.puntajeTotal)}</Definicion>
            <Definicion etiqueta={t.datos.aperturaDesglose}>
              {a.desglosado ? `${formatearPuntos(a.puntajeExperiencia)} / ${formatearPuntos(a.puntajeCapacitacion)}` : t.datos.aperturaSinDesglose}
            </Definicion>
            <Definicion etiqueta={t.nivel.vigente}>{`${a.nivel} · ${t.nivel.desde} ${formatearFecha(a.nivelDesde)}`}</Definicion>
            <Definicion etiqueta={t.datos.aperturaUltimoBienio}>
              {a.fechaUltimoBienio ? `${formatearFecha(a.fechaUltimoBienio)}${a.bieniosReconocidos ? ` (bienio ${a.bieniosReconocidos})` : ""}` : ""}
            </Definicion>
            <Definicion etiqueta={t.datos.aperturaFuente}>{a.fuente}</Definicion>
          </dl>
        </Tarjeta>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SeccionExperiencia({ carrera, acciones, accionBienio }: { carrera: CarreraDeFuncionario; acciones?: ReactNode; accionBienio?: (bienio: CarreraDeFuncionario["estado"]["bienios"]["bienios"][number]) => ReactNode }) {
  const { funcionario: f, estado } = carrera;
  const te = t.experiencia;
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo={te.periodos} acciones={acciones}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{te.institucion}</TableHead>
              <TableHead>{te.desde}</TableHead>
              <TableHead>{te.hasta}</TableHead>
              <TableHead>{te.reconocidaEl}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {f.experiencias.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  {e.institucion} <Badge variant={e.esPropia ? "secondary" : "outline"} className="ml-1">{e.esPropia ? te.propia : te.reconocida}</Badge>
                </TableCell>
                <TableCell>{formatearFecha(e.fechaDesde)}</TableCell>
                <TableCell>{e.fechaHasta ? formatearFecha(e.fechaHasta) : te.vigente}</TableCell>
                <TableCell>{e.esPropia ? "" : formatearFecha(e.reconocidaEl)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Tarjeta>

      <Tarjeta titulo={te.bienios}>
        {estado.sinInformacion ? (
          <Vacio texto={t.riel.sinInformacion} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{te.numero}</TableHead>
                  <TableHead>{te.fechaCumplido}</TableHead>
                  <TableHead>{te.fechaReconocido}</TableHead>
                  <TableHead>{te.decreto}</TableHead>
                  <TableHead className="text-right">{te.puntos}</TableHead>
                  <TableHead>{te.estado}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estado.bienios.bienios.map((b) => (
                  <TableRow key={b.numero}>
                    <TableCell>{b.numero}</TableCell>
                    <TableCell>{formatearFecha(b.fechaCumplido)}</TableCell>
                    <TableCell>{formatearFecha(b.fechaReconocido)}</TableCell>
                    <TableCell>{b.decretoNumero ?? ""}</TableCell>
                    <TableCell className="text-right">{formatearPuntos(b.puntaje)}</TableCell>
                    <TableCell>
                      {b.incluidoEnApertura ? (
                        <Badge variant="outline">{te.enSaldo}</Badge>
                      ) : b.fechaReconocido ? (
                        <Badge className="bg-correcto text-white">{te.reconocido}</Badge>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Badge className="bg-alerta text-white">{te.cumplidoSinReconocer}</Badge>
                          {accionBienio?.(b)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Definicion etiqueta={te.proximoBienio}>{estado.bienios.proximoBienio ? formatearFecha(estado.bienios.proximoBienio) : te.sinProximo}</Definicion>
              <Definicion etiqueta={te.puntajeExperiencia}>{puntosConUnidad(estado.puntaje.experiencia)}</Definicion>
              <Definicion etiqueta={te.diasServicio}>{formatearPuntos(estado.bienios.diasServicio)}</Definicion>
            </dl>
          </>
        )}
      </Tarjeta>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SeccionCapacitaciones({ carrera, acciones }: { carrera: CarreraDeFuncionario; acciones?: ReactNode }) {
  const { funcionario: f, estado } = carrera;
  const tc = t.capacitaciones;
  const actividades = estado.capacitacion.actividades;
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta acciones={acciones}>
        {f.capacitaciones.length === 0 ? (
          <Vacio texto={tc.vacio} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc.actividad}</TableHead>
                <TableHead className="text-right">{tc.horas}</TableHead>
                <TableHead>{tc.termino}</TableHead>
                <TableHead>{tc.aprobada}</TableHead>
                <TableHead className="text-right">{tc.periodo}</TableHead>
                <TableHead className="text-right">{tc.calculado}</TableHead>
                <TableHead className="text-right">{tc.aplicado}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {f.capacitaciones.map((c) => {
                const calc = actividades.find((a) => a.id === c.id);
                const enSaldo = estado.apertura !== null && formatearFecha(c.fechaTermino) !== "" && c.fechaTermino <= new Date(Date.parse(estado.apertura.fecha));
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-medium">{c.nombre}</span>
                      <span className="block text-xs text-tinta-secundaria">{c.institucionDicta}</span>
                    </TableCell>
                    <TableCell className="text-right">{c.horas}</TableCell>
                    <TableCell>{formatearFecha(c.fechaTermino)}</TableCell>
                    <TableCell>{c.aprobado ? tc.si : tc.no}</TableCell>
                    <TableCell className="text-right">{c.periodo}</TableCell>
                    <TableCell className="text-right">{enSaldo ? <Badge variant="outline">{tc.saldoApertura}</Badge> : formatearPuntos(calc?.puntaje ?? c.puntajeCalculado)}</TableCell>
                    <TableCell className="text-right">{enSaldo ? "" : formatearPuntos(calc?.puntajeAplicado ?? c.puntajeAplicado)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Tarjeta>

      {!estado.sinInformacion && estado.capacitacion.periodos.length > 0 && (
        <Tarjeta titulo={tc.porPeriodo}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc.periodo}</TableHead>
                <TableHead className="text-right">{tc.calculado}</TableHead>
                <TableHead className="text-right">{tc.arrastre}</TableHead>
                <TableHead className="text-right">{tc.tope}</TableHead>
                <TableHead className="text-right">{tc.aplicado}</TableHead>
                <TableHead className="text-right">{tc.excedente}</TableHead>
                <TableHead className="text-right">{tc.caducado}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estado.capacitacion.periodos.map((p) => (
                <TableRow key={p.periodo}>
                  <TableCell>{p.periodo}</TableCell>
                  <TableCell className="text-right">{formatearPuntos(p.calculado)}</TableCell>
                  <TableCell className="text-right">{formatearPuntos(p.arrastreRecibido)}</TableCell>
                  <TableCell className="text-right">{formatearPuntos(p.tope)}</TableCell>
                  <TableCell className="text-right font-medium">{formatearPuntos(p.aplicado)}</TableCell>
                  <TableCell className="text-right">{formatearPuntos(p.excedenteGenerado)}</TableCell>
                  <TableCell className="text-right">{formatearPuntos(p.caducado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {estado.apertura?.desglosado && <Definicion etiqueta={tc.saldoApertura}>{puntosConUnidad(estado.capacitacion.puntajeApertura)}</Definicion>}
            <Definicion etiqueta={tc.total}>{puntosConUnidad(estado.puntaje.capacitacion)}</Definicion>
          </dl>
        </Tarjeta>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SeccionEstudios({ carrera, acciones }: { carrera: CarreraDeFuncionario; acciones?: ReactNode }) {
  const { funcionario: f, estado } = carrera;
  const te = t.estudios;
  const calculados = new Map(estado.estudios.estudios.map((e) => [e.id, e]));
  return (
    <Tarjeta acciones={acciones}>
      {f.estudios.length === 0 ? (
        <Vacio texto={te.vacio} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{te.tipo}</TableHead>
                <TableHead>{te.nombre}</TableHead>
                <TableHead>{te.institucion}</TableHead>
                <TableHead>{te.obtencion}</TableHead>
                <TableHead>{te.reconocido}</TableHead>
                <TableHead className="text-right">{te.puntos}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {f.estudios.map((e) => {
                const calc = calculados.get(e.id);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{te.tipos[e.tipo]}</TableCell>
                    <TableCell className="font-medium">{e.nombre}</TableCell>
                    <TableCell>{e.institucion}</TableCell>
                    <TableCell>{formatearFecha(e.fechaObtencion)}</TableCell>
                    <TableCell>{e.reconocidoEl ? formatearFecha(e.reconocidoEl) : <Badge variant="outline">{te.sinReconocer}</Badge>}</TableCell>
                    <TableCell className="text-right">
                      {calc?.incluidoEnApertura ? <Badge variant="outline">{te.enSaldo}</Badge> : calc?.soloBeneficio ? <Badge variant="secondary">{te.beneficio}</Badge> : formatearPuntos(calc?.puntaje)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <dl className="mt-4">
            <Definicion etiqueta={te.total}>{puntosConUnidad(estado.puntaje.estudios)}</Definicion>
          </dl>
        </>
      )}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------

export function SeccionNivel({ carrera, acciones }: { carrera: CarreraDeFuncionario; acciones?: ReactNode }) {
  const { funcionario: f, estado } = carrera;
  const tn = t.nivel;
  const { nivel, proyeccion, puntaje } = estado;
  if (estado.sinInformacion) return <Vacio texto={t.riel.sinInformacion} />;
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta acciones={acciones}>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Definicion etiqueta={tn.vigente}>
            {nivel.vigente !== null ? `${nivel.vigente} · ${tn.desde} ${formatearFecha(nivel.vigenteDesde)}` : ""}
          </Definicion>
          <Definicion etiqueta={tn.calculado}>{nivel.calculado}</Definicion>
          <Definicion etiqueta={tn.proyeccion}>
            {nivel.cumpleAscenso ? <Badge className="bg-correcto text-white">{tn.cumple(nivel.calculado)}</Badge> : <span className="text-tinta-secundaria">{tn.noCumple}</span>}
          </Definicion>
        </dl>
      </Tarjeta>

      <Tarjeta titulo={tn.desglose}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Definicion etiqueta={tn.experiencia}>{formatearPuntos(puntaje.experiencia)}</Definicion>
          <Definicion etiqueta={tn.capacitacion}>{formatearPuntos(puntaje.capacitacion)}</Definicion>
          <Definicion etiqueta={tn.estudios}>{formatearPuntos(puntaje.estudios)}</Definicion>
          {puntaje.otrosApertura.gt(0) && <Definicion etiqueta={tn.otrosApertura}>{formatearPuntos(puntaje.otrosApertura)}</Definicion>}
          {puntaje.saldoAperturaSinDesglose.gt(0) && <Definicion etiqueta={tn.saldoSinDesglose}>{formatearPuntos(puntaje.saldoAperturaSinDesglose)}</Definicion>}
          <Definicion etiqueta={tn.total}>
            <span className="text-lg font-semibold">{puntosConUnidad(puntaje.total)}</span>
          </Definicion>
        </dl>
      </Tarjeta>

      {proyeccion && (
        <Tarjeta titulo={tn.proyeccion}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Definicion etiqueta={tn.siguiente}>{proyeccion.nivelSiguiente}</Definicion>
            <Definicion etiqueta={tn.umbral}>{puntosConUnidad(proyeccion.umbral)}</Definicion>
            <Definicion etiqueta={tn.faltan}>{puntosConUnidad(proyeccion.puntajeFaltante)}</Definicion>
            <Definicion etiqueta={tn.fechaEstimada}>
              {proyeccion.fechaEstimada ? `${formatearFecha(proyeccion.fechaEstimada)} (${formatearMesAnio(proyeccion.fechaEstimada)})` : tn.noAlcanzable}
            </Definicion>
          </dl>
          <p className="mt-3 text-xs text-tinta-secundaria">
            {tn.supuestos}: {proyeccion.descripcion}.
          </p>
        </Tarjeta>
      )}

      <Tarjeta titulo={tn.historial}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.columnasNivel.nivel}</TableHead>
              <TableHead>{t.columnasNivel.desde}</TableHead>
              <TableHead>{t.columnasNivel.hasta}</TableHead>
              <TableHead>{tn.motivo}</TableHead>
              <TableHead>{t.experiencia.decreto}</TableHead>
              <TableHead className="text-right">{t.columnasNivel.puntaje}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...f.niveles].reverse().map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.nivel}</TableCell>
                <TableCell>{formatearFecha(n.fechaDesde)}</TableCell>
                <TableCell>{n.fechaHasta ? formatearFecha(n.fechaHasta) : t.experiencia.vigente}</TableCell>
                <TableCell>{tn.motivos[n.motivo]}</TableCell>
                <TableCell>{n.decretoNumero ? `${n.decretoNumero}${n.decretoFecha ? ` · ${formatearFecha(n.decretoFecha)}` : ""}` : ""}</TableCell>
                <TableCell className="text-right">{formatearPuntos(n.puntajeAlCambio)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Tarjeta>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SeccionAlertas({ alertas }: { alertas: AlertaCalculada[] }) {
  const ta = t.alertas;
  if (alertas.length === 0) return <Vacio texto={ta.vacio} />;
  return (
    <Tarjeta>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{ta.hito}</TableHead>
            <TableHead>{ta.tipo}</TableHead>
            <TableHead>{ta.mensaje}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alertas.map((a) => (
            <TableRow key={a.clave}>
              <TableCell>{formatearFecha(a.fechaHito)}</TableCell>
              <TableCell><Badge variant="secondary">{t.nombresAlerta[a.tipo]}</Badge></TableCell>
              <TableCell>{a.mensaje}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Tarjeta>
  );
}

export function SeccionHistorial({ entradas }: { entradas: Array<Auditoria & { usuario: { name: string } }> }) {
  const th = t.historial;
  if (entradas.length === 0) return <Vacio texto={th.vacio} />;
  return (
    <Tarjeta>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{th.fecha}</TableHead>
            <TableHead>{th.usuario}</TableHead>
            <TableHead>{th.accion}</TableHead>
            <TableHead>{th.entidad}</TableHead>
            <TableHead>{th.detalle}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entradas.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap">{formatearFechaHora(e.fecha)}</TableCell>
              <TableCell>{e.usuario.name}</TableCell>
              <TableCell><Badge variant="outline">{e.accion}</Badge></TableCell>
              <TableCell>{e.entidad}</TableCell>
              <TableCell className="max-w-md text-xs text-tinta-secundaria">
                {e.detalle ?? ""}
                {e.despues ? <span className="block truncate font-mono">{JSON.stringify(e.despues).slice(0, 160)}</span> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Tarjeta>
  );
}
