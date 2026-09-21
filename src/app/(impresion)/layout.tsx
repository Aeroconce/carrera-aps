import type { ReactNode } from "react";

// Vistas de impresión (doc 10): sin barra lateral ni sesión; las abre Chromium en el servidor con un token firmado.
export default function ImpresionLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-full bg-superficie p-6 text-tinta print:p-0">{children}</main>;
}
