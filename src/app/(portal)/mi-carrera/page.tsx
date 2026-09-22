import type { Metadata } from "next";
import { BotonCerrarSesion } from "@/components/dominio/boton-cerrar-sesion";
import { RielCarrera } from "@/components/dominio/riel-carrera";
import { Badge } from "@/components/ui/badge";
import { exigirSesion } from "@/lib/auth/sesion";
import { carreraDeFuncionario } from "@/lib/carrera/funcionario";
import { prisma } from "@/lib/db/prisma";
import { formatearChileno } from "@/lib/fechas/civil";
import { formatearFecha, formatearMesAnio, formatearPuntos, formatearRut, nombreCompleto, puntosConUnidad } from "@/lib/formato";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import { textosPortal as t } from "../textos";

export const metadata: Metadata = { title: t.titulo };

function Seccion({ titulo, abierta = false, children }: { titulo: string; abierta?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierta} className="group rounded-lg border border-linea bg-superficie">
      <summary className="cursor-pointer list-none px-4 py-3 text-base font-medium marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between">
          {titulo}
          <span aria-hidden className="text-tinta-secundaria transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="border-t border-linea px-4 py-3">{children}</div>
    </details>
  );
}

// Portal del funcionario (BT 10, doc 05 §15, doc 13 F14): solo lo propio, móvil primero, sin edición.
// El rol FUNCIONARIO solo puede llegar aquí; su funcionarioId viene de la cuenta, nunca de la URL.
export default async function MiCarreraPage() {
  const sesion = await exigirSesion({ roles: ["FUNCIONARIO", "ADMIN", "SUPERVISION"] });
  const funcionarioId = sesion.user.funcionarioId;
  const carrera = funcionarioId ? await carreraDeFuncionario(funcionarioId) : null;

  const cabecera = (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-institucional">{t.producto}</p>
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="text-sm text-tinta-secundaria">{carrera ? nombreCompleto(carrera.funcionario) : sesion.user.name}</p>
      </div>
      <BotonCerrarSesion />
    </header>
  );

  if (!carrera) {
    return (
      <div className="mx-auto w-full max-w-portal px-4 py-6">
        {cabecera}
        <div className="mt-6 rounded-lg border border-linea bg-superficie p-4">
          <h2 className="text-base font-medium">{t.sinFuncionario.titulo}</h2>
          <p className="mt-1 text-sm text-tinta-secundaria">{t.sinFuncionario.texto}</p>
        </div>
      </div>
    );
  }

  const { funcionario: f, estado } = carrera;
  const [calificaciones, documentos] = await Promise.all([
    prisma.calificacionFuncionario.findMany({ where: { funcionarioId: f.id }, include: { proceso: true, notasMerito: true, acta: { select: { id: true } } }, orderBy: { proceso: { periodoDesde: "desc" } } }),
    prisma.documento.findMany({ where: { funcionarioId: f.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const actividades = new Map(estado.capacitacion.actividades.map((a) => [a.id, a]));
  const estudiosCalc = new Map(estado.estudios.estudios.map((e) => [e.id, e]));

  return (
    <div className="mx-auto flex w-full max-w-portal flex-col gap-4 px-4 py-6">
      {cabecera}

      <section className="rounded-lg border border-linea bg-superficie p-4">
        <p className="text-xs text-tinta-secundaria">
          {formatearRut(f.rut)} · Categoría {f.categoria} · {f.establecimiento.nombre}
        </p>
        <p className="mb-3 text-xs text-tinta-secundaria">{t.situacion(formatearChileno(carrera.fechaCorte))}</p>
        <RielCarrera estado={estado} />
        {!estado.sinInformacion && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-tinta-secundaria">{t.resumen.nivel}</dt>
              <dd className="text-lg font-semibold">{estado.nivel.vigente ?? estado.nivel.calculado}</dd>
            </div>
            <div>
              <dt className="text-xs text-tinta-secundaria">{t.resumen.puntaje}</dt>
              <dd className="text-lg font-semibold">{puntosConUnidad(estado.puntaje.total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-tinta-secundaria">{t.resumen.faltan}</dt>
              <dd className="font-medium">{estado.nivel.puntajeFaltante ? puntosConUnidad(estado.nivel.puntajeFaltante) : t.resumen.nivelMaximo}</dd>
            </div>
            <div>
              <dt className="text-xs text-tinta-secundaria">{t.resumen.estimado}</dt>
              <dd className="font-medium">{estado.proyeccion?.fechaEstimada ? formatearMesAnio(estado.proyeccion.fechaEstimada) : t.resumen.sinProyeccion}</dd>
            </div>
          </dl>
        )}
        {!estado.sinInformacion && (
          <p className="mt-3 text-xs text-tinta-secundaria">
            {t.resumen.desglose(formatearPuntos(estado.puntaje.experiencia), formatearPuntos(estado.puntaje.capacitacion), formatearPuntos(estado.puntaje.estudios))}
            {estado.proyeccion ? ` · ${t.resumen.supuestos}: ${estado.proyeccion.descripcion}` : ""}
          </p>
        )}
      </section>

      <Seccion titulo={t.secciones.bienios} abierta>
        {estado.bienios.bienios.length === 0 ? (
          <p className="text-sm text-tinta-secundaria">{t.bienios.vacio}</p>
        ) : (
          <ul className="divide-y divide-linea">
            {estado.bienios.bienios.map((b) => (
              <li key={b.numero} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">Bienio {b.numero} · {formatearFecha(b.fechaCumplido)}</p>
                  <p className="text-xs text-tinta-secundaria">
                    {b.incluidoEnApertura ? t.bienios.enSaldo : b.fechaReconocido ? `${t.bienios.reconocido} · ${b.decretoNumero ? t.bienios.decreto(b.decretoNumero) : formatearFecha(b.fechaReconocido)}` : t.bienios.pendiente}
                  </p>
                </div>
                {!b.incluidoEnApertura && <span className="whitespace-nowrap text-tinta-secundaria">{t.bienios.puntos(formatearPuntos(b.puntaje))}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm font-medium text-institucional">{estado.bienios.proximoBienio ? t.bienios.proximo(formatearFecha(estado.bienios.proximoBienio)) : t.bienios.sinProximo}</p>
      </Seccion>

      <Seccion titulo={t.secciones.capacitaciones}>
        {f.capacitaciones.length === 0 ? (
          <p className="text-sm text-tinta-secundaria">{t.capacitaciones.vacio}</p>
        ) : (
          <>
            <ul className="divide-y divide-linea">
              {[...f.capacitaciones].reverse().map((c) => {
                const calc = actividades.get(c.id);
                return (
                  <li key={c.id} className="py-2 text-sm">
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-tinta-secundaria">
                      {c.institucionDicta} · {t.capacitaciones.horas(c.horas)} · {formatearFecha(c.fechaTermino)} · {c.aprobado ? t.capacitaciones.aprobada : t.capacitaciones.noAprobada}
                    </p>
                    <p className="text-xs">
                      {t.capacitaciones.calculado(formatearPuntos(calc?.puntaje ?? c.puntajeCalculado))} · {t.capacitaciones.aplicado(formatearPuntos(calc?.puntajeAplicado ?? c.puntajeAplicado))} · {c.periodo}
                    </p>
                  </li>
                );
              })}
            </ul>
            <ul className="mt-2 space-y-0.5 text-xs text-tinta-secundaria">
              {estado.capacitacion.periodos.map((p) => (
                <li key={p.periodo}>{t.capacitaciones.periodo(p.periodo, formatearPuntos(p.aplicado), formatearPuntos(p.tope), formatearPuntos(p.excedenteGenerado))}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm font-medium">{t.capacitaciones.total(formatearPuntos(estado.puntaje.capacitacion))}</p>
          </>
        )}
      </Seccion>

      <Seccion titulo={t.secciones.estudios}>
        {f.estudios.length === 0 ? (
          <p className="text-sm text-tinta-secundaria">{t.estudios.vacio}</p>
        ) : (
          <ul className="divide-y divide-linea">
            {f.estudios.map((e) => {
              const calc = estudiosCalc.get(e.id);
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{ETIQUETAS.tipoEstudio[e.tipo]} · {e.nombre}</p>
                    <p className="text-xs text-tinta-secundaria">{e.institucion} · {e.reconocidoEl ? t.estudios.reconocido(formatearFecha(e.reconocidoEl)) : t.estudios.sinReconocer}</p>
                  </div>
                  <span className="whitespace-nowrap text-tinta-secundaria">{calc?.soloBeneficio ? t.estudios.beneficio : calc ? t.estudios.puntos(formatearPuntos(calc.puntaje)) : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>

      <Seccion titulo={t.secciones.calificaciones}>
        {calificaciones.length === 0 ? (
          <p className="text-sm text-tinta-secundaria">{t.calificaciones.vacio}</p>
        ) : (
          <ul className="divide-y divide-linea">
            {calificaciones.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{c.proceso.nombre}</p>
                  <p className="text-xs text-tinta-secundaria">
                    {t.calificaciones.puntaje(formatearPuntos(c.puntajeFinal))} · {t.calificaciones.lista(c.lista)} · {t.calificaciones.notas(c.notasMerito.filter((n) => n.tipo === "MERITO").length, c.notasMerito.filter((n) => n.tipo === "DEMERITO").length)}
                  </p>
                </div>
                {c.acta && (
                  <a href={`/documentos/${c.acta.id}/descargar`} className="shrink-0 text-institucional underline" aria-label={`${t.calificaciones.acta}: ${c.proceso.nombre}`}>
                    {t.calificaciones.acta}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo={t.secciones.documentos}>
        {documentos.length === 0 ? (
          <p className="text-sm text-tinta-secundaria">{t.documentos.vacio}</p>
        ) : (
          <ul className="divide-y divide-linea">
            {documentos.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{d.nombre}</p>
                  <p className="text-xs text-tinta-secundaria">
                    <Badge variant="outline">{d.tipo}</Badge> {formatearFecha(d.createdAt)}
                  </p>
                </div>
                <a href={`/documentos/${d.id}/descargar`} className="text-institucional underline">{t.documentos.descargar}</a>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {process.env.NEXT_PUBLIC_MODO_DEMO === "1" && <p className="text-center text-xs text-tinta-secundaria">{t.pie}</p>}
    </div>
  );
}
