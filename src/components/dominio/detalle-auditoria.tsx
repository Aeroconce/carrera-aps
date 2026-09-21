"use client";

// Detalle de una entrada de auditoría (doc 13 F10): diálogo con los campos cambiados, valor anterior y nuevo
// lado a lado. Recibe las filas ya calculadas en el servidor (src/lib/auditoria/detalle.ts).

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { FilaCambio } from "@/lib/auditoria/detalle";

interface Props {
  filas: FilaCambio[];
  titulo: string;
  descripcion?: string;
  textos: { boton: string; campo: string; antes: string; despues: string; cerrar: string; sinCambios: string };
}

export function DetalleAuditoria({ filas, titulo, descripcion, textos }: Props) {
  if (filas.length === 0) return <span className="text-xs text-tinta-secundaria">{textos.sinCambios}</span>;
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="xs" />}>{textos.boton}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {/* Región desplazable accesible por teclado (axe: scrollable-region-focusable) */}
        <div className="overflow-x-auto rounded-lg border border-linea" role="region" aria-label={titulo} tabIndex={0}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linea bg-fondo text-left text-xs text-tinta-secundaria">
                <th scope="col" className="px-3 py-2 font-medium">{textos.campo}</th>
                <th scope="col" className="px-3 py-2 font-medium">{textos.antes}</th>
                <th scope="col" className="px-3 py-2 font-medium">{textos.despues}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.campo} className="border-b border-linea align-top last:border-0">
                  <td className="px-3 py-1.5 font-medium">{f.etiqueta}</td>
                  <td className="max-w-56 px-3 py-1.5 break-words text-tinta-secundaria">{f.antes}</td>
                  <td className="max-w-56 px-3 py-1.5 break-words">{f.despues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <DialogClose render={<Button variant="outline" />}>{textos.cerrar}</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
