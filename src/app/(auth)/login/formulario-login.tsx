"use client";

// Formulario de inicio de sesión (doc 13, F1). Valida en el cliente con Zod antes de llamar a Better Auth y
// traduce cada error a un mensaje del glosario. Tras entrar, navega a "/" y el servidor decide el destino:
// cambio de contraseña pendiente, portal del funcionario o inicio administrativo (exigirSesion).

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/cliente";
import { textosAuth } from "../textos";

const t = textosAuth.login;

const esquemaLogin = z.object({
  email: z.email({ error: t.errores.correoInvalido }),
  password: z.string().min(1, { error: t.errores.contrasenaVacia }),
});

type ErroresCampos = Partial<Record<"email" | "password", string[]>>;

function mensajeDeError(error: { status?: number; code?: string }): string {
  if (error.status === 429) return t.errores.intentos;
  if (error.code === "BANNED_USER") return t.errores.desactivada;
  if (error.status === 401 || error.status === 400) return t.errores.credenciales;
  return t.errores.conexion;
}

export function FormularioLogin() {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);
    const datos = new FormData(evento.currentTarget);
    const resultado = esquemaLogin.safeParse({
      email: String(datos.get("email") ?? "").trim(),
      password: String(datos.get("password") ?? ""),
    });
    if (!resultado.success) {
      setErrores(z.flattenError(resultado.error).fieldErrors);
      return;
    }
    setErrores({});
    iniciarTransicion(async () => {
      const { error } = await authClient.signIn.email({
        email: resultado.data.email,
        password: resultado.data.password,
      });
      if (error) {
        setErrorGeneral(mensajeDeError(error));
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg leading-snug font-medium">{t.titulo}</h1>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errores.email)}>
              <FieldLabel htmlFor="email">{t.correo}</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                aria-invalid={Boolean(errores.email)}
                className="h-10 text-base"
              />
              <FieldError errors={errores.email?.map((message) => ({ message }))} />
            </Field>

            <Field data-invalid={Boolean(errores.password)}>
              <FieldLabel htmlFor="password">{t.contrasena}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={Boolean(errores.password)}
                className="h-10 text-base"
              />
              <FieldError errors={errores.password?.map((message) => ({ message }))} />
            </Field>

            {errorGeneral && (
              <Alert variant="destructive">
                <AlertDescription>{errorGeneral}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pendiente}>
              {pendiente ? t.entrando : t.entrar}
            </Button>

            <Field>
              <Button
                type="button"
                variant="link"
                className="h-auto w-fit px-0 text-sm"
                aria-expanded={mostrarAyuda}
                aria-controls="ayuda-contrasena"
                onClick={() => setMostrarAyuda((valor) => !valor)}
              >
                {t.olvido}
              </Button>
              {mostrarAyuda && <FieldDescription id="ayuda-contrasena">{t.olvidoInfo}</FieldDescription>}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
