"use client";

// Bienios por reconocer con acción masiva (doc 13 F4.6): selección múltiple y un diálogo con el decreto común.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reconocerBieniosMasivoAction } from "@/lib/acciones/carrera";
import { formatearChileno, hoyEnChile } from "@/lib/fechas/civil";
import { formatearRut } from "@/lib/formato";
import { textosCarrera } from "./textos";

const t = textosCarrera.bienios;

export interface BienioFila {
  clave: string;
  funcionarioId: string;
  nombre: string;
  rut: string;
  establecimiento: string;
  numero: number;
  fechaCumplido: string;
  dias: number;
  puntos: string;
}

export function BieniosPorReconocer({ filas, puedeEditar }: { filas: BienioFila[]; puedeEditar: boolean }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const alternar = (clave: string, valor: boolean) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (valor) n.add(clave);
      else n.delete(clave);
      return n;
    });
  const todos = seleccion.size === filas.length && filas.length > 0;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fd = new FormData(evento.currentTarget);
    const items = filas.filter((f) => seleccion.has(f.clave)).map((f) => ({ funcionarioId: f.funcionarioId, numero: f.numero }));
    fd.set("seleccion", JSON.stringify(items));
    setErrorGeneral(null);
    iniciar(async () => {
      const r = await reconocerBieniosMasivoAction(fd);
      if (!r.ok) {
        setErrores(r.error.campos ?? {});
        setErrorGeneral(r.error.campos ? null : r.error.mensaje);
        return;
      }
      const omitidos = r.data.omitidos.length ? ` · ${t.omitidos(r.data.omitidos.length)}` : "";
      toast.success(`${t.exito(r.data.reconocidos)}${omitidos}`);
      setAbierto(false);
      setSeleccion(new Set());
      router.refresh();
    });
  }

  if (filas.length === 0) return <p className="rounded-lg border border-dashed border-linea p-6 text-center text-sm text-tinta-secundaria">{t.vacio}</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-tinta-secundaria">{t.intro}</p>
      {puedeEditar && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={todos} onCheckedChange={(v) => setSeleccion(v ? new Set(filas.map((f) => f.clave)) : new Set())} aria-label={t.seleccionarTodos} />
            {t.seleccionarTodos}
          </label>
          <span className="text-sm text-tinta-secundaria">{t.seleccionados(seleccion.size)}</span>
          <Dialog
            open={abierto}
            onOpenChange={(v) => {
              setAbierto(v);
              if (!v) {
                setErrores({});
                setErrorGeneral(null);
              }
            }}
          >
            <DialogTrigger render={<Button size="sm" disabled={seleccion.size === 0} />}>{t.reconocer}</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.titulo}</DialogTitle>
                <DialogDescription>{t.descripcion(seleccion.size)}</DialogDescription>
              </DialogHeader>
              <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(errores.decretoNumero?.length)}>
                    <FieldLabel htmlFor="decretoNumero">{t.decretoNumero}</FieldLabel>
                    <Input id="decretoNumero" name="decretoNumero" required aria-invalid={Boolean(errores.decretoNumero?.length)} className="h-9" />
                    <FieldError errors={errores.decretoNumero?.map((message) => ({ message }))} />
                  </Field>
                  <Field data-invalid={Boolean(errores.decretoFecha?.length)}>
                    <FieldLabel htmlFor="decretoFecha">{t.decretoFecha}</FieldLabel>
                    <Input id="decretoFecha" name="decretoFecha" required placeholder="dd/mm/aaaa" inputMode="numeric" defaultValue={formatearChileno(hoyEnChile())} aria-invalid={Boolean(errores.decretoFecha?.length)} className="h-9" />
                    <FieldError errors={errores.decretoFecha?.map((message) => ({ message }))} />
                  </Field>
                </FieldGroup>
                {(errorGeneral || errores.seleccion) && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorGeneral ?? errores.seleccion?.join(" ")}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <DialogClose render={<Button type="button" variant="outline" />}>{t.cancelar}</DialogClose>
                  <Button type="submit" disabled={pendiente} className="h-10 sm:h-8">{pendiente ? t.guardando : t.enviar}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-lg border border-linea bg-superficie md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {puedeEditar && <TableHead className="w-10"><span className="sr-only">{t.seleccionar}</span></TableHead>}
              <TableHead>{t.columnas.funcionario}</TableHead>
              <TableHead>{t.columnas.establecimiento}</TableHead>
              <TableHead className="text-right">{t.columnas.numero}</TableHead>
              <TableHead>{t.columnas.cumplido}</TableHead>
              <TableHead className="text-right">{t.columnas.dias}</TableHead>
              <TableHead className="text-right">{t.columnas.puntos}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.clave}>
                {puedeEditar && (
                  <TableCell>
                    <Checkbox checked={seleccion.has(f.clave)} onCheckedChange={(v) => alternar(f.clave, Boolean(v))} aria-label={`${t.seleccionar} ${f.nombre}, bienio ${f.numero}`} />
                  </TableCell>
                )}
                <TableCell>
                  <Link href={`/funcionarios/${f.funcionarioId}?pestana=experiencia`} className="font-medium text-institucional hover:underline">{f.nombre}</Link>
                  <span className="block text-xs text-tinta-secundaria">{formatearRut(f.rut)}</span>
                </TableCell>
                <TableCell>{f.establecimiento}</TableCell>
                <TableCell className="text-right">{f.numero}</TableCell>
                <TableCell className="whitespace-nowrap">{formatearChileno(f.fechaCumplido)}</TableCell>
                <TableCell className="text-right">{f.dias}</TableCell>
                <TableCell className="text-right">{f.puntos}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {filas.map((f) => (
          <li key={f.clave} className="flex gap-3 rounded-lg border border-linea bg-superficie p-3">
            {puedeEditar && <Checkbox checked={seleccion.has(f.clave)} onCheckedChange={(v) => alternar(f.clave, Boolean(v))} aria-label={`${t.seleccionar} ${f.nombre}, bienio ${f.numero}`} className="mt-1" />}
            <div className="flex-1">
              <Link href={`/funcionarios/${f.funcionarioId}?pestana=experiencia`} className="font-medium text-institucional">{f.nombre}</Link>
              <p className="text-xs text-tinta-secundaria">{formatearRut(f.rut)} · {f.establecimiento}</p>
              <p className="text-sm">Bienio {f.numero} · {formatearChileno(f.fechaCumplido)} · {f.puntos} puntos · {f.dias} días</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
