// Comisión evaluadora y factores del proceso seleccionado (BT 4.6, doc 05 §6): listas con alta y baja
// auditadas; los factores admiten subfactores y se pueden copiar del proceso anterior.

import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { agregarIntegranteAction, crearFactorAction } from "@/lib/acciones/calificaciones";
import { arbolFactores, type FactorBase } from "@/lib/calificaciones/puntaje";
import { formatearPuntos } from "@/lib/formato";
import { BotonCopiarFactores, BotonEliminarFactor, BotonQuitarIntegrante } from "./acciones";
import { textosCalificaciones as t } from "./textos";

export interface Integrante {
  id: string;
  nombre: string;
  rol: string;
}

export function PanelComision({ procesoId, abierto, integrantes, puedeEditar }: { procesoId: string; abierto: boolean; integrantes: Integrante[]; puedeEditar: boolean }) {
  const editable = puedeEditar && abierto;
  const d = t.comision.dialogo;
  return (
    <section aria-labelledby="comision-titulo" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="comision-titulo" className="text-base font-medium">{t.comision.titulo}</h3>
        {editable && (
          <DialogoFormulario
            titulo={d.titulo}
            textoBoton={t.comision.agregar}
            varianteBoton="outline"
            tamanoBoton="xs"
            campos={[
              { nombre: "nombre", etiqueta: d.nombre, tipo: "text", requerido: true, ancho: "completo" },
              { nombre: "rol", etiqueta: d.rol, tipo: "text", requerido: true, ancho: "completo", ayuda: d.rolAyuda },
            ]}
            accion={agregarIntegranteAction.bind(null, procesoId)}
            textoEnviar={d.enviar}
            exito={d.exito}
          />
        )}
      </div>
      {integrantes.length === 0 ? (
        <p className="text-sm text-tinta-secundaria">{t.comision.vacio}</p>
      ) : (
        <ul className="divide-y divide-linea text-sm">
          {integrantes.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 py-1.5">
              <div>
                <p className="font-medium">{i.nombre}</p>
                <p className="text-xs text-tinta-secundaria">{i.rol}</p>
              </div>
              {editable && <BotonQuitarIntegrante id={i.id} nombre={i.nombre} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PanelFactores({
  procesoId,
  abierto,
  factores,
  puedeEditar,
  origen,
}: {
  procesoId: string;
  abierto: boolean;
  factores: FactorBase[];
  puedeEditar: boolean;
  /** Proceso anterior con factores, para copiarlos cuando este no tiene */
  origen: { id: string; nombre: string } | null;
}) {
  const editable = puedeEditar && abierto;
  const arbol = arbolFactores(factores);
  const suma = arbol.reduce((s, f) => s + f.ponderacion, 0);
  const d = t.factores.dialogo;
  return (
    <section aria-labelledby="factores-titulo" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="factores-titulo" className="text-base font-medium">{t.factores.titulo}</h3>
        {editable && (
          <div className="flex flex-wrap gap-2">
            {arbol.length === 0 && origen && <BotonCopiarFactores procesoId={procesoId} origenId={origen.id} origenNombre={origen.nombre} />}
            <DialogoFormulario
              titulo={d.titulo}
              textoBoton={t.factores.agregar}
              varianteBoton="outline"
              tamanoBoton="xs"
              campos={[
                { nombre: "nombre", etiqueta: d.nombre, tipo: "text", requerido: true, ancho: "completo" },
                { nombre: "ponderacion", etiqueta: d.ponderacion, tipo: "number", requerido: true, min: 0, max: 100, paso: "0.5" },
                { nombre: "padreId", etiqueta: d.padre, tipo: "select", opciones: arbol.map((f) => ({ valor: f.id, etiqueta: f.nombre })), ayuda: d.padreAyuda },
              ]}
              accion={crearFactorAction.bind(null, procesoId)}
              textoEnviar={d.enviar}
              exito={d.exito}
            />
          </div>
        )}
      </div>
      {arbol.length === 0 ? (
        <p className="text-sm text-tinta-secundaria">{t.factores.vacio}</p>
      ) : (
        <ol className="flex flex-col gap-2 text-sm">
          {arbol.map((f) => (
            <li key={f.id} className="rounded-md border border-linea p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {f.nombre} <span className="text-xs font-normal text-tinta-secundaria">· {t.factores.ponderacion(formatearPuntos(f.ponderacion))}</span>
                </p>
                {editable && <BotonEliminarFactor id={f.id} nombre={f.nombre} />}
              </div>
              {f.subfactores.length > 0 && (
                <ul className="mt-1 divide-y divide-linea pl-3 text-xs">
                  {f.subfactores.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-1">
                      <span>
                        {s.nombre} · {t.factores.ponderacion(formatearPuntos(s.ponderacion))}
                      </span>
                      {editable && <BotonEliminarFactor id={s.id} nombre={s.nombre} />}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      {arbol.length > 0 && <p className="text-xs text-tinta-secundaria">{t.factores.suma(formatearPuntos(suma))}</p>}
    </section>
  );
}
