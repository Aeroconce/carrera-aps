"use client";

// "Ejecutar respaldo ahora" con confirmación (doc 13 F11.2) y toast con el resultado.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ejecutarRespaldoAction } from "@/lib/acciones/respaldos";
import { formatearTamano } from "@/lib/formato";
import { textosRespaldos as t } from "./textos";

export function BotonRespaldo() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button />}>{t.ejecutar}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.confirmar.titulo}</DialogTitle>
          <DialogDescription>{t.confirmar.texto}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button variant="outline" />}>{t.confirmar.cancelar}</DialogClose>
          <Button
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await ejecutarRespaldoAction();
                if (r.ok && r.data.resultado === "OK") toast.success(t.exito(formatearTamano(r.data.tamano), r.data.duracionSeg));
                else toast.error(r.ok ? t.error : r.error.mensaje);
                setAbierto(false);
                router.refresh();
              })
            }
          >
            {pendiente ? t.ejecutando : t.confirmar.aceptar}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
