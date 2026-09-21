import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { exigirSesion } from "@/lib/auth/sesion";
import { DEFINICIONES } from "@/lib/reportes/definiciones";
import { textosReportes as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Índice de reportes (doc 05 módulo 8): los nueve de las bases, numerados, y el panel de alertas (subcriterio 13).
export default async function ReportesPage() {
  await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const reportes = DEFINICIONES.filter((d) => d.numero > 0).sort((a, b) => a.numero - b.numero);
  const panel = DEFINICIONES.find((d) => d.id === "alertas");
  // La tarjeta del panel va sobre el fondo institucional suave: ahí solo la tinta principal cumple AA (doc 12)
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reportes.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4">
            <p className="text-xs font-medium text-tinta-secundaria">{r.numero}</p>
            <h2 className="text-base font-medium">{r.nombre}</h2>
            <p className="flex-1 text-sm text-tinta-secundaria">{r.descripcion}</p>
            <Link href={`/reportes/${r.id}`} className={buttonVariants({ variant: "outline", className: "self-start" })}>
              {t.abrir}
            </Link>
          </li>
        ))}
        {panel && (
          <li className="flex flex-col gap-2 rounded-lg border border-institucional bg-institucional-suave p-4 text-tinta">
            <p className="text-xs font-medium">{t.panel}</p>
            <h2 className="text-base font-medium">{panel.nombre}</h2>
            <p className="flex-1 text-sm">{panel.descripcion}</p>
            <Link href={`/reportes/${panel.id}`} className={buttonVariants({ className: "self-start" })}>
              {t.abrir}
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
