"use client";

// Filtros de la bitácora (doc 13 F10): formulario GET con fecha, usuario, entidad, acción, funcionario y texto.

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import type { FiltrosAuditoria } from "@/lib/auditoria/consulta";
import { ACCIONES_AUDITORIA, ETIQUETAS_AUDITORIA } from "@/lib/auditoria/etiquetas";
import { textosAuditoria } from "./textos";

const t = textosAuditoria.filtros;
const claseSelect =
  "h-10 rounded-lg border border-input bg-superficie px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface Props {
  filtros: FiltrosAuditoria;
  usuarios: Array<{ id: string; name: string }>;
  entidades: string[];
  funcionarios: Array<{ id: string; etiqueta: string }>;
}

export function FiltrosAuditoriaForm({ filtros, usuarios, entidades, funcionarios }: Props) {
  const router = useRouter();
  return (
    <form method="get" action="/auditoria" className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-3 md:flex-row md:flex-wrap md:items-end">
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.desde}
        <EntradaNativa type="date" name="desde" defaultValue={filtros.desde ?? ""} className="h-10 w-40" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.hasta}
        <EntradaNativa type="date" name="hasta" defaultValue={filtros.hasta ?? ""} className="h-10 w-40" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.usuario}
        <select name="usuario" defaultValue={filtros.usuarioId ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.entidad}
        <select name="entidad" defaultValue={filtros.entidad ?? ""} className={claseSelect}>
          <option value="">{t.todas}</option>
          {entidades.map((e) => (
            <option key={e} value={e}>{ETIQUETAS_AUDITORIA.entidad[e] ?? e}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.accion}
        <select name="accion" defaultValue={filtros.accion ?? ""} className={claseSelect}>
          <option value="">{t.todas}</option>
          {ACCIONES_AUDITORIA.map((a) => (
            <option key={a} value={a}>{ETIQUETAS_AUDITORIA.accion[a]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria md:min-w-64">
        {t.funcionario}
        <select name="funcionario" defaultValue={filtros.funcionarioId ?? ""} className={claseSelect}>
          <option value="">{t.todos}</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>{f.etiqueta}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-tinta-secundaria">
        {t.q}
        <Input name="q" defaultValue={filtros.q ?? ""} className="h-10 w-44" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="h-10">{t.aplicar}</Button>
        <Button type="button" variant="ghost" className="h-10" onClick={() => router.push("/auditoria")}>{t.limpiar}</Button>
      </div>
    </form>
  );
}
