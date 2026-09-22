"use client";

// Filtros del módulo Alertas: formulario GET (URL compartible). Selects nativos, iguales en celular.

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TIPOS_ALERTA, type FiltrosAlertas } from "@/lib/alertas/tipos";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import { textosAlertas } from "./textos";
import { SelectorFecha } from "@/components/dominio/selector-fecha";

const t = textosAlertas.filtros;
const claseSelect =
  "h-10 rounded-lg border border-input bg-superficie px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FiltrosAlertasForm({ filtros, establecimientos }: { filtros: FiltrosAlertas; establecimientos: Array<{ id: string; nombre: string }> }) {
  const router = useRouter();
  return (
    <form method="get" action="/alertas" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-48">
        {t.buscar}
        <Input name="q" defaultValue={filtros.q ?? ""} placeholder="RUT o apellido" className="h-10" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.tipo}
        <select name="tipo" defaultValue={filtros.tipo ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {TIPOS_ALERTA.map((tipo) => (
            <option key={tipo} value={tipo}>{ETIQUETAS.tipoAlerta[tipo]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.establecimiento}
        <select name="establecimiento" defaultValue={filtros.establecimientoId ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {establecimientos.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.estado}
        <select name="estado" defaultValue={filtros.estado} className={claseSelect}>
          <option value="ACTIVA">{textosAlertas.estados.ACTIVA}</option>
          <option value="ATENDIDA">{textosAlertas.estados.ATENDIDA}</option>
          <option value="DESCARTADA">{textosAlertas.estados.DESCARTADA}</option>
          <option value="TODAS">{t.todas}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.desde}
        <SelectorFecha name="desde" defaultValue={filtros.desde ?? ""} className="w-44" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.hasta}
        <SelectorFecha name="hasta" defaultValue={filtros.hasta ?? ""} className="w-44" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="h-10">{t.aplicar}</Button>
        <Button type="button" variant="ghost" className="h-10" onClick={() => router.push("/alertas")}>{t.limpiar}</Button>
      </div>
    </form>
  );
}
