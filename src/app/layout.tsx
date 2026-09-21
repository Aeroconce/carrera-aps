import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Una sola familia tipográfica (doc 12). next/font la descarga en build y la sirve desde el propio servidor:
// ninguna petición a terceros en tiempo de ejecución (doc 10, BA 24c).
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Carrera APS",
    template: "%s · Carrera APS",
  },
  description: "Sistema de Gestión de Carrera Funcionaria APS (Ley 19.378)",
};

// Props explícitas: LayoutProps es un tipo global que Next genera al correr `next dev` o `next typegen` y no
// existe en un entorno limpio (CI, servidor antes del primer build).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-right" richColors={false} />
      </body>
    </html>
  );
}
