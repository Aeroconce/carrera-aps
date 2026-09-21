import type { Metadata } from "next";
import { exigirSesion } from "@/lib/auth/sesion";
import { hoyEnChile, sumarDias } from "@/lib/fechas/civil";
import { AsistenteImportacion } from "./asistente";
import { textosImportar as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Importar (doc 05 §13, doc 08, doc 13 F13, BT 15): carga inicial desde la planilla del Departamento. Solo ADMIN.
export default async function ImportarPage() {
  await exigirSesion({ roles: ["ADMIN"] });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-secundaria">{t.intro}</p>
      </div>
      <AsistenteImportacion fechaSaldosInicial={sumarDias(hoyEnChile(), -1)} />
    </div>
  );
}
