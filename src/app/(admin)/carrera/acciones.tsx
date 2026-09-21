"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recalcularAction } from "@/lib/acciones/carrera";
import { textosCarrera as t } from "./textos";

export function BotonRecalcular() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await recalcularAction();
          if (r.ok) {
            toast.success(t.recalculado(r.data.activas));
            router.refresh();
          } else {
            toast.error(r.error.mensaje);
          }
        })
      }
    >
      {pendiente ? t.recalculando : t.recalcular}
    </Button>
  );
}
