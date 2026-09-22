import type { Metadata } from "next";
import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { actualizarEstablecimientoAction, actualizarInstitucionAction, crearEstablecimientoAction } from "@/lib/acciones/parametros";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { formatearChileno, hoyEnChile } from "@/lib/fechas/civil";
import { formatearFecha, formatearRut } from "@/lib/formato";
import { TIPOS_REGLA, VALORES_POR_DEFECTO } from "@/lib/motor/reglas";
import { resumenRegla } from "@/lib/reglas/presentacion";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import type { ReglaCarrera } from "@/generated/prisma/client";
import { DialogoNuevaVersion } from "./formulario-regla";
import { textosParametros as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

const CATEGORIAS = ["A", "B", "C", "D", "E", "F"];
const TIPOS_ESTABLECIMIENTO = Object.entries(ETIQUETAS.tipoEstablecimiento).map(([valor, etiqueta]) => ({ valor, etiqueta }));

/** Parámetros de una versión en lenguaje claro (etiqueta → valor), sin claves crudas. */
function ResumenRegla({ tipo, parametros }: { tipo: (typeof TIPOS_REGLA)[number]; parametros: unknown }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {resumenRegla(tipo, parametros).map((fila, i) => (
        <div key={`${fila.etiqueta}-${i}`} className="contents">
          <dt className="text-tinta-secundaria">{fila.etiqueta}</dt>
          <dd className="font-medium">{fila.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

// Módulo Parámetros (doc 05 §10, BT 5): reglas con vigencia, establecimientos e institución. Solo ADMIN.
export default async function ParametrosPage() {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId!;
  const hoy = hoyEnChile();
  const [reglas, establecimientos, institucion] = await Promise.all([
    prisma.reglaCarrera.findMany({ where: { institucionId }, orderBy: [{ tipo: "asc" }, { vigenteDesde: "desc" }] }),
    prisma.establecimiento.findMany({ where: { institucionId }, orderBy: { nombre: "asc" }, include: { _count: { select: { funcionarios: true } } } }),
    prisma.institucion.findUniqueOrThrow({ where: { id: institucionId } }),
  ]);
  const vigenteDe = (tipo: string, categoria: string | null) =>
    reglas.find((r) => r.tipo === tipo && r.categoria === categoria && formatearIso(r.vigenteDesde) <= hoy && (r.vigenteHasta === null || formatearIso(r.vigenteHasta) >= hoy)) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro} {t.alertas}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t.reglas.titulo}</h2>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TIPOS_REGLA.map((tipo) => {
            const vigente = vigenteDe(tipo, null);
            const especificas = CATEGORIAS.map((c) => vigenteDe(tipo, c)).filter((r): r is ReglaCarrera => r !== null);
            const historial = reglas.filter((r) => r.tipo === tipo);
            return (
              <li key={tipo} className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-medium">{ETIQUETAS.tipoRegla[tipo]}</h3>
                  <DialogoNuevaVersion
                    tipo={tipo}
                    etiqueta={ETIQUETAS.tipoRegla[tipo]}
                    vigente={vigente ? { parametros: vigente.parametros, fuente: vigente.fuente } : (VALORES_POR_DEFECTO as Partial<Record<string, unknown>>)[tipo] ? { parametros: (VALORES_POR_DEFECTO as Partial<Record<string, unknown>>)[tipo], fuente: "" } : null}
                    vigenteDesdeInicial={formatearChileno(hoy)}
                  />
                </div>
                <p className="text-xs font-medium text-tinta-secundaria">{t.reglas.vigente}</p>
                {vigente ? (
                  <div className="flex flex-col gap-1">
                    <ResumenRegla tipo={tipo} parametros={vigente.parametros} />
                    <p className="text-xs text-tinta-secundaria">
                      {t.reglas.desde} {formatearFecha(vigente.vigenteDesde)} · {t.reglas.fuente}: {vigente.fuente}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-tinta-secundaria">{t.reglas.sinVigente}</p>
                )}
                {especificas.map((r) => (
                  <div key={r.id} className="rounded-md border border-linea p-2">
                    <p className="text-xs font-medium">{t.reglas.categoria(r.categoria)}</p>
                    <ResumenRegla tipo={tipo} parametros={r.parametros} />
                  </div>
                ))}
                {historial.length > 0 && (
                  <details className="text-xs text-tinta-secundaria">
                    <summary className="cursor-pointer font-medium text-tinta">{t.reglas.historial} ({historial.length})</summary>
                    <ul className="mt-1 space-y-0.5">
                      {historial.map((r) => (
                        <li key={r.id}>
                          {formatearFecha(r.vigenteDesde)} – {r.vigenteHasta ? formatearFecha(r.vigenteHasta) : "vigente"} · {t.reglas.categoria(r.categoria)} · {r.fuente}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">{t.establecimientos.titulo}</h2>
          <DialogoFormulario
            titulo={t.establecimientos.dialogoNuevo.titulo}
            textoBoton={t.establecimientos.nuevo}
            campos={[
              { nombre: "nombre", etiqueta: t.establecimientos.dialogoNuevo.nombre, tipo: "text", requerido: true, ancho: "completo" },
              { nombre: "tipo", etiqueta: t.establecimientos.dialogoNuevo.tipo, tipo: "select", requerido: true, valorInicial: "CESFAM", opciones: TIPOS_ESTABLECIMIENTO },
            ]}
            accion={crearEstablecimientoAction}
            textoEnviar={t.establecimientos.dialogoNuevo.enviar}
            exito={t.establecimientos.dialogoNuevo.exito}
          />
        </div>
        <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.establecimientos.columnas.nombre}</TableHead>
                <TableHead>{t.establecimientos.columnas.tipo}</TableHead>
                <TableHead className="text-right">{t.establecimientos.columnas.funcionarios}</TableHead>
                <TableHead>{t.establecimientos.columnas.estado}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {establecimientos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  <TableCell>{ETIQUETAS.tipoEstablecimiento[e.tipo]}</TableCell>
                  <TableCell className="text-right">{e._count.funcionarios}</TableCell>
                  <TableCell>{e.activo ? <Badge className="bg-correcto text-white">{t.establecimientos.activo}</Badge> : <Badge variant="outline">{t.establecimientos.inactivo}</Badge>}</TableCell>
                  <TableCell>
                    <DialogoFormulario
                      titulo={t.establecimientos.dialogoEditar.titulo}
                      textoBoton={t.establecimientos.editar}
                      varianteBoton="outline"
                      tamanoBoton="xs"
                      campos={[
                        { nombre: "nombre", etiqueta: t.establecimientos.dialogoEditar.nombre, tipo: "text", requerido: true, ancho: "completo", valorInicial: e.nombre },
                        { nombre: "tipo", etiqueta: t.establecimientos.dialogoEditar.tipo, tipo: "select", requerido: true, valorInicial: e.tipo, opciones: TIPOS_ESTABLECIMIENTO },
                        { nombre: "activo", etiqueta: t.establecimientos.dialogoEditar.activo, tipo: "checkbox", valorInicial: e.activo },
                      ]}
                      accion={actualizarEstablecimientoAction.bind(null, e.id)}
                      textoEnviar={t.establecimientos.dialogoEditar.enviar}
                      exito={t.establecimientos.dialogoEditar.exito}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">{t.institucion.titulo}</h2>
          <DialogoFormulario
            titulo={t.institucion.dialogo.titulo}
            textoBoton={t.institucion.editar}
            varianteBoton="outline"
            campos={[
              { nombre: "nombre", etiqueta: t.institucion.dialogo.nombre, tipo: "text", requerido: true, ancho: "completo", valorInicial: institucion.nombre },
              { nombre: "comuna", etiqueta: t.institucion.dialogo.comuna, tipo: "text", requerido: true, valorInicial: institucion.comuna },
            ]}
            accion={actualizarInstitucionAction}
            textoEnviar={t.institucion.dialogo.enviar}
            exito={t.institucion.dialogo.exito}
          />
        </div>
        <dl className="grid gap-4 rounded-lg border border-linea bg-superficie p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-tinta-secundaria">{t.institucion.nombre}</dt>
            <dd className="text-sm">{institucion.nombre}</dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-secundaria">{t.institucion.rut}</dt>
            <dd className="text-sm">{formatearRut(institucion.rut)}</dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-secundaria">{t.institucion.comuna}</dt>
            <dd className="text-sm">{institucion.comuna}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function formatearIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}
