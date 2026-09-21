"use client";

// Diálogo con formulario, genérico (doc 12: diálogo en escritorio, hoja desde abajo en celular; etiqueta arriba,
// ayuda debajo, error en rojo con foco visible). La validación real vive en la server action; aquí solo se
// muestran sus errores por campo y el general. Al guardar: toast con el mismo verbo del botón y refresco.

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { Textarea } from "@/components/ui/textarea";
import type { RespuestaAccion } from "@/lib/acciones/tipos";
import type { VariantProps } from "class-variance-authority";

export interface OpcionCampo {
  valor: string;
  etiqueta: string;
}

export interface CampoFormulario {
  nombre: string;
  etiqueta?: string;
  tipo: "text" | "number" | "fecha" | "select" | "checkbox" | "textarea" | "hidden" | "email";
  opciones?: readonly OpcionCampo[];
  requerido?: boolean;
  valorInicial?: string | number | boolean | null;
  ayuda?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  paso?: string;
  /** Ocupa toda la fila en la rejilla de dos columnas */
  ancho?: "completo" | "medio";
  /** Campo que debe estar marcado (checkbox) para que este se muestre */
  visibleSi?: string;
  /** Filas visibles de un textarea */
  filas?: number;
}

interface Props {
  titulo: string;
  descripcion?: string;
  textoBoton: string;
  varianteBoton?: VariantProps<typeof buttonVariants>["variant"];
  tamanoBoton?: VariantProps<typeof buttonVariants>["size"];
  campos: CampoFormulario[];
  accion: (fd: FormData) => Promise<RespuestaAccion<unknown>>;
  textoEnviar: string;
  textoGuardando?: string;
  exito: string;
  cancelar?: string;
  onExito?: (data: unknown) => void;
  children?: ReactNode;
}

export const claseSelect =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function DialogoFormulario({
  titulo,
  descripcion,
  textoBoton,
  varianteBoton = "default",
  tamanoBoton = "sm",
  campos,
  accion,
  textoEnviar,
  textoGuardando = "Guardando…",
  exito,
  cancelar = "Cancelar",
  onExito,
  children,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(campos.filter((c) => c.tipo === "checkbox").map((c) => [c.nombre, Boolean(c.valorInicial)])),
  );

  /** Al corregir un campo desaparece su error (doc 12: el error se muestra hasta que el usuario lo atiende). */
  function limpiarError(evento: FormEvent<HTMLFormElement>) {
    const nombre = (evento.target as HTMLInputElement | null)?.name;
    if (nombre && errores[nombre]) {
      setErrores((previos) => Object.fromEntries(Object.entries(previos).filter(([clave]) => clave !== nombre)));
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fd = new FormData(evento.currentTarget);
    setErrorGeneral(null);
    iniciarTransicion(async () => {
      const respuesta = await accion(fd);
      if (!respuesta.ok) {
        setErrores(respuesta.error.campos ?? {});
        setErrorGeneral(respuesta.error.campos && Object.keys(respuesta.error.campos).length > 0 ? null : respuesta.error.mensaje);
        return;
      }
      setErrores({});
      toast.success(exito);
      setAbierto(false);
      router.refresh();
      onExito?.(respuesta.data);
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
      <DialogTrigger render={<Button variant={varianteBoton} size={tamanoBoton} />}>{textoBoton}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {children}
        <form onSubmit={enviar} onChange={limpiarError} noValidate className="flex flex-col gap-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {campos.map((campo) => {
              if (campo.visibleSi && !marcados[campo.visibleSi]) return null;
              if (campo.tipo === "hidden") {
                return <input key={campo.nombre} type="hidden" name={campo.nombre} value={String(campo.valorInicial ?? "")} />;
              }
              const invalido = Boolean(errores[campo.nombre]?.length);
              const clase = campo.tipo === "textarea" || campo.ancho === "completo" ? "sm:col-span-2" : "";
              if (campo.tipo === "checkbox") {
                return (
                  <Field key={campo.nombre} orientation="horizontal" data-invalid={invalido} className={clase}>
                    <Checkbox
                      id={campo.nombre}
                      name={campo.nombre}
                      checked={Boolean(marcados[campo.nombre])}
                      onCheckedChange={(valor) => setMarcados((m) => ({ ...m, [campo.nombre]: Boolean(valor) }))}
                    />
                    <FieldLabel htmlFor={campo.nombre}>{campo.etiqueta}</FieldLabel>
                    {campo.ayuda && <FieldDescription>{campo.ayuda}</FieldDescription>}
                    <FieldError errors={errores[campo.nombre]?.map((message) => ({ message }))} />
                  </Field>
                );
              }
              return (
                <Field key={campo.nombre} data-invalid={invalido} className={clase}>
                  <FieldLabel htmlFor={campo.nombre}>{campo.etiqueta}</FieldLabel>
                  {campo.tipo === "select" ? (
                    <select id={campo.nombre} name={campo.nombre} defaultValue={String(campo.valorInicial ?? "")} required={campo.requerido} aria-invalid={invalido} className={claseSelect}>
                      {!campo.requerido && <option value="">—</option>}
                      {campo.opciones?.map((o) => (
                        <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                      ))}
                    </select>
                  ) : campo.tipo === "textarea" ? (
                    <Textarea id={campo.nombre} name={campo.nombre} defaultValue={String(campo.valorInicial ?? "")} required={campo.requerido} aria-invalid={invalido} rows={campo.filas ?? 3} className="font-mono text-xs" />
                  ) : campo.tipo === "number" ? (
                    <EntradaNativa
                      id={campo.nombre}
                      name={campo.nombre}
                      type="number"
                      inputMode="decimal"
                      defaultValue={campo.valorInicial === null || campo.valorInicial === undefined ? "" : String(campo.valorInicial)}
                      required={campo.requerido}
                      min={campo.min}
                      max={campo.max}
                      step={campo.paso}
                      aria-invalid={invalido}
                      className="h-9"
                    />
                  ) : (
                    <Input
                      id={campo.nombre}
                      name={campo.nombre}
                      type={campo.tipo === "fecha" ? "text" : campo.tipo}
                      inputMode={campo.tipo === "fecha" ? "numeric" : undefined}
                      placeholder={campo.tipo === "fecha" ? "dd/mm/aaaa" : campo.placeholder}
                      defaultValue={campo.valorInicial === null || campo.valorInicial === undefined ? "" : String(campo.valorInicial)}
                      required={campo.requerido}
                      min={campo.min}
                      max={campo.max}
                      step={campo.paso}
                      aria-invalid={invalido}
                      className="h-9"
                    />
                  )}
                  {campo.ayuda && !invalido && <FieldDescription>{campo.ayuda}</FieldDescription>}
                  <FieldError errors={errores[campo.nombre]?.map((message) => ({ message }))} />
                </Field>
              );
            })}
          </FieldGroup>

          {errorGeneral && (
            <Alert variant="destructive">
              <AlertDescription>{errorGeneral}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose render={<Button type="button" variant="outline" />}>{cancelar}</DialogClose>
            <Button type="submit" disabled={pendiente} className="h-10 sm:h-8">
              {pendiente ? textoGuardando : textoEnviar}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
