"use client";

// Filtros de un reporte (doc 06): un formulario GET, así cada reporte es un enlace reproducible. El alcance
// decide qué selector secundario se muestra; los selects nativos funcionan igual en celular.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import type { Alcance, FiltrosReporte } from "@/lib/reportes/filtros";
import { textosReportes } from "../textos";

const t = textosReportes.filtros;
const CATEGORIAS = ["A", "B", "C", "D", "E", "F"];
const CONTRATOS: Array<[string, string]> = [["TITULAR", "Titular"], ["PLAZO_FIJO", "Plazo fijo"], ["REEMPLAZO", "Reemplazo"]];

const claseSelect =
  "h-10 rounded-lg border border-input bg-superficie px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface Props {
  reporteId: string;
  filtros: FiltrosReporte;
  establecimientos: Array<{ id: string; nombre: string }>;
  funcionarios: Array<{ id: string; etiqueta: string }>;
}

export function FiltrosReporteForm({ reporteId, filtros, establecimientos, funcionarios }: Props) {
  const router = useRouter();
  const [alcance, setAlcance] = useState<Alcance>(filtros.alcance);
  const accion = `/reportes/${reporteId}`;

  return (
    <form method="get" action={accion} className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.alcance}
        <select name="alcance" value={alcance} onChange={(e) => setAlcance(e.target.value as Alcance)} className={claseSelect}>
          <option value="dotacion">{t.alcances.dotacion}</option>
          <option value="establecimiento">{t.alcances.establecimiento}</option>
          <option value="funcionario">{t.alcances.funcionario}</option>
        </select>
      </label>
      {alcance === "establecimiento" && (
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-56">
          {t.establecimiento}
          <select name="establecimiento" defaultValue={filtros.establecimientoId ?? ""} required className={claseSelect}>
            <option value="">{t.elegir}</option>
            {establecimientos.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </label>
      )}
      {alcance === "funcionario" && (
        <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-72">
          {t.funcionario}
          <select name="funcionario" defaultValue={filtros.funcionarioId ?? ""} required className={claseSelect}>
            <option value="">{t.elegir}</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>{f.etiqueta}</option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.fecha}
        <EntradaNativa type="date" name="fecha" defaultValue={filtros.fecha} required className="h-10 w-44" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.categoria}
        <select name="categoria" defaultValue={filtros.categoria ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.nivel}
        <EntradaNativa type="number" name="nivel" min={1} max={99} defaultValue={filtros.nivel ?? ""} className="h-10 w-20" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.tipoContrato}
        <select name="tipoContrato" defaultValue={filtros.tipoContrato ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {CONTRATOS.map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.estado}
        <select name="estado" defaultValue={filtros.estado} className={claseSelect}>
          {(["ACTIVO", "INACTIVO", "TODOS"] as const).map((valor) => (
            <option key={valor} value={valor}>{t.estados[valor]}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="h-10">{t.aplicar}</Button>
        <Button type="button" variant="ghost" className="h-10" onClick={() => router.push(accion)}>{t.limpiar}</Button>
      </div>
    </form>
  );
}
