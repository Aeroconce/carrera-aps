"use client";

// Diálogo de calificación (doc 13 F15): notas por factor y subfactor según la ponderación del proceso, puntaje
// final calculado en vivo con la misma función que usa el servidor, lista según la regla, acta opcional y
// observaciones. Si el proceso no tiene factores, se registra el puntaje final directamente.

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { calificarAction } from "@/lib/acciones/calificaciones";
import { arbolFactores, calcularPuntajeFinal, listaPorPuntaje, type FactorBase } from "@/lib/calificaciones/puntaje";
import { formatearPuntos } from "@/lib/formato";
import { textosCalificaciones } from "./textos";

const t = textosCalificaciones.dialogoCalificar;

export interface EscalaCalificacion {
  minima: number;
  maxima: number;
  listas: Array<{ nombre: string; puntajeMinimo: number }>;
  listaConMerito: string;
}

export interface CalificacionInicial {
  puntajes: Record<string, number>;
  puntajeFinal: number;
  observaciones: string | null;
  tieneActa: boolean;
}

interface Props {
  procesoId: string;
  funcionarioId: string;
  nombre: string;
  factores: FactorBase[];
  escala: EscalaCalificacion | null;
  inicial: CalificacionInicial | null;
}

function aNumero(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isNaN(n) ? null : n;
}

export function DialogoCalificar({ procesoId, funcionarioId, nombre, factores, escala, inicial }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(inicial?.puntajes ?? {}).map(([id, nota]) => [id, String(nota)])));
  const [puntajeDirecto, setPuntajeDirecto] = useState(inicial ? String(inicial.puntajeFinal) : "");

  const arbol = useMemo(() => arbolFactores(factores), [factores]);
  const conFactores = arbol.length > 0;
  const calculo = useMemo(() => calcularPuntajeFinal(factores, Object.fromEntries(Object.entries(notas).map(([id, texto]) => [id, aNumero(texto)]))), [factores, notas]);
  const puntajeFinal = conFactores ? calculo.puntajeFinal : aNumero(puntajeDirecto);
  const lista = puntajeFinal !== null && escala ? listaPorPuntaje(escala.listas, puntajeFinal) : null;
  const invalido = (campo: string) => Boolean(errores[campo]?.length);
  const limpiar = (campo: string) => setErrores((previos) => (previos[campo] ? Object.fromEntries(Object.entries(previos).filter(([k]) => k !== campo)) : previos));

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fd = new FormData(evento.currentTarget);
    setErrorGeneral(null);
    iniciar(async () => {
      const r = await calificarAction(procesoId, funcionarioId, fd);
      if (!r.ok) {
        const campos = r.error.campos ?? {};
        setErrores(campos);
        setErrorGeneral(campos.general?.[0] ?? (Object.keys(campos).length > 0 ? null : r.error.mensaje));
        return;
      }
      setErrores({});
      toast.success(t.exito);
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        if (!valor) {
          setErrores({});
          setErrorGeneral(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant={inicial ? "outline" : "default"} size="xs" />}>{inicial ? textosCalificaciones.editar : textosCalificaciones.calificar}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.titulo(nombre)}</DialogTitle>
          {escala && <DialogDescription>{t.descripcion(escala.minima, escala.maxima, escala.listaConMerito)}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          {conFactores ? (
            <div className="flex flex-col gap-3" role="group" aria-label={t.notas}>
              {arbol.map((factor) => {
                const items = factor.subfactores.length > 0 ? factor.subfactores : [factor];
                const notaFactor = calculo.porFactor.find((f) => f.factorId === factor.id)?.nota ?? null;
                return (
                  <fieldset key={factor.id} className="rounded-lg border border-linea p-3">
                    <legend className="px-1 text-sm font-medium">
                      {factor.nombre} <span className="text-xs font-normal text-tinta-secundaria">· {textosCalificaciones.factores.ponderacion(formatearPuntos(factor.ponderacion))}</span>
                    </legend>
                    <FieldGroup className="grid gap-3 sm:grid-cols-2">
                      {items.map((item) => {
                        const campo = `nota:${item.id}`;
                        return (
                          <Field key={item.id} data-invalid={invalido(campo)}>
                            <FieldLabel htmlFor={campo}>{item.id === factor.id ? t.nota : `${item.nombre} · ${textosCalificaciones.factores.ponderacion(formatearPuntos(item.ponderacion))}`}</FieldLabel>
                            <EntradaNativa
                              id={campo}
                              name={campo}
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              min={escala?.minima}
                              max={escala?.maxima}
                              required
                              value={notas[item.id] ?? ""}
                              onChange={(e) => {
                                const valor = e.target.value;
                                setNotas((previas) => ({ ...previas, [item.id]: valor }));
                                limpiar(campo);
                              }}
                              aria-invalid={invalido(campo)}
                              className="h-9"
                            />
                            <FieldError errors={errores[campo]?.map((message) => ({ message }))} />
                          </Field>
                        );
                      })}
                    </FieldGroup>
                    {factor.subfactores.length > 0 && (
                      <p className="mt-2 text-xs text-tinta-secundaria">
                        {factor.nombre}: {notaFactor === null ? "—" : formatearPuntos(notaFactor)}
                      </p>
                    )}
                  </fieldset>
                );
              })}
            </div>
          ) : (
            <Field data-invalid={invalido("puntajeFinal")}>
              <FieldLabel htmlFor="puntajeFinal">{t.puntaje}</FieldLabel>
              <EntradaNativa
                id="puntajeFinal"
                name="puntajeFinal"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={escala?.minima}
                max={escala?.maxima}
                required
                value={puntajeDirecto}
                onChange={(e) => {
                  setPuntajeDirecto(e.target.value);
                  limpiar("puntajeFinal");
                }}
                aria-invalid={invalido("puntajeFinal")}
                className="h-9"
              />
              <FieldError errors={errores.puntajeFinal?.map((message) => ({ message }))} />
            </Field>
          )}

          <div role="status" aria-live="polite" className="rounded-lg bg-institucional-suave p-3 text-tinta">
            <p className="text-xs">{t.calculado}</p>
            <p className="text-2xl font-semibold" data-testid="puntaje-calculado">{puntajeFinal === null ? "—" : formatearPuntos(puntajeFinal)}</p>
            <p className="text-xs">{puntajeFinal === null ? t.incompleto : t.lista(lista)}</p>
          </div>

          <FieldGroup className="grid gap-4">
            <Field data-invalid={invalido("acta")}>
              <FieldLabel htmlFor="acta">{t.acta}</FieldLabel>
              <EntradaNativa
                id="acta"
                name="acta"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={() => limpiar("acta")}
                aria-invalid={invalido("acta")}
                className="h-9 file:mr-2 file:rounded-md file:border-0 file:bg-institucional-suave file:px-2 file:text-sm"
              />
              {!invalido("acta") && <FieldDescription>{inicial?.tieneActa ? t.actaActual : t.actaAyuda}</FieldDescription>}
              <FieldError errors={errores.acta?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="observaciones">{t.observaciones}</FieldLabel>
              <Textarea id="observaciones" name="observaciones" defaultValue={inicial?.observaciones ?? ""} rows={3} className="font-mono text-xs" />
            </Field>
          </FieldGroup>

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
