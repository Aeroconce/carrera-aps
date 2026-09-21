"use client";

// Diálogo de subida de documentos (BT 4.8): archivo, tipo, funcionario opcional y vínculo opcional con el hecho.

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { claseSelect } from "@/components/dominio/dialogo-formulario";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { subirDocumentoAction } from "@/lib/acciones/documentos";
import { textosDocumentos as t } from "./textos";

export interface OpcionVinculo {
  valor: string;
  etiqueta: string;
}

interface Props {
  /** Funcionario fijo (desde la ficha) o lista para elegir (desde el módulo) */
  funcionarioId?: string;
  funcionarios?: Array<{ id: string; etiqueta: string }>;
  vinculos?: OpcionVinculo[];
  textoBoton?: string;
  variante?: "default" | "outline";
}

export function SubirDocumento({ funcionarioId, funcionarios = [], vinculos = [], textoBoton = t.subir, variante = "default" }: Props) {
  const router = useRouter();
  const d = t.dialogo;
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fd = new FormData(evento.currentTarget);
    if (funcionarioId) fd.set("funcionarioId", funcionarioId);
    setErrorGeneral(null);
    iniciar(async () => {
      const r = await subirDocumentoAction(fd);
      if (!r.ok) {
        setErrores(r.error.campos ?? {});
        setErrorGeneral(r.error.campos ? null : r.error.mensaje);
        return;
      }
      toast.success(d.exito);
      setAbierto(false);
      setErrores({});
      router.refresh();
    });
  }

  const invalido = (campo: string) => Boolean(errores[campo]?.length);
  return (
    <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) { setErrores({}); setErrorGeneral(null); } }}>
      <DialogTrigger render={<Button variant={variante} size="sm" />}>{textoBoton}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{d.titulo}</DialogTitle>
          <DialogDescription>{d.descripcion}</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={invalido("archivo")} className="sm:col-span-2">
              <FieldLabel htmlFor="archivo">{d.archivo}</FieldLabel>
              <EntradaNativa id="archivo" name="archivo" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required aria-invalid={invalido("archivo")} className="h-9 file:mr-2 file:rounded-md file:border-0 file:bg-institucional-suave file:px-2 file:text-sm" />
              <FieldError errors={errores.archivo?.map((message) => ({ message }))} />
            </Field>
            <Field data-invalid={invalido("tipo")}>
              <FieldLabel htmlFor="tipo">{d.tipo}</FieldLabel>
              <select id="tipo" name="tipo" required defaultValue="CERTIFICADO_CAPACITACION" aria-invalid={invalido("tipo")} className={claseSelect}>
                {Object.entries(t.tipos).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
              <FieldError errors={errores.tipo?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="nombre">{d.nombre}</FieldLabel>
              <Input id="nombre" name="nombre" className="h-9" />
              <FieldDescription>{d.nombreAyuda}</FieldDescription>
            </Field>
            {!funcionarioId && (
              <Field data-invalid={invalido("funcionarioId")} className="sm:col-span-2">
                <FieldLabel htmlFor="funcionarioId">{d.funcionario}</FieldLabel>
                <select id="funcionarioId" name="funcionarioId" defaultValue="" className={claseSelect}>
                  <option value="">{d.sinFuncionario}</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>{f.etiqueta}</option>
                  ))}
                </select>
                <FieldError errors={errores.funcionarioId?.map((message) => ({ message }))} />
              </Field>
            )}
            {funcionarioId && vinculos.length > 0 && (
              <Field data-invalid={invalido("vincular")} className="sm:col-span-2">
                <FieldLabel htmlFor="vincular">{d.vincular}</FieldLabel>
                <select id="vincular" name="vincular" defaultValue="" className={claseSelect}>
                  <option value="">{d.sinVinculo}</option>
                  {vinculos.map((v) => (
                    <option key={v.valor} value={v.valor}>{v.etiqueta}</option>
                  ))}
                </select>
                <FieldError errors={errores.vincular?.map((message) => ({ message }))} />
              </Field>
            )}
          </FieldGroup>
          {errorGeneral && (
            <Alert variant="destructive">
              <AlertDescription>{errorGeneral}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose render={<Button type="button" variant="outline" />}>{d.cancelar}</DialogClose>
            <Button type="submit" disabled={pendiente} className="h-10 sm:h-8">{pendiente ? d.subiendo : d.enviar}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
