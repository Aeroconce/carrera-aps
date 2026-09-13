import type { Metadata } from "next";
import { textosAuth } from "../textos";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: textosAuth.login.titulo };

// Si ya hay sesión, el proxy (src/proxy.ts) redirige a "/" antes de llegar aquí.
export default function LoginPage() {
  return <FormularioLogin />;
}
