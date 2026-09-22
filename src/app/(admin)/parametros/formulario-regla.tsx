"use client";

// Diálogo "Nueva versión" de una regla (doc 05 §10, doc 13 F12, BT 5): un campo con nombre por parámetro,
// tablas editables para tramos, umbrales y listas, sin JSON a la vista. El formulario arma los parámetros con
// la forma que exige `esquemasParametros`; la server action los valida igual que antes (viajan en un campo
// oculto), así que el motor nunca recibe una regla mal formada.

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { claseSelect } from "@/components/dominio/dialogo-formulario";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { crearReglaAction } from "@/lib/acciones/parametros";
import { CATEGORIAS, TIPOS_ESTUDIO, type TipoRegla } from "@/lib/motor/reglas";
import { AYUDAS_PARAMETRO as ayudas, ETIQUETAS_PARAMETRO as e, OPCIONES_MODO } from "@/lib/reglas/presentacion";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import { textosParametros } from "./textos";

const t = textosParametros.reglas.dialogo;

type Fila = Record<string, string>;
interface Valores {
  numeros: Record<string, string>;
  booleanos: Record<string, boolean>;
  modo: string;
  categorias: string[];
  puntosEstudio: Record<string, string>;
  filas: Fila[];
  listaConMerito: string;
}
type Registro = Record<string, unknown>;
const esRegistro = (v: unknown): v is Registro => typeof v === "object" && v !== null && !Array.isArray(v);
const cadena = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** Estado inicial a partir de la versión vigente (o vacío para escribir desde cero). */
function inicialDesde(tipo: TipoRegla, parametros: unknown): Valores {
  const p: Registro = esRegistro(parametros) ? parametros : {};
  const numeros: Record<string, string> = {};
  for (const clave of ["puntos", "dias", "jornadaCompleta", "tope", "periodosMaximos", "puntosPorNivel", "nivelIngreso", "nivelMaximo", "escalaMinima", "escalaMaxima", "diasAvisoBienio", "diasBienioSinReconocer", "puntosAvisoNivel", "diasAvisoCierrePeriodo"]) {
    if (typeof p[clave] === "number") numeros[clave] = cadena(p[clave]);
  }
  const factor = esRegistro(p.factorPorEvaluacion) ? p.factorPorEvaluacion : {};
  numeros.conNota = cadena(factor.conNota ?? (tipo === "TABLA_CAPACITACION" ? 1 : ""));
  numeros.sinNota = cadena(factor.sinNota ?? (tipo === "TABLA_CAPACITACION" ? 1 : ""));
  const modoPorDefecto: Partial<Record<TipoRegla, string>> = { DIAS_BIENIO: "calendario", ARRASTRE_EXCEDENTE: "integro", UMBRAL_NIVEL: "lineal", PERIODO: "anio-calendario" };
  let filas: Fila[] = [];
  if (tipo === "TABLA_CAPACITACION" && Array.isArray(p.tramosHoras)) {
    filas = (p.tramosHoras as Registro[]).map((f) => ({ desde: cadena(f.desde), hasta: cadena(f.hasta), puntos: cadena(f.puntos) }));
  } else if (tipo === "UMBRAL_NIVEL" && esRegistro(p.umbrales)) {
    filas = Object.entries(p.umbrales).map(([nivel, puntos]) => ({ nivel, puntos: cadena(puntos) }));
  } else if (tipo === "CALIFICACION" && Array.isArray(p.listas)) {
    filas = (p.listas as Registro[]).map((l) => ({ nombre: cadena(l.nombre), puntajeMinimo: cadena(l.puntajeMinimo) }));
  }
  const puntosEstudio: Record<string, string> = {};
  if (esRegistro(p.puntos)) for (const [clave, valor] of Object.entries(p.puntos)) puntosEstudio[clave] = cadena(valor);
  return {
    numeros,
    booleanos: { activo: p.activo === true, requiereAprobacion: p.requiereAprobacion !== false },
    modo: typeof p.modo === "string" ? p.modo : (modoPorDefecto[tipo] ?? ""),
    categorias: Array.isArray(p.categorias) ? p.categorias.map(String) : [],
    puntosEstudio,
    filas,
    listaConMerito: cadena(p.listaConMerito),
  };
}

type Errores = Record<string, string[]>;

function numero(texto: string | undefined, entero: boolean): number | null {
  const limpio = (texto ?? "").trim().replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  if (Number.isNaN(n)) return null;
  if (entero && !Number.isInteger(n)) return null;
  return n;
}

/** Arma los parámetros con la forma del esquema y valida lo que el usuario puede corregir en pantalla. */
function construir(tipo: TipoRegla, v: Valores): { parametros: Registro; errores: Errores } {
  const errores: Errores = {};
  const num = (clave: string, entero = false, opcional = false): number | null => {
    const n = numero(v.numeros[clave], entero);
    if (n === null && !(opcional && !(v.numeros[clave] ?? "").trim())) errores[clave] = [entero ? t.errores.entero : t.errores.numero];
    return n;
  };
  const columna = (fila: Fila, i: number, clave: string, entero: boolean, opcional = false): number | null => {
    const n = numero(fila[clave], entero);
    if (n === null && !(opcional && !(fila[clave] ?? "").trim())) errores[`filas.${i}.${clave}`] = [entero ? t.errores.entero : t.errores.numero];
    return n;
  };
  const filasMinimas = (mensaje: string) => {
    if (v.filas.length === 0) errores.filas = [mensaje];
  };
  let parametros: Registro = {};
  switch (tipo) {
    case "PUNTOS_BIENIO":
      parametros = { puntos: num("puntos") };
      break;
    case "DIAS_BIENIO":
      parametros = v.modo === "dias" ? { modo: "dias", dias: num("dias", true) } : { modo: "calendario" };
      break;
    case "PRORRATEO_JORNADA":
      parametros = { activo: v.booleanos.activo === true, jornadaCompleta: num("jornadaCompleta", true) };
      break;
    case "TABLA_CAPACITACION":
      filasMinimas(t.errores.tramos);
      parametros = {
        tramosHoras: v.filas.map((f, i) => ({ desde: columna(f, i, "desde", true), hasta: (f.hasta ?? "").trim() ? columna(f, i, "hasta", true) : null, puntos: columna(f, i, "puntos", false) })),
        requiereAprobacion: v.booleanos.requiereAprobacion === true,
        factorPorEvaluacion: { conNota: num("conNota"), sinNota: num("sinNota") },
      };
      break;
    case "TOPE_CAPACITACION_ANUAL":
      parametros = { tope: num("tope") };
      break;
    case "ARRASTRE_EXCEDENTE":
      parametros = v.modo === "integro" ? { modo: "integro", periodosMaximos: num("periodosMaximos", true) } : { modo: "ninguno" };
      break;
    case "PUNTAJE_ESTUDIOS": {
      const puntos: Registro = {};
      for (const tipoEstudio of TIPOS_ESTUDIO) {
        const texto = (v.puntosEstudio[tipoEstudio] ?? "").trim();
        if (!texto) continue;
        const n = numero(texto, false);
        if (n === null) errores[`puntosEstudio.${tipoEstudio}`] = [t.errores.numero];
        else puntos[tipoEstudio] = n;
      }
      parametros = { categorias: v.categorias, puntos };
      break;
    }
    case "UMBRAL_NIVEL":
      if (v.modo === "tabla") {
        filasMinimas(t.errores.umbrales);
        const umbrales: Registro = {};
        v.filas.forEach((f, i) => {
          const nivel = columna(f, i, "nivel", true);
          const puntos = columna(f, i, "puntos", false);
          if (nivel !== null && puntos !== null) umbrales[String(nivel)] = puntos;
        });
        parametros = { modo: "tabla", umbrales };
      } else {
        parametros = { modo: "lineal", puntosPorNivel: num("puntosPorNivel") };
      }
      break;
    case "NIVELES":
      parametros = { nivelIngreso: num("nivelIngreso", true), nivelMaximo: num("nivelMaximo", true) };
      break;
    case "PERIODO":
      parametros = { modo: "anio-calendario" };
      break;
    case "CALIFICACION": {
      filasMinimas(t.errores.listas);
      const listas = v.filas.map((f, i) => {
        const nombre = (f.nombre ?? "").trim();
        if (!nombre) errores[`filas.${i}.nombre`] = [t.errores.nombreLista];
        return { nombre, puntajeMinimo: columna(f, i, "puntajeMinimo", false) };
      });
      if (!listas.some((l) => l.nombre === v.listaConMerito)) errores.listaConMerito = [t.errores.listaConMerito];
      parametros = { escalaMinima: num("escalaMinima"), escalaMaxima: num("escalaMaxima"), listas, listaConMerito: v.listaConMerito };
      break;
    }
    case "ALERTAS":
      parametros = {
        diasAvisoBienio: num("diasAvisoBienio", true),
        diasBienioSinReconocer: num("diasBienioSinReconocer", true),
        puntosAvisoNivel: num("puntosAvisoNivel"),
        diasAvisoCierrePeriodo: num("diasAvisoCierrePeriodo", true),
      };
      break;
  }
  return { parametros, errores };
}

interface Props {
  tipo: TipoRegla;
  etiqueta: string;
  vigente: { parametros: unknown; fuente: string } | null;
  vigenteDesdeInicial: string;
}

export function DialogoNuevaVersion({ tipo, etiqueta, vigente, vigenteDesdeInicial }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [v, setV] = useState<Valores>(() => inicialDesde(tipo, vigente?.parametros));
  const [categoria, setCategoria] = useState("");
  const [vigenteDesde, setVigenteDesde] = useState(vigenteDesdeInicial);
  const [fuente, setFuente] = useState(vigente?.fuente ?? "");
  const id = (clave: string) => `${tipo}-${clave}`;
  const invalido = (clave: string) => Boolean(errores[clave]?.length);
  const limpiar = (clave: string) => setErrores((previos) => (previos[clave] ? Object.fromEntries(Object.entries(previos).filter(([k]) => k !== clave)) : previos));
  const numeros = (cambios: Record<string, string>) => setV((previo) => ({ ...previo, numeros: { ...previo.numeros, ...cambios } }));
  const filas = (nuevas: Fila[]) => setV((previo) => ({ ...previo, filas: nuevas }));

  function reiniciar() {
    setV(inicialDesde(tipo, vigente?.parametros));
    setCategoria("");
    setVigenteDesde(vigenteDesdeInicial);
    setFuente(vigente?.fuente ?? "");
    setErrores({});
    setErrorGeneral(null);
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const { parametros, errores: propios } = construir(tipo, v);
    setErrorGeneral(null);
    if (Object.keys(propios).length > 0) {
      setErrores(propios);
      return;
    }
    const fd = new FormData();
    fd.set("categoria", categoria);
    fd.set("vigenteDesde", vigenteDesde);
    fd.set("fuente", fuente);
    fd.set("parametros", JSON.stringify(parametros));
    iniciar(async () => {
      const r = await crearReglaAction(tipo, fd);
      if (!r.ok) {
        const campos = r.error.campos ?? {};
        setErrores(campos);
        // Los rechazos del esquema llegan como "ruta: mensaje": se muestran juntos, arriba del formulario
        setErrorGeneral(campos.parametros?.length ? `${t.errores.esquema} ${campos.parametros.join(" · ")}` : Object.keys(campos).length > 0 ? null : r.error.mensaje);
        return;
      }
      setErrores({});
      toast.success(t.exito);
      setAbierto(false);
      reiniciar();
      router.refresh();
    });
  }

  // --- Piezas del formulario ------------------------------------------------------------------------------
  function campoNumero(clave: string, rotulo: string, opciones: { entero?: boolean; ayuda?: string; paso?: string; ancho?: "completo" } = {}): ReactNode {
    return (
      <Field key={clave} data-invalid={invalido(clave)} className={opciones.ancho === "completo" ? "sm:col-span-2" : ""}>
        <FieldLabel htmlFor={id(clave)}>{rotulo}</FieldLabel>
        <EntradaNativa
          id={id(clave)}
          name={clave}
          type="text"
          inputMode="decimal"
          value={v.numeros[clave] ?? ""}
          onChange={(ev) => {
            numeros({ [clave]: ev.target.value });
            limpiar(clave);
          }}
          aria-invalid={invalido(clave)}
          className="h-9"
        />
        {opciones.ayuda && !invalido(clave) && <FieldDescription>{opciones.ayuda}</FieldDescription>}
        <FieldError errors={errores[clave]?.map((message) => ({ message }))} />
      </Field>
    );
  }

  function campoBooleano(clave: string, rotulo: string): ReactNode {
    return (
      <Field key={clave} orientation="horizontal" className="sm:col-span-2">
        <Checkbox id={id(clave)} checked={v.booleanos[clave] === true} onCheckedChange={(valor) => setV((previo) => ({ ...previo, booleanos: { ...previo.booleanos, [clave]: Boolean(valor) } }))} />
        <FieldLabel htmlFor={id(clave)}>{rotulo}</FieldLabel>
      </Field>
    );
  }

  function campoModo(opciones: ReadonlyArray<{ valor: string; etiqueta: string }>): ReactNode {
    return (
      <Field key="modo" className="sm:col-span-2">
        <FieldLabel htmlFor={id("modo")}>{e.modo}</FieldLabel>
        <select id={id("modo")} value={v.modo} onChange={(ev) => setV((previo) => ({ ...previo, modo: ev.target.value }))} className={claseSelect}>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </select>
      </Field>
    );
  }

  interface Columna {
    clave: string;
    etiqueta: string;
    ayuda?: string;
    texto?: boolean;
  }
  function tabla(rotulo: string, columnas: Columna[], agregar: string, ayuda?: string): ReactNode {
    const nueva = () => filas([...v.filas, Object.fromEntries(columnas.map((c) => [c.clave, ""]))]);
    return (
      <fieldset key="filas" className="flex flex-col gap-2 rounded-lg border border-linea p-3 sm:col-span-2" aria-invalid={invalido("filas")}>
        <legend className="px-1 text-sm font-medium">{rotulo}</legend>
        {ayuda && <p className="text-xs text-tinta-secundaria">{ayuda}</p>}
        {v.filas.length === 0 && <p className="text-xs text-tinta-secundaria">{t.tablaVacia}</p>}
        {v.filas.map((fila, i) => (
          <div key={i} className={`grid gap-2 sm:items-end ${columnas.length === 2 ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_1fr_auto]"}`}>
            {columnas.map((c) => {
              const clave = `filas.${i}.${c.clave}`;
              return (
                <Field key={c.clave} data-invalid={invalido(clave)}>
                  <FieldLabel htmlFor={id(clave)} className="text-xs">
                    {c.etiqueta} {i + 1}
                  </FieldLabel>
                  <EntradaNativa
                    id={id(clave)}
                    type="text"
                    inputMode={c.texto ? undefined : "decimal"}
                    value={fila[c.clave] ?? ""}
                    onChange={(ev) => {
                      const copia = v.filas.map((f, j) => (j === i ? { ...f, [c.clave]: ev.target.value } : f));
                      filas(copia);
                      limpiar(clave);
                    }}
                    aria-invalid={invalido(clave)}
                    className="h-9"
                  />
                  {c.ayuda && i === 0 && !invalido(clave) && <FieldDescription>{c.ayuda}</FieldDescription>}
                  <FieldError errors={errores[clave]?.map((message) => ({ message }))} />
                </Field>
              );
            })}
            <Button type="button" variant="outline" size="sm" className="h-9" aria-label={`${t.quitarFila} ${i + 1}`} onClick={() => filas(v.filas.filter((_, j) => j !== i))}>
              {t.quitarFila}
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={nueva}>
            {agregar}
          </Button>
        </div>
        <FieldError errors={errores.filas?.map((message) => ({ message }))} />
      </fieldset>
    );
  }

  function camposDeRegla(): ReactNode {
    switch (tipo) {
      case "PUNTOS_BIENIO":
        return campoNumero("puntos", e.puntos);
      case "DIAS_BIENIO":
        return (
          <>
            {campoModo(OPCIONES_MODO.DIAS_BIENIO)}
            {v.modo === "dias" && campoNumero("dias", e.dias, { entero: true })}
          </>
        );
      case "PRORRATEO_JORNADA":
        return (
          <>
            {campoBooleano("activo", e.activo)}
            {campoNumero("jornadaCompleta", e.jornadaCompleta, { entero: true })}
          </>
        );
      case "TABLA_CAPACITACION":
        return (
          <>
            {tabla(e.tramosHoras, [{ clave: "desde", etiqueta: e.desde }, { clave: "hasta", etiqueta: e.hasta, ayuda: ayudas.hasta }, { clave: "puntos", etiqueta: e.puntosTramo }], t.agregarTramo)}
            {campoBooleano("requiereAprobacion", e.requiereAprobacion)}
            {campoNumero("conNota", e.conNota, { ayuda: ayudas.factor })}
            {campoNumero("sinNota", e.sinNota)}
          </>
        );
      case "TOPE_CAPACITACION_ANUAL":
        return campoNumero("tope", e.tope);
      case "ARRASTRE_EXCEDENTE":
        return (
          <>
            {campoModo(OPCIONES_MODO.ARRASTRE_EXCEDENTE)}
            {v.modo === "integro" && campoNumero("periodosMaximos", e.periodosMaximos, { entero: true })}
          </>
        );
      case "PUNTAJE_ESTUDIOS":
        return (
          <>
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="text-sm font-medium">{e.categorias}</legend>
              <div className="flex flex-wrap gap-4">
                {CATEGORIAS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={id(`categoria-${c}`)}
                      checked={v.categorias.includes(c)}
                      onCheckedChange={(valor) => setV((previo) => ({ ...previo, categorias: valor ? [...previo.categorias, c].sort() : previo.categorias.filter((x) => x !== c) }))}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-medium">{e.puntosEstudio}</legend>
              <p className="text-xs text-tinta-secundaria sm:col-span-2">{ayudas.puntosEstudio}</p>
              {TIPOS_ESTUDIO.map((tipoEstudio) => {
                const clave = `puntosEstudio.${tipoEstudio}`;
                return (
                  <Field key={tipoEstudio} data-invalid={invalido(clave)}>
                    <FieldLabel htmlFor={id(clave)}>{ETIQUETAS.tipoEstudio[tipoEstudio]}</FieldLabel>
                    <EntradaNativa
                      id={id(clave)}
                      type="text"
                      inputMode="decimal"
                      value={v.puntosEstudio[tipoEstudio] ?? ""}
                      onChange={(ev) => {
                        setV((previo) => ({ ...previo, puntosEstudio: { ...previo.puntosEstudio, [tipoEstudio]: ev.target.value } }));
                        limpiar(clave);
                      }}
                      aria-invalid={invalido(clave)}
                      className="h-9"
                    />
                    <FieldError errors={errores[clave]?.map((message) => ({ message }))} />
                  </Field>
                );
              })}
            </fieldset>
          </>
        );
      case "UMBRAL_NIVEL":
        return (
          <>
            {campoModo(OPCIONES_MODO.UMBRAL_NIVEL)}
            {v.modo === "tabla"
              ? tabla(e.umbrales, [{ clave: "nivel", etiqueta: e.nivel }, { clave: "puntos", etiqueta: e.puntajeMinimo }], t.agregarNivel, ayudas.umbrales)
              : campoNumero("puntosPorNivel", e.puntosPorNivel)}
          </>
        );
      case "NIVELES":
        return (
          <>
            {campoNumero("nivelIngreso", e.nivelIngreso, { entero: true })}
            {campoNumero("nivelMaximo", e.nivelMaximo, { entero: true })}
          </>
        );
      case "PERIODO":
        return campoModo(OPCIONES_MODO.PERIODO);
      case "CALIFICACION":
        return (
          <>
            {campoNumero("escalaMinima", e.escalaMinima)}
            {campoNumero("escalaMaxima", e.escalaMaxima)}
            {tabla(e.listas, [{ clave: "nombre", etiqueta: e.nombreLista, texto: true }, { clave: "puntajeMinimo", etiqueta: e.puntajeMinimo }], t.agregarLista, ayudas.listas)}
            <Field data-invalid={invalido("listaConMerito")} className="sm:col-span-2">
              <FieldLabel htmlFor={id("listaConMerito")}>{e.listaConMerito}</FieldLabel>
              <select
                id={id("listaConMerito")}
                value={v.listaConMerito}
                onChange={(ev) => {
                  setV((previo) => ({ ...previo, listaConMerito: ev.target.value }));
                  limpiar("listaConMerito");
                }}
                aria-invalid={invalido("listaConMerito")}
                className={claseSelect}
              >
                <option value="">—</option>
                {v.filas
                  .map((f) => (f.nombre ?? "").trim())
                  .filter(Boolean)
                  .map((nombre) => (
                    <option key={nombre} value={nombre}>{nombre}</option>
                  ))}
              </select>
              <FieldError errors={errores.listaConMerito?.map((message) => ({ message }))} />
            </Field>
          </>
        );
      case "ALERTAS":
        return (
          <>
            {campoNumero("diasAvisoBienio", e.diasAvisoBienio, { entero: true })}
            {campoNumero("diasBienioSinReconocer", e.diasBienioSinReconocer, { entero: true })}
            {campoNumero("puntosAvisoNivel", e.puntosAvisoNivel)}
            {campoNumero("diasAvisoCierrePeriodo", e.diasAvisoCierrePeriodo, { entero: true })}
          </>
        );
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        if (!valor) reiniciar();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{textosParametros.reglas.nuevaVersion}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.titulo(etiqueta)}</DialogTitle>
          <DialogDescription>{t.descripcion}</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={invalido("categoria")}>
              <FieldLabel htmlFor={id("categoria")}>{t.categoria}</FieldLabel>
              <select id={id("categoria")} value={categoria} onChange={(ev) => setCategoria(ev.target.value)} className={claseSelect}>
                <option value="">{t.todas}</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <FieldError errors={errores.categoria?.map((message) => ({ message }))} />
            </Field>
            <Field data-invalid={invalido("vigenteDesde")}>
              <FieldLabel htmlFor={id("vigenteDesde")}>{t.vigenteDesde}</FieldLabel>
              <Input
                id={id("vigenteDesde")}
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={vigenteDesde}
                onChange={(ev) => {
                  setVigenteDesde(ev.target.value);
                  limpiar("vigenteDesde");
                }}
                aria-invalid={invalido("vigenteDesde")}
                className="h-9"
              />
              <FieldError errors={errores.vigenteDesde?.map((message) => ({ message }))} />
            </Field>
            <Field data-invalid={invalido("fuente")} className="sm:col-span-2">
              <FieldLabel htmlFor={id("fuente")}>{t.fuente}</FieldLabel>
              <Input
                id={id("fuente")}
                value={fuente}
                onChange={(ev) => {
                  setFuente(ev.target.value);
                  limpiar("fuente");
                }}
                aria-invalid={invalido("fuente")}
                className="h-9"
              />
              {!invalido("fuente") && <FieldDescription>{t.fuenteAyuda}</FieldDescription>}
              <FieldError errors={errores.fuente?.map((message) => ({ message }))} />
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">{t.parametros}</h3>
            <p className="text-xs text-tinta-secundaria">{t.parametrosAyuda}</p>
          </div>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">{camposDeRegla()}</FieldGroup>

          {errorGeneral && (
            <Alert variant="destructive">
              <AlertDescription>{errorGeneral}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose render={<Button type="button" variant="outline" />}>{t.cancelar}</DialogClose>
            <Button type="submit" disabled={pendiente} className="h-10 sm:h-8">
              {pendiente ? t.guardando : t.enviar}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
