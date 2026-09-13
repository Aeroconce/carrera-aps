"use client";

// Cambio de contraseña (doc 13, F1 paso 3: obligatorio en el primer ingreso). Better Auth valida la actual,
// guarda la nueva y revoca las otras sesiones; después la server action levanta la marca de primer ingreso
// con auditoría. Al terminar navega a "/" y el servidor decide el destino según el rol.

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { marcarContrasenaCambiada } from "@/lib/acciones/cuenta";
import { POLITICA_ACCESO } from "@/lib/auth/politica";
import { authClient } from "@/lib/auth/cliente";
import { textosAuth } from "../textos";

const t = textosAuth.cambiarContrasena;

const esquema = z
  .object({
    actual: z.string().min(1, { error: t.errores.actualIncorrecta }),
    nueva: z.string().min(POLITICA_ACCESO.largoMinimoPassword, { error: t.errores.corta }),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.nueva === datos.confirmacion, { error: t.errores.noCoincide, path: ["confirmacion"] })
  .refine((datos) => datos.nueva !== datos.actual, { error: t.errores.igual, path: ["nueva"] });

type Campo = "actual" | "nueva" | "confirmacion";
type ErroresCampos = Partial<Record<Campo, string[]>>;

export function FormularioCambiarContrasena({ primerIngreso }: { primerIngreso: boolean }) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);
    const datos = new FormData(evento.currentTarget);
    const resultado = esquema.safeParse({
      actual: String(datos.get("actual") ?? ""),
      nueva: String(datos.get("nueva") ?? ""),
      confirmacion: String(datos.get("confirmacion") ?? ""),
    });
    if (!resultado.success) {
      setErrores(z.flattenError(resultado.error).fieldErrors);
      return;
    }
    setErrores({});
    iniciarTransicion(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: resultado.data.actual,
        newPassword: resultado.data.nueva,
        revokeOtherSessions: true,
      });
      if (error) {
        setErrorGeneral(error.status === 400 ? t.errores.actualIncorrecta : t.errores.conexion);
        return;
      }
      const respuesta = await marcarContrasenaCambiada();
      if (!respuesta.ok) {
        setErrorGeneral(respuesta.error.mensaje);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  const campo = (nombre: Campo, etiqueta: string, autoComplete: string, ayuda?: string) => (
    <Field data-invalid={Boolean(errores[nombre])}>
      <FieldLabel htmlFor={nombre}>{etiqueta}</FieldLabel>
      <Input
        id={nombre}
        name={nombre}
        type="password"
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(errores[nombre])}
        className="h-10 text-base"
      />
      {ayuda && !errores[nombre] && <FieldDescription>{ayuda}</FieldDescription>}
      <FieldError errors={errores[nombre]?.map((message) => ({ message }))} />
    </Field>
  );

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg leading-snug font-medium">{t.titulo}</h1>
        <CardDescription>{primerIngreso ? t.introPrimerIngreso : t.intro}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} noValidate>
          <FieldGroup>
            {campo("actual", t.actual, "current-password")}
            {campo("nueva", t.nueva, "new-password", t.ayudaNueva)}
            {campo("confirmacion", t.confirmacion, "new-password")}

            {errorGeneral && (
              <Alert variant="destructive">
                <AlertDescription>{errorGeneral}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pendiente}>
              {pendiente ? t.guardando : t.guardar}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
