"use client";

// Formulario de alta (página, no diálogo: son muchos campos). Valida en el servidor; muestra errores por campo.

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { claseSelect } from "@/components/dominio/dialogo-formulario";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { crearFuncionarioAction } from "@/lib/acciones/funcionarios";
import { textosNuevo as t } from "./textos";

const c = t.campos;

function Campo({ nombre, etiqueta, errores, ayuda, children }: { nombre: string; etiqueta: string; errores: Record<string, string[]>; ayuda?: string; children: React.ReactNode }) {
  const invalido = Boolean(errores[nombre]?.length);
  return (
    <Field data-invalid={invalido}>
      <FieldLabel htmlFor={nombre}>{etiqueta}</FieldLabel>
      {children}
      {ayuda && !invalido && <FieldDescription>{ayuda}</FieldDescription>}
      <FieldError errors={errores[nombre]?.map((message) => ({ message }))} />
    </Field>
  );
}

export function FormularioNuevoFuncionario({ establecimientos }: { establecimientos: Array<{ id: string; nombre: string }> }) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [conApertura, setConApertura] = useState(false);
  const [desglosado, setDesglosado] = useState(true);

  function limpiarError(evento: FormEvent<HTMLFormElement>) {
    const nombre = (evento.target as HTMLInputElement | null)?.name;
    if (nombre && errores[nombre]) {
      setErrores((previos) => Object.fromEntries(Object.entries(previos).filter(([clave]) => clave !== nombre)));
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fd = new FormData(evento.currentTarget);
    if (conApertura) fd.set("conApertura", "on");
    if (conApertura && desglosado) fd.set("aperturaDesglosado", "on");
    setErrorGeneral(null);
    iniciarTransicion(async () => {
      const respuesta = await crearFuncionarioAction(fd);
      if (!respuesta.ok) {
        setErrores(respuesta.error.campos ?? {});
        setErrorGeneral(respuesta.error.campos && Object.keys(respuesta.error.campos).length > 0 ? null : respuesta.error.mensaje);
        return;
      }
      toast.success(t.exito);
      router.push(`/funcionarios/${respuesta.data.id}`);
    });
  }

  const entrada = (nombre: string, extra: React.ComponentProps<"input"> = {}) => {
    const props = { id: nombre, name: nombre, "aria-invalid": Boolean(errores[nombre]?.length), className: "h-9", ...extra };
    // Los campos numéricos usan la entrada nativa (ver entrada-nativa.tsx)
    return extra.type === "number" ? <EntradaNativa {...props} /> : <Input {...props} />;
  };
  const fecha = (nombre: string) => entrada(nombre, { placeholder: "dd/mm/aaaa", inputMode: "numeric" });

  return (
    <form onSubmit={enviar} onChange={limpiarError} noValidate className="flex flex-col gap-6">
      <FieldSet className="rounded-lg border border-linea bg-superficie p-4">
        <FieldLegend>{t.datos}</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Campo nombre="rut" etiqueta={c.rut} errores={errores}>{entrada("rut", { placeholder: "12.345.678-5", required: true })}</Campo>
          <Campo nombre="email" etiqueta={c.email} errores={errores}>{entrada("email", { type: "email" })}</Campo>
          <Campo nombre="nombres" etiqueta={c.nombres} errores={errores}>{entrada("nombres", { required: true })}</Campo>
          <Campo nombre="apellidos" etiqueta={c.apellidos} errores={errores}>{entrada("apellidos", { required: true })}</Campo>
          <Campo nombre="fechaNacimiento" etiqueta={c.fechaNacimiento} errores={errores}>{fecha("fechaNacimiento")}</Campo>
          <Campo nombre="categoria" etiqueta={c.categoria} errores={errores}>
            <select id="categoria" name="categoria" required className={claseSelect} defaultValue="">
              <option value="">—</option>
              {["A", "B", "C", "D", "E", "F"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Campo>
          <Campo nombre="tipoContrato" etiqueta={c.tipoContrato} errores={errores}>
            <select id="tipoContrato" name="tipoContrato" required className={claseSelect} defaultValue="TITULAR">
              <option value="TITULAR">Titular</option>
              <option value="PLAZO_FIJO">Plazo fijo</option>
              <option value="REEMPLAZO">Reemplazo</option>
            </select>
          </Campo>
          <Campo nombre="fechaIngreso" etiqueta={c.fechaIngreso} errores={errores}>{fecha("fechaIngreso")}</Campo>
          <Campo nombre="establecimientoId" etiqueta={c.establecimiento} errores={errores}>
            <select id="establecimientoId" name="establecimientoId" required className={claseSelect} defaultValue="">
              <option value="">—</option>
              {establecimientos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
          <Campo nombre="cargo" etiqueta={c.cargo} errores={errores}>{entrada("cargo")}</Campo>
          <Campo nombre="jornadaHoras" etiqueta={c.jornada} errores={errores}>{entrada("jornadaHoras", { type: "number", min: 1, max: 44 })}</Campo>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="rounded-lg border border-linea bg-superficie p-4">
        <FieldLegend>{t.apertura}</FieldLegend>
        <Field orientation="horizontal">
          <Checkbox id="conApertura" checked={conApertura} onCheckedChange={(v) => setConApertura(Boolean(v))} />
          <FieldLabel htmlFor="conApertura">{t.conApertura}</FieldLabel>
          <FieldDescription>{t.conAperturaAyuda}</FieldDescription>
        </Field>
        {conApertura && (
          <FieldGroup className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo nombre="aperturaFecha" etiqueta={c.aperturaFecha} errores={errores} ayuda={c.aperturaFechaAyuda}>{fecha("aperturaFecha")}</Campo>
            <Campo nombre="aperturaFuente" etiqueta={c.aperturaFuente} errores={errores} ayuda={c.aperturaFuenteAyuda}>{entrada("aperturaFuente")}</Campo>
            <Campo nombre="aperturaNivel" etiqueta={c.aperturaNivel} errores={errores}>{entrada("aperturaNivel", { type: "number", min: 1, max: 99 })}</Campo>
            <Campo nombre="aperturaNivelDesde" etiqueta={c.aperturaNivelDesde} errores={errores}>{fecha("aperturaNivelDesde")}</Campo>
            <Campo nombre="aperturaPuntajeTotal" etiqueta={c.aperturaPuntajeTotal} errores={errores}>{entrada("aperturaPuntajeTotal", { type: "number", min: 0, step: "0.01" })}</Campo>
            <Field orientation="horizontal" className="sm:col-span-2">
              <Checkbox id="aperturaDesglosado" checked={desglosado} onCheckedChange={(v) => setDesglosado(Boolean(v))} />
              <FieldLabel htmlFor="aperturaDesglosado">{c.aperturaDesglosado}</FieldLabel>
            </Field>
            {desglosado && (
              <>
                <Campo nombre="aperturaPuntajeExperiencia" etiqueta={c.aperturaPuntajeExperiencia} errores={errores}>{entrada("aperturaPuntajeExperiencia", { type: "number", min: 0, step: "0.01" })}</Campo>
                <Campo nombre="aperturaPuntajeCapacitacion" etiqueta={c.aperturaPuntajeCapacitacion} errores={errores}>{entrada("aperturaPuntajeCapacitacion", { type: "number", min: 0, step: "0.01" })}</Campo>
              </>
            )}
            <Campo nombre="aperturaFechaUltimoBienio" etiqueta={c.aperturaFechaUltimoBienio} errores={errores}>{fecha("aperturaFechaUltimoBienio")}</Campo>
            <Campo nombre="aperturaBieniosReconocidos" etiqueta={c.aperturaBieniosReconocidos} errores={errores}>{entrada("aperturaBieniosReconocidos", { type: "number", min: 0, max: 40 })}</Campo>
            <Campo nombre="aperturaExcedentePendiente" etiqueta={c.aperturaExcedentePendiente} errores={errores}>{entrada("aperturaExcedentePendiente", { type: "number", min: 0, step: "0.01" })}</Campo>
          </FieldGroup>
        )}
      </FieldSet>

      {errorGeneral && (
        <Alert variant="destructive">
          <AlertDescription>{errorGeneral}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/funcionarios")}>{t.cancelar}</Button>
        <Button type="submit" disabled={pendiente} className="h-10 sm:h-8">{pendiente ? t.guardando : t.guardar}</Button>
      </div>
    </form>
  );
}
