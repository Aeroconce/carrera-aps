import type { Metadata } from "next";
import { exigirSesion } from "@/lib/auth/sesion";
import { textosAuth } from "../textos";
import { FormularioCambiarContrasena } from "./formulario-cambiar-contrasena";

export const metadata: Metadata = { title: textosAuth.cambiarContrasena.titulo };

export default async function CambiarContrasenaPage() {
  const sesion = await exigirSesion({ permitirCambioPendiente: true });
  return <FormularioCambiarContrasena primerIngreso={Boolean(sesion.user.debeCambiarPassword)} />;
}
