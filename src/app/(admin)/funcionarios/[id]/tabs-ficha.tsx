"use client";

// Pestañas de la ficha (doc 05 módulo 2, doc 12): el contenido llega renderizado desde el servidor; aquí solo
// vive la interacción. La lista de pestañas se desplaza horizontalmente en celular.

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PestanaFicha {
  valor: string;
  etiqueta: string;
  contenido: ReactNode;
}

export function TabsFicha({ pestanas, inicial }: { pestanas: PestanaFicha[]; inicial: string }) {
  return (
    <Tabs defaultValue={inicial} className="gap-4">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <TabsList className="w-max">
          {pestanas.map((p) => (
            <TabsTrigger key={p.valor} value={p.valor}>
              {p.etiqueta}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {pestanas.map((p) => (
        <TabsContent key={p.valor} value={p.valor}>
          {p.contenido}
        </TabsContent>
      ))}
    </Tabs>
  );
}
