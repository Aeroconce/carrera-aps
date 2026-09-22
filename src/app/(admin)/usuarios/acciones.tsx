"use client";

// Acciones del módulo Usuarios: crear (muestra la contraseña temporal una sola vez), restablecer, desactivar.

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { claseSelect } from "@/components/dominio/dialogo-formulario";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cambiarEstadoUsuarioAction, crearUsuarioAction, restablecerContrasenaAction } from "@/lib/acciones/usuarios";
import { textosUsuarios as t } from "./textos";

const ROLES = ["ADMIN", "SUPERVISION", "FUNCIONARIO"] as const;

function ContrasenaTemporal({ valor }: { valor: string }) {
  return (
    <p className="rounded-lg border border-linea bg-fondo px-3 py-2 font-mono text-base tracking-wide select-all" data-testid="contrasena-temporal">
      {valor}
    </p>
  );
}

export function NuevoUsuario({ funcionarios }: { funcionarios: Array<{ id: string; etiqueta: string }> }) {
  const router = useRouter();
  const d = t.dialogoNuevo;
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [rol, setRol] = useState<string>("SUPERVISION");
  const [creado, setCreado] = useState<{ email: string; password: string } | null>(null);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fd = new FormData(evento.currentTarget);
    setErrorGeneral(null);
    iniciar(async () => {
      const r = await crearUsuarioAction(fd);
      if (!r.ok) {
        setErrores(r.error.campos ?? {});
        setErrorGeneral(r.error.campos ? null : r.error.mensaje);
        return;
      }
      setErrores({});
      setCreado({ email: r.data.email, password: r.data.password });
      router.refresh();
    });
  }
  const invalido = (campo: string) => Boolean(errores[campo]?.length);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) {
          setErrores({});
          setErrorGeneral(null);
          setCreado(null);
        }
      }}
    >
      <DialogTrigger render={<Button />}>{t.nuevo}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {creado ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.creado.titulo}</DialogTitle>
              <DialogDescription>{t.creado.texto(creado.email)}</DialogDescription>
            </DialogHeader>
            <ContrasenaTemporal valor={creado.password} />
            <div className="flex justify-end">
              <DialogClose render={<Button />}>{t.creado.cerrar}</DialogClose>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{d.titulo}</DialogTitle>
              <DialogDescription>{d.descripcion}</DialogDescription>
            </DialogHeader>
            <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={invalido("name")} className="sm:col-span-2">
                  <FieldLabel htmlFor="name">{d.nombre}</FieldLabel>
                  <Input id="name" name="name" required aria-invalid={invalido("name")} className="h-9" />
                  <FieldError errors={errores.name?.map((message) => ({ message }))} />
                </Field>
                <Field data-invalid={invalido("email")}>
                  <FieldLabel htmlFor="email">{d.correo}</FieldLabel>
                  <Input id="email" name="email" type="email" required aria-invalid={invalido("email")} className="h-9" />
                  <FieldError errors={errores.email?.map((message) => ({ message }))} />
                </Field>
                <Field data-invalid={invalido("role")}>
                  <FieldLabel htmlFor="role">{d.rol}</FieldLabel>
                  <select id="role" name="role" value={rol} onChange={(e) => setRol(e.target.value)} className={claseSelect}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{t.roles[r]}</option>
                    ))}
                  </select>
                  <FieldError errors={errores.role?.map((message) => ({ message }))} />
                </Field>
                {rol === "FUNCIONARIO" && (
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
              </FieldGroup>
              {errorGeneral && (
                <Alert variant="destructive">
                  <AlertDescription>{errorGeneral}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <DialogClose render={<Button type="button" variant="outline" />}>{d.cancelar}</DialogClose>
                <Button type="submit" disabled={pendiente} className="h-10 sm:h-8">{pendiente ? d.creando : d.enviar}</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RestablecerContrasena({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  return (
    <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) setPassword(null); }}>
      <DialogTrigger render={<Button variant="outline" size="xs" />}>{t.restablecer}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{password ? t.restablecida.titulo : t.restablecer}</DialogTitle>
          <DialogDescription>{password ? t.restablecida.texto(email) : email}</DialogDescription>
        </DialogHeader>
        {password ? (
          <>
            <ContrasenaTemporal valor={password} />
            <div className="flex justify-end">
              <DialogClose render={<Button />}>{t.restablecida.cerrar}</DialogClose>
            </div>
          </>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose render={<Button variant="outline" />}>{t.dialogoNuevo.cancelar}</DialogClose>
            <Button
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await restablecerContrasenaAction(id);
                  if (r.ok) {
                    setPassword(r.data.password);
                    router.refresh();
                  } else {
                    toast.error(r.error.mensaje);
                  }
                })
              }
            >
              {t.restablecer}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BotonEstadoUsuario({ id, activo }: { id: string; activo: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await cambiarEstadoUsuarioAction(id, !activo);
          if (r.ok) {
            toast.success(activo ? t.estadoCambiado.desactivada : t.estadoCambiado.reactivada);
            router.refresh();
          } else {
            toast.error(r.error.mensaje);
          }
        })
      }
    >
      {activo ? t.desactivar : t.reactivar}
    </Button>
  );
}
