// Encabezado de un reporte (doc 06): institución, "Situación al", alcance, filtros, quién y cuándo lo generó y
// las reglas aplicadas a esa fecha. El mismo bloque va en pantalla y en el PDF.

import { formatearChileno } from "@/lib/fechas/civil";
import { formatearFechaHora } from "@/lib/formato";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import type { ContextoReporte } from "@/lib/reportes/tipos";
import { cn } from "@/lib/utils";

interface Props {
  contexto: ContextoReporte;
  textos: { situacion: (fecha: string) => string; reglas: string; generado: (fecha: string, usuario: string) => string; funcionarios: (n: number) => string };
  imprimir?: boolean;
}

export function EncabezadoReporte({ contexto: c, textos, imprimir = false }: Props) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4 text-sm", imprimir && "rounded-none border-0 border-b p-0 pb-3 text-xs")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={cn("font-semibold text-institucional", imprimir ? "text-sm" : "text-base")}>{textos.situacion(formatearChileno(c.fechaCorte))}</p>
        <p className="text-tinta-secundaria">{c.institucion}</p>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-tinta-secundaria">
        <div className="flex gap-1">
          <dt className="font-medium text-tinta">Alcance:</dt>
          <dd>
            {c.alcance} · {textos.funcionarios(c.totalFuncionarios)}
          </dd>
        </div>
        {c.filtros.map((f) => (
          <div key={f.etiqueta} className="flex gap-1">
            <dt className="font-medium text-tinta">{f.etiqueta}:</dt>
            <dd>{f.valor}</dd>
          </div>
        ))}
        <div className="flex gap-1">
          <dd>{textos.generado(formatearFechaHora(c.generadoEl), c.generadoPor)}</dd>
        </div>
      </dl>
      {c.reglas.length > 0 && (
        <details className={cn("text-xs text-tinta-secundaria", imprimir && "hidden")}>
          <summary className="cursor-pointer font-medium text-tinta">{textos.reglas}</summary>
          <ul className="mt-1 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {c.reglas.map((r) => (
              <li key={`${r.tipo}-${r.categoria ?? ""}`}>
                {ETIQUETAS.tipoRegla[r.tipo as keyof typeof ETIQUETAS.tipoRegla] ?? r.tipo}
                {r.categoria ? ` (cat. ${r.categoria})` : ""}: desde {formatearChileno(r.vigenteDesde)} · {r.fuente}
              </li>
            ))}
          </ul>
        </details>
      )}
      {imprimir && c.reglas.length > 0 && (
        <p className="text-[9px] text-tinta-secundaria">
          {textos.reglas}: {c.reglas.map((r) => `${ETIQUETAS.tipoRegla[r.tipo as keyof typeof ETIQUETAS.tipoRegla] ?? r.tipo} desde ${formatearChileno(r.vigenteDesde)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
