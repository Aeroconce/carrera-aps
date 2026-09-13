import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { textosAuth } from "../textos";

export const metadata: Metadata = { title: textosAuth.sinPermiso.titulo };

// Estado "sin permiso" con mensaje claro, no un redireccionamiento mudo (doc 12).
export default function SinPermisoPage() {
  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg leading-snug font-medium">{textosAuth.sinPermiso.titulo}</h1>
        <CardDescription>{textosAuth.sinPermiso.texto}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {textosAuth.sinPermiso.volver}
        </Link>
      </CardContent>
    </Card>
  );
}
