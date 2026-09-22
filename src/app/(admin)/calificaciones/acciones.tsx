"use client";

// Botones de acción del módulo (una server action, toast con el resultado y refresco): estado del proceso,
// quitar integrante, eliminar factor y copiar factores de otro proceso.

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button, type buttonVariants } from "@/components/ui/button";
import { cambiarEstadoProcesoAction, copiarFactoresAction, eliminarFactorAction, quitarIntegranteAction } from "@/lib/acciones/calificaciones";
import type { RespuestaAccion } from "@/lib/acciones/tipos";
import type { VariantProps } from "class-variance-authority";
import { textosCalificaciones as t } from "./textos";

function BotonAccion({
  etiqueta,
  ariaLabel,
  ejecutar,
  exito,
  variante = "outline",
}: {
  etiqueta: string;
  ariaLabel?: string;
  ejecutar: () => Promise<RespuestaAccion<unknown>>;
  exito: string | ((data: unknown) => string);
  variante?: VariantProps<typeof buttonVariants>["variant"];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant={variante}
      size="xs"
      disabled={pendiente}
      aria-label={ariaLabel}
      onClick={() =>
        iniciar(async () => {
          const r = await ejecutar();
          if (r.ok) {
            toast.success(typeof exito === "function" ? exito(r.data) : exito);
            router.refresh();
          } else {
            toast.error(r.error.mensaje);
          }
        })
      }
    >
      {etiqueta}
    </Button>
  );
}

export function BotonEstadoProceso({ id, estado }: { id: string; estado: "ABIERTO" | "CERRADO" }) {
  const destino = estado === "ABIERTO" ? "CERRADO" : "ABIERTO";
  return <BotonAccion etiqueta={estado === "ABIERTO" ? t.cerrar : t.reabrir} ejecutar={() => cambiarEstadoProcesoAction(id, destino)} exito={destino === "CERRADO" ? t.cerrado : t.reabierto} />;
}

export function BotonQuitarIntegrante({ id, nombre }: { id: string; nombre: string }) {
  return <BotonAccion etiqueta={t.comision.quitar} ariaLabel={`${t.comision.quitar} a ${nombre}`} ejecutar={() => quitarIntegranteAction(id)} exito={t.comision.quitado} />;
}

export function BotonEliminarFactor({ id, nombre }: { id: string; nombre: string }) {
  return <BotonAccion etiqueta={t.factores.quitar} ariaLabel={`${t.factores.quitar} ${nombre}`} ejecutar={() => eliminarFactorAction(id)} exito={t.factores.quitado} />;
}

export function BotonCopiarFactores({ procesoId, origenId, origenNombre }: { procesoId: string; origenId: string; origenNombre: string }) {
  return (
    <BotonAccion
      etiqueta={t.factores.copiar(origenNombre)}
      variante="default"
      ejecutar={() => copiarFactoresAction(procesoId, origenId)}
      exito={(data) => t.factores.copiados((data as { copiados: number }).copiados)}
    />
  );
}
