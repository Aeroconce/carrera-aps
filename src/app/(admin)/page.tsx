import { redirect } from "next/navigation";
import { BotonCerrarSesion } from "@/components/dominio/boton-cerrar-sesion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { textosInicio } from "./textos";

// Inicio (doc 05, módulo 1). Por ahora solo la cabecera y el marco: los contadores llegan con el panel.
export default async function InicioPage() {
  const sesion = await exigirSesion();
  const rol = rolDe(sesion.user);
  if (rol === "FUNCIONARIO") redirect("/mi-carrera");

  return (
    <div className="mx-auto w-full max-w-contenido px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{textosInicio.titulo}</h1>
          <p className="text-tinta-secundaria">
            {sesion.user.name} · {textosInicio.roles[rol]}
          </p>
        </div>
        <BotonCerrarSesion />
      </header>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{textosInicio.proximamente.titulo}</CardTitle>
          <CardDescription>{textosInicio.proximamente.texto}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
