import type { Metadata } from "next";
import Link from "next/link";
import { exigirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db/prisma";
import { FormularioNuevoFuncionario } from "./formulario";
import { textosNuevo as t } from "./textos";

export const metadata: Metadata = { title: t.titulo };

// Alta de funcionario (doc 05 módulo 2). Con "saldo de apertura" cubre la carga individual de un funcionario
// que llega con puntaje reconocido (doc 04 §0), el mismo movimiento que hace el importador en masa.
export default async function NuevoFuncionarioPage() {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const establecimientos = await prisma.establecimiento.findMany({
    where: { institucionId: sesion.user.institucionId!, activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <nav className="text-xs text-tinta-secundaria">
        <Link href="/funcionarios" className="hover:underline">{t.volver}</Link>
      </nav>
      <h1 className="text-xl font-semibold">{t.titulo}</h1>
      <FormularioNuevoFuncionario establecimientos={establecimientos} />
    </div>
  );
}
