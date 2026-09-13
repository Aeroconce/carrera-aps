"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { textosAuth } from "@/app/(auth)/textos";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/cliente";

export function BotonCerrarSesion() {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pendiente}
      onClick={() =>
        iniciarTransicion(async () => {
          await authClient.signOut();
          router.replace("/login");
          router.refresh();
        })
      }
    >
      {textosAuth.sesion.cerrar}
    </Button>
  );
}
