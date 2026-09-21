"use client";

// Filtros del listado: un formulario GET, así la URL es compartible y el servidor filtra. La búsqueda se envía
// al escribir con un pequeño retardo; los selects nativos bastan aquí y funcionan igual en celular.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FiltrosFuncionarios } from "@/lib/carrera/listado";
import { textosFuncionarios } from "./textos";

const t = textosFuncionarios.filtros;
const CATEGORIAS = ["A", "B", "C", "D", "E", "F"];
const CONTRATOS: Array<[string, string]> = [["TITULAR", "Titular"], ["PLAZO_FIJO", "Plazo fijo"], ["REEMPLAZO", "Reemplazo"]];
const ESTADOS: Array<[string, string]> = [["ACTIVO", "Activos"], ["INACTIVO", "Inactivos"], ["TODOS", "Todos"]];

const claseSelect =
  "h-10 rounded-lg border border-input bg-superficie px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FiltrosFuncionariosForm({ filtros, establecimientos }: { filtros: FiltrosFuncionarios; establecimientos: Array<{ id: string; nombre: string }> }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(filtros.q ?? "");
  const primera = useRef(true);

  // Búsqueda al escribir, con retardo para no recargar en cada tecla
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const id = setTimeout(() => {
      const nuevos = new URLSearchParams(params.toString());
      if (q.trim()) nuevos.set("q", q.trim());
      else nuevos.delete("q");
      router.replace(`/funcionarios?${nuevos.toString()}`);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <form method="get" action="/funcionarios" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
      <label className="flex flex-1 flex-col gap-1 text-xs text-tinta-secundaria md:min-w-56">
        {textosFuncionarios.buscar}
        <Input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="12.345.678-5 o apellido" className="h-10" />
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
        {t.categoria}
        <select name="categoria" defaultValue={filtros.categoria ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
        <select name="estado" defaultValue={filtros.estado ?? "ACTIVO"} className={claseSelect}>
          {ESTADOS.map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="h-10">{t.aplicar}</Button>
        <Button type="button" variant="ghost" className="h-10" onClick={() => { setQ(""); router.replace("/funcionarios"); }}>{t.limpiar}</Button>
      </div>
    </form>
  );
}
