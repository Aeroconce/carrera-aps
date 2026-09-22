"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cambiarEstadoProcesoAction } from "@/lib/acciones/calificaciones";
import { textosCalificaciones as t } from "./textos";

export function BotonEstadoProceso({ id, estado }: { id: string; estado: "ABIERTO" | "CERRADO" }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const destino = estado === "ABIERTO" ? "CERRADO" : "ABIERTO";
  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await cambiarEstadoProcesoAction(id, destino);
          if (r.ok) {
            toast.success(destino === "CERRADO" ? t.cerrado : t.reabierto);
            router.refresh();
          } else {
            toast.error(r.error.mensaje);
          }
        })
      }
    >
      {estado === "ABIERTO" ? t.cerrar : t.reabrir}
    </Button>
  );
}
