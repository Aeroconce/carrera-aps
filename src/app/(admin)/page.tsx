import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ETIQUETAS_AUDITORIA } from "@/lib/auditoria/etiquetas";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { resumenInicio, type ResumenInicio } from "@/lib/inicio/resumen";
import { formatearFecha, formatearFechaHora, formatearPuntos } from "@/lib/formato";
import { textosInicio as t, textosShell } from "./textos";

const NOMBRES_ALERTA: Record<string, string> = {
  BIENIO_PROXIMO: "Bienio próximo",
  BIENIO_PENDIENTE_RECONOCER: "Bienio sin reconocer",
  NIVEL_ALCANZADO: "Nivel alcanzado",
  NIVEL_PROXIMO: "Nivel próximo",
  CAPACITACION_POR_VENCER_PERIODO: "Cierre de período",
  CALIFICACION_PENDIENTE: "Calificación pendiente",
  DOCUMENTO_FALTANTE: "Documento faltante",
};

function Titulo({ children }: { children: React.ReactNode }) {
  return <CardTitle className="text-sm font-medium text-tinta-secundaria">{children}</CardTitle>;
}

/** Barra proporcional para las distribuciones (niveles, listas): sobria, sin librería de gráficos. */
function Barra({ etiqueta, total, maximo }: { etiqueta: string; total: number; maximo: number }) {
  const ancho = maximo > 0 ? Math.max(2, Math.round((total / maximo) * 100)) : 0;
  return (
    <li className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-xs">
      <span className="text-tinta-secundaria">{etiqueta}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-fondo" aria-hidden>
        <span className="block h-full rounded-full bg-institucional" style={{ width: `${ancho}%` }} />
      </span>
      <span className="text-right font-medium tabular-nums">{total}</span>
    </li>
  );
}

// Inicio (doc 05 módulo 1): en diez segundos, dotación, lo que exige un acto administrativo, lo que viene y
// el estado del sistema, todo calculado en vivo por el motor.
export default async function InicioPage() {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const institucionId = sesion.user.institucionId;
  const resumen: ResumenInicio | null = institucionId ? await resumenInicio(institucionId) : null;
  const esAdmin = rolDe(sesion.user) === "ADMIN";
  const puedeVer = (ruta: string) => esAdmin || (textosShell.rutasSupervision as readonly string[]).includes(ruta);
  const totalAlertas = resumen?.alertasPorTipo.reduce((s, a) => s + a.total, 0) ?? 0;
  const maxNivel = Math.max(0, ...(resumen?.porNivel.map((n) => n.total) ?? [0]));
  const maxLista = Math.max(0, ...(resumen?.calificacion?.listas.map((l) => l.total) ?? [0]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        {resumen && <p className="text-sm text-tinta-secundaria">{t.situacion(formatearFecha(resumen.fechaCorte))}</p>}
      </div>

      {/* Fila 1: contadores de las bases (doc 05 §1) con su contexto */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <Titulo>{t.dotacion}</Titulo>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{resumen?.dotacionActiva ?? 0}</p>
            <p className="text-xs text-tinta-secundaria">{t.funcionarios}</p>
            {resumen && (
              <ul className="mt-2 space-y-0.5 text-xs text-tinta-secundaria">
                <li className="flex justify-between gap-2">
                  <span>{t.inactivos}</span>
                  <span className="font-medium text-tinta">{resumen.inactivos}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>{t.antiguedadPromedio}</span>
                  <span className="font-medium text-tinta">{t.anios(formatearPuntos(resumen.antiguedadPromedioAnios))}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>{t.puntajePromedio}</span>
                  <span className="font-medium text-tinta">{t.puntos(resumen.puntajePromedio)}</span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{t.bieniosProximos}</Titulo>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(["en30", "en60", "en90"] as const).map((clave) => (
                <div key={clave}>
                  <p className="text-2xl font-semibold">{resumen?.bieniosProximos[clave] ?? 0}</p>
                  <p className="text-xs text-tinta-secundaria">{t[clave]}</p>
                </div>
              ))}
            </div>
            {resumen && (
              <p className="mt-2 flex justify-between gap-2 text-xs text-tinta-secundaria">
                <span>{t.sinReconocer}</span>
                {puedeVer("/carrera") ? (
                  <Link href="/carrera" className="font-medium text-institucional underline">{resumen.bieniosSinReconocer}</Link>
                ) : (
                  <span className="font-medium text-tinta">{resumen.bieniosSinReconocer}</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{t.cumplenAscenso}</Titulo>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{resumen?.cumplenAscenso ?? 0}</p>
            <p className="text-xs text-tinta-secundaria">{t.funcionarios}</p>
            {resumen && (
              <p className="mt-2 flex justify-between gap-2 text-xs text-tinta-secundaria">
                <span>{t.cercaDeNivel}</span>
                <span className="font-medium text-tinta">{resumen.cercaDeNivel}</span>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{t.alertasActivas}</Titulo>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalAlertas}</p>
            {resumen && resumen.alertasPorTipo.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-tinta-secundaria">
                {resumen.alertasPorTipo.map((a) => (
                  <li key={a.tipo} className="flex justify-between gap-2">
                    <span>{NOMBRES_ALERTA[a.tipo] ?? a.tipo}</span>
                    <span className="font-medium text-tinta">{a.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-tinta-secundaria">{t.sinAlertas}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila 2: lo que viene, con nombres */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Titulo>{t.proximosBienios}</Titulo>
          </CardHeader>
          <CardContent>
            {resumen && resumen.proximosBienios.length > 0 ? (
              <ul className="divide-y divide-linea">
                {resumen.proximosBienios.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/funcionarios/${b.id}?pestana=experiencia`} className="font-medium text-institucional hover:underline">{b.nombre}</Link>
                      <p className="truncate text-xs text-tinta-secundaria">{b.establecimiento}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p className="font-medium">{t.bienioN(b.numero)} · {formatearFecha(b.fecha)}</p>
                      <p className="text-tinta-secundaria">{t.enDias(b.dias)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-tinta-secundaria">{t.sinProximos}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{t.masCerca}</Titulo>
          </CardHeader>
          <CardContent>
            {resumen && resumen.masCerca.length > 0 ? (
              <ul className="divide-y divide-linea">
                {resumen.masCerca.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/funcionarios/${f.id}?pestana=nivel`} className="font-medium text-institucional hover:underline">{f.nombre}</Link>
                      <p className="truncate text-xs text-tinta-secundaria">{f.establecimiento}</p>
                    </div>
                    <p className="shrink-0 text-right text-xs font-medium">{t.faltanPara(formatearPuntos(f.faltan), f.nivelSiguiente)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-tinta-secundaria">{t.sinCerca}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila 3: distribución por nivel y avance del período */}
      <div className="grid items-start gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Titulo>{t.porNivel}</Titulo>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1" aria-label={t.porNivel}>
              {resumen?.porNivel.map((n) => (
                <Barra key={n.nivel} etiqueta={t.nivel(n.nivel)} total={n.total} maximo={maxNivel} />
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{resumen?.calificacion ? resumen.calificacion.nombre : t.calificacion}</Titulo>
          </CardHeader>
          <CardContent>
            {resumen?.calificacion ? (
              <>
                <p className="text-2xl font-semibold">{t.calificados(resumen.calificacion.calificados, resumen.dotacionActiva)}</p>
                <p className="text-xs text-tinta-secundaria">{t.pendientes(resumen.calificacion.pendientes)}</p>
                <ul className="mt-3 space-y-1" aria-label={t.listas}>
                  {resumen.calificacion.listas.map((l) => (
                    <Barra key={l.nombre} etiqueta={l.nombre} total={l.total} maximo={maxLista} />
                  ))}
                </ul>
                {puedeVer("/calificaciones") && (
                  <Link href={`/calificaciones?proceso=${resumen.calificacion.id}`} className="mt-3 inline-block text-xs font-medium text-institucional underline">{t.verCalificaciones}</Link>
                )}
              </>
            ) : (
              <p className="text-sm text-tinta-secundaria">{t.sinProceso}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{t.capacitacion(resumen?.capacitacion.periodo ?? new Date().getFullYear())}</Titulo>
          </CardHeader>
          <CardContent>
            {resumen && (
              <>
                <p className="text-2xl font-semibold">{resumen.capacitacion.actividades}</p>
                <p className="text-xs text-tinta-secundaria">{t.actividades}</p>
                <ul className="mt-2 space-y-0.5 text-xs text-tinta-secundaria">
                  <li className="flex justify-between gap-2">
                    <span>{t.conActividad}</span>
                    <span className="font-medium text-tinta">{resumen.capacitacion.funcionarios}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>{t.puntosAplicados}</span>
                    <span className="font-medium text-tinta">{resumen.capacitacion.puntosAplicados}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>{t.conTope}</span>
                    <span className="font-medium text-tinta">{resumen.capacitacion.conTope}</span>
                  </li>
                </ul>
                {puedeVer("/capacitaciones") && (
                  <Link href="/capacitaciones" className="mt-3 inline-block text-xs font-medium text-institucional underline">{t.verCapacitaciones}</Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila 4: dotación por establecimiento y categoría */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Titulo>{t.porEstablecimiento}</Titulo>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-linea">
              {resumen?.porEstablecimiento.map((e) => (
                <li key={e.nombre} className="flex justify-between gap-4 py-1.5">
                  <span>{e.nombre}</span>
                  <span className="font-medium">{e.total}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{t.porCategoria}</Titulo>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-2">
              {resumen?.porCategoria.map((c) => (
                <li key={c.categoria} className="rounded-lg border border-linea px-3 py-2">
                  <p className="text-xs text-tinta-secundaria">Categoría {c.categoria}</p>
                  <p className="text-lg font-semibold">{c.total}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Fila 5: actividad reciente y estado del sistema */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Titulo>{t.actividadReciente}</Titulo>
          </CardHeader>
          <CardContent>
            {resumen && resumen.actividadReciente.length > 0 ? (
              <ul className="divide-y divide-linea">
                {resumen.actividadReciente.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-1.5 text-xs">
                    <div className="min-w-0">
                      <p>
                        <Badge variant="outline">{ETIQUETAS_AUDITORIA.accion[a.accion] ?? a.accion}</Badge> <span className="font-medium">{ETIQUETAS_AUDITORIA.entidad[a.entidad] ?? a.entidad}</span>
                      </p>
                      <p className="truncate text-tinta-secundaria">{a.usuario}{a.detalle ? ` · ${a.detalle}` : ""}</p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-tinta-secundaria">{formatearFechaHora(a.fecha)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-tinta-secundaria">{t.sinActividad}</p>
            )}
            {puedeVer("/auditoria") && (
              <Link href="/auditoria" className="mt-3 inline-block text-xs font-medium text-institucional underline">{t.verAuditoria}</Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Titulo>{t.sistema}</Titulo>
          </CardHeader>
          <CardContent>
            {resumen && (
              <ul className="space-y-1.5 text-sm">
                <li className="flex justify-between gap-2">
                  <span className="text-tinta-secundaria">{t.ultimoRespaldo}</span>
                  <span className="text-right font-medium">
                    {resumen.respaldo ? (
                      <>
                        {formatearFechaHora(resumen.respaldo.fecha)}{" "}
                        <Badge className={resumen.respaldo.resultado === "OK" ? "bg-correcto text-white" : "bg-error text-white"}>{resumen.respaldo.resultado}</Badge>
                      </>
                    ) : (
                      t.sinRespaldo
                    )}
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-tinta-secundaria">{t.ultimoVerificado}</span>
                  <span className="font-medium">{resumen.ultimoVerificado ? formatearFechaHora(resumen.ultimoVerificado) : t.sinRespaldo}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-tinta-secundaria">{t.documentos}</span>
                  <span className="font-medium">{t.documentosDe(resumen.documentos.total, resumen.documentos.funcionariosConDocumentos)}</span>
                </li>
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
              {puedeVer("/respaldos") && <Link href="/respaldos" className="text-institucional underline">{t.verRespaldos}</Link>}
              {puedeVer("/documentos") && <Link href="/documentos" className="text-institucional underline">{t.verDocumentos}</Link>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/alertas" className={buttonVariants({ variant: "default" })}>
          {t.verAlertas}
        </Link>
        <Link href="/funcionarios" className={buttonVariants({ variant: "outline" })}>
          {t.verFuncionarios}
        </Link>
        <Link href="/reportes" className={buttonVariants({ variant: "outline" })}>
          {t.verReportes}
        </Link>
      </div>
    </div>
  );
}
