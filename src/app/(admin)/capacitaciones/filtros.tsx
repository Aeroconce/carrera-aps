"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FiltrosCapacitaciones } from "@/lib/capacitaciones/consulta";
import { textosCapacitaciones } from "./textos";

const t = textosCapacitaciones.filtros;
const claseSelect =
  "h-10 rounded-lg border border-input bg-superficie px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface Props {
  filtros: FiltrosCapacitaciones;
  establecimientos: Array<{ id: string; nombre: string }>;
  periodos: number[];
}

export function FiltrosCapacitacionesForm({ filtros, establecimientos, periodos }: Props) {
  const router = useRouter();
  return (
    <form method="get" action="/capacitaciones" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-48">
        {t.buscar}
        <Input name="q" defaultValue={filtros.q ?? ""} placeholder="RUT o apellido" className="h-10" />
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
        {t.periodo}
        <select name="periodo" defaultValue={filtros.periodo ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {periodos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.aprobada}
        <select name="aprobada" defaultValue={filtros.aprobado === undefined ? "" : filtros.aprobado ? "si" : "no"} className={claseSelect}>
          <option value="">{t.todas}</option>
          <option value="si">{t.si}</option>
          <option value="no">{t.no}</option>
        </select>
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="h-10">{t.aplicar}</Button>
        <Button type="button" variant="ghost" className="h-10" onClick={() => router.push("/capacitaciones")}>{t.limpiar}</Button>
      </div>
    </form>
  );
}
