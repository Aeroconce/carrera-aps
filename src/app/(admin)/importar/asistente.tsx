"use client";

// Asistente de importación (doc 13 F13): subir → validar (errores por fila y columna, o vista previa) → confirmar.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmarImportacionAction, validarImportacionAction, type ResultadoValidacionAccion } from "@/lib/acciones/importacion";
import type { ResultadoImportacion } from "@/lib/db/importacion";
import { formatearChileno } from "@/lib/fechas/civil";
import { formatearRut } from "@/lib/rut";
import { textosImportar as t } from "./textos";
import { SelectorFecha } from "@/components/dominio/selector-fecha";

const CONTRATO: Record<string, string> = { TITULAR: "Titular", PLAZO_FIJO: "Plazo fijo", REEMPLAZO: "Reemplazo" };

export function AsistenteImportacion({ fechaSaldosInicial }: { fechaSaldosInicial: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [validacion, setValidacion] = useState<ResultadoValidacionAccion | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  function validar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fd = new FormData(evento.currentTarget);
    setErrorArchivo(null);
    setResultado(null);
    iniciar(async () => {
      const r = await validarImportacionAction(fd);
      if (!r.ok) {
        setErrorArchivo(r.error.campos?.archivo?.[0] ?? r.error.mensaje);
        setValidacion(null);
        return;
      }
      setValidacion(r.data);
    });
  }

  function confirmar() {
    if (!validacion?.token) return;
    const token = validacion.token;
    iniciar(async () => {
      const r = await confirmarImportacionAction(token, validacion.fechaSaldos);
      if (!r.ok) {
        toast.error(r.error.mensaje);
        return;
      }
      setResultado(r.data);
      setValidacion(null);
      toast.success(t.resultado.creados(r.data.creados));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid gap-2 text-sm sm:grid-cols-4">
        {t.pasos.map((p, i) => (
          <li key={p} className="rounded-lg border border-linea bg-superficie px-3 py-2">
            <span className="mr-1 font-semibold text-institucional">{i + 1}.</span>
            {p}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 rounded-lg border border-linea bg-superficie p-4">
        <a href="/importar/plantilla" className={buttonVariants({ variant: "outline", className: "self-start" })} download>
          {t.plantilla}
        </a>
        <form onSubmit={validar} className="flex flex-col gap-3 md:flex-row md:items-end">
          <Field data-invalid={Boolean(errorArchivo)} className="flex-1">
            <FieldLabel htmlFor="archivo">{t.archivo}</FieldLabel>
            <EntradaNativa id="archivo" name="archivo" type="file" accept=".xlsx" required aria-invalid={Boolean(errorArchivo)} className="h-10 file:mr-2 file:rounded-md file:border-0 file:bg-institucional-suave file:px-2 file:text-sm" />
            <FieldError errors={errorArchivo ? [{ message: errorArchivo }] : undefined} />
          </Field>
          <Field className="md:w-56">
            <FieldLabel htmlFor="fechaSaldos">{t.fechaSaldos}</FieldLabel>
            <SelectorFecha id="fechaSaldos" name="fechaSaldos" defaultValue={fechaSaldosInicial} required />
            <FieldDescription>{t.fechaSaldosAyuda}</FieldDescription>
          </Field>
          <Button type="submit" disabled={pendiente} className="h-10">{pendiente && !validacion?.token ? t.validando : t.validar}</Button>
        </form>
      </div>

      {validacion && validacion.faltantes.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{t.faltantes}</AlertTitle>
          <AlertDescription>{validacion.faltantes.join(", ")}</AlertDescription>
        </Alert>
      )}

      {validacion && validacion.errores.length > 0 && (
        <section className="flex flex-col gap-2">
          <Alert variant="destructive">
            <AlertDescription>{t.errores(validacion.errores.length, validacion.total)}</AlertDescription>
          </Alert>
          <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t.columnasError.fila}</TableHead>
                  <TableHead>{t.columnasError.columna}</TableHead>
                  <TableHead>{t.columnasError.mensaje}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validacion.errores.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-right">{e.fila}</TableCell>
                    <TableCell>{e.columna}</TableCell>
                    <TableCell>{e.mensaje}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {validacion?.token && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t.vistaPrevia(validacion.vistaPrevia.length, validacion.total)}</p>
            <Button onClick={confirmar} disabled={pendiente}>{pendiente ? t.importando : t.confirmar(validacion.total)}</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columnasPrevia.rut}</TableHead>
                  <TableHead>{t.columnasPrevia.nombre}</TableHead>
                  <TableHead>{t.columnasPrevia.categoria}</TableHead>
                  <TableHead>{t.columnasPrevia.establecimiento}</TableHead>
                  <TableHead>{t.columnasPrevia.contrato}</TableHead>
                  <TableHead>{t.columnasPrevia.ingreso}</TableHead>
                  <TableHead className="text-right">{t.columnasPrevia.grado}</TableHead>
                  <TableHead>{t.columnasPrevia.desde}</TableHead>
                  <TableHead className="text-right">{t.columnasPrevia.total}</TableHead>
                  <TableHead className="text-right">{t.columnasPrevia.exp}</TableHead>
                  <TableHead className="text-right">{t.columnasPrevia.cap}</TableHead>
                  <TableHead>{t.columnasPrevia.bienio}</TableHead>
                  <TableHead className="text-right">{t.columnasPrevia.n}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validacion.vistaPrevia.map((f) => (
                  <TableRow key={f.fila}>
                    <TableCell className="whitespace-nowrap">{formatearRut(f.rut)}</TableCell>
                    <TableCell>{f.nombres} {f.apellidos}</TableCell>
                    <TableCell>{f.categoria}</TableCell>
                    <TableCell>{f.establecimiento}</TableCell>
                    <TableCell>{CONTRATO[f.tipoContrato] ?? f.tipoContrato}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatearChileno(f.fechaIngreso)}</TableCell>
                    <TableCell className="text-right">{f.grado}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatearChileno(f.gradoDesde)}</TableCell>
                    <TableCell className="text-right">{f.puntajeTotal}</TableCell>
                    <TableCell className="text-right">{f.puntajeExperiencia ?? t.sinDesglose}</TableCell>
                    <TableCell className="text-right">{f.puntajeCapacitacion ?? ""}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatearChileno(f.fechaUltimoBienio)}</TableCell>
                    <TableCell className="text-right">{f.bieniosReconocidos ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {resultado && (
        <section className="rounded-lg border border-institucional bg-institucional-suave p-4 text-tinta">
          <h2 className="text-base font-medium">{t.resultado.titulo}</h2>
          <p className="mt-1 text-sm">
            {t.resultado.creados(resultado.creados)}
            {resultado.omitidos.length > 0 ? ` · ${t.resultado.omitidos(resultado.omitidos.length)}` : ""}
          </p>
          {resultado.omitidos.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {resultado.omitidos.map((o) => (
                <li key={o.fila}>Fila {o.fila} ({formatearRut(o.rut)}): {o.motivo}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs">{t.resultado.auditoria}</p>
          <Link href="/funcionarios" className={buttonVariants({ className: "mt-3" })}>{t.resultado.verFuncionarios}</Link>
        </section>
      )}
    </div>
  );
}
