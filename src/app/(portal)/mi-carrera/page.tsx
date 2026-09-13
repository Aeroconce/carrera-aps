import type { Metadata } from "next";
import { BotonCerrarSesion } from "@/components/dominio/boton-cerrar-sesion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirSesion } from "@/lib/auth/sesion";
import { textosPortal } from "../textos";

export const metadata: Metadata = { title: textosPortal.titulo };

// Portal del funcionario (BT 10, doc 05 módulo 15): solo lo propio, pensado para celular. Por ahora, el marco.
export default async function MiCarreraPage() {
  const sesion = await exigirSesion({ roles: ["FUNCIONARIO"] });

  return (
    <div className="mx-auto w-full max-w-portal px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{textosPortal.titulo}</h1>
          <p className="text-tinta-secundaria">{sesion.user.name}</p>
        </div>
        <BotonCerrarSesion />
      </header>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{textosPortal.proximamente.titulo}</CardTitle>
          <CardDescription>{textosPortal.proximamente.texto}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
