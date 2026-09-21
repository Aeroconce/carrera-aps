"use client";

// Acciones del módulo Alertas: atender y descartar (diálogo con nota) y sincronizar a demanda.

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { DialogoFormulario } from "@/components/dominio/dialogo-formulario";
import { Button } from "@/components/ui/button";
import { atenderAlertaAction, descartarAlertaAction, sincronizarAlertasAction } from "@/lib/acciones/alertas";
import { textosAlertas as t } from "./textos";

export function AccionesAlerta({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <DialogoFormulario
        titulo={t.atender.titulo}
        descripcion={t.atender.descripcion}
        textoBoton={t.atender.boton}
        tamanoBoton="xs"
        campos={[{ nombre: "nota", etiqueta: t.atender.nota, tipo: "textarea", requerido: true }]}
        accion={atenderAlertaAction.bind(null, id)}
        textoEnviar={t.atender.enviar}
        exito={t.atender.exito}
      />
      <DialogoFormulario
        titulo={t.descartar.titulo}
        descripcion={t.descartar.descripcion}
        textoBoton={t.descartar.boton}
        varianteBoton="outline"
        tamanoBoton="xs"
        campos={[{ nombre: "nota", etiqueta: t.descartar.nota, tipo: "textarea", requerido: true }]}
        accion={descartarAlertaAction.bind(null, id)}
        textoEnviar={t.descartar.enviar}
        exito={t.descartar.exito}
      />
    </div>
  );
}

export function BotonSincronizar() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await sincronizarAlertasAction();
          if (r.ok) {
            toast.success(t.sincronizada(r.data.nuevas, r.data.resueltas));
            router.refresh();
          } else {
            toast.error(r.error.mensaje);
          }
        })
      }
    >
      {pendiente ? t.sincronizando : t.sincronizar}
    </Button>
  );
}
