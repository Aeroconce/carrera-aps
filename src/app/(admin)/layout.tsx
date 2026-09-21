import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ShellAdmin } from "@/components/dominio/shell-admin";
import { contarAlertasActivas } from "@/lib/alertas/consulta";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";

// Área administrativa (ADMIN y SUPERVISION). Un FUNCIONARIO va a su portal. Cada página vuelve a exigir sesión.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const sesion = await exigirSesion();
  const rol = rolDe(sesion.user);
  if (rol === "FUNCIONARIO") redirect("/mi-carrera");
  const alertasActivas = sesion.user.institucionId ? await contarAlertasActivas(sesion.user.institucionId) : 0;

  return (
    <ShellAdmin usuario={{ nombre: sesion.user.name, rol }} modoDemo={process.env.NEXT_PUBLIC_MODO_DEMO === "1"} alertasActivas={alertasActivas}>
      {children}
    </ShellAdmin>
  );
}
