import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RielCarrera } from "@/components/dominio/riel-carrera";
import { Badge } from "@/components/ui/badge";
import { exigirSesion, rolDe } from "@/lib/auth/sesion";
import { carreraDeFuncionario } from "@/lib/carrera/funcionario";
import { ordenarAlertas } from "@/lib/carrera/listado";
import { prisma } from "@/lib/db/prisma";
import { formatearRut, nombreCompleto } from "@/lib/formato";
import { generarAlertas } from "@/lib/motor/alertas";
import {
  DialogoBaja,
  DialogoCambioNivel,
  DialogoCapacitacion,
  DialogoEditarDatos,
  DialogoEstudio,
  DialogoExperiencia,
  DialogoReconocerBienio,
} from "./acciones";
import {
  SeccionAlertas,
  SeccionCapacitaciones,
  SeccionDatos,
  SeccionEstudios,
  SeccionExperiencia,
  SeccionHistorial,
  SeccionNivel,
} from "./secciones";
import { SeccionCalificaciones } from "./seccion-calificaciones";
import { SeccionDocumentos } from "./seccion-documentos";
import { TabsFicha } from "./tabs-ficha";
import { textosFuncionarios } from "../textos";

const t = textosFuncionarios.ficha;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const f = await prisma.funcionario.findUnique({ where: { id }, select: { nombres: true, apellidos: true } });
  return { title: f ? nombreCompleto(f) : textosFuncionarios.titulo };
}

// Ficha del funcionario (doc 05 módulo 2, BT 4.1): cabecera con el riel de carrera siempre visible y pestañas.
export default async function FichaFuncionarioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pestana?: string }> }) {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const { id } = await params;
  const { pestana } = await searchParams;
  const carrera = await carreraDeFuncionario(id);
  if (!carrera || carrera.funcionario.institucionId !== sesion.user.institucionId) notFound();

  const { funcionario: f, estado, reglas } = carrera;
  const puedeEditar = rolDe(sesion.user) === "ADMIN" && f.estado === "ACTIVO";
  const alertas = ordenarAlertas(generarAlertas(estado, reglas));
  const idsHijos = [
    f.id,
    ...f.bienios.map((b) => b.id),
    ...f.capacitaciones.map((c) => c.id),
    ...f.estudios.map((e) => e.id),
    ...f.niveles.map((n) => n.id),
    ...f.experiencias.map((e) => e.id),
    ...(f.apertura ? [f.apertura.id] : []),
  ];
  const [historial, establecimientos] = await Promise.all([
    prisma.auditoria.findMany({
      where: { entidadId: { in: idsHijos } },
      include: { usuario: { select: { name: true } } },
      orderBy: { fecha: "desc" },
      take: 200,
    }),
    prisma.establecimiento.findMany({ where: { institucionId: f.institucionId, activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <nav className="text-xs text-tinta-secundaria">
        <Link href="/funcionarios" className="hover:underline">{t.volver}</Link>
      </nav>

      <header className="flex flex-col gap-4 rounded-lg border border-linea bg-superficie p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{nombreCompleto(f)}</h1>
            <p className="text-sm text-tinta-secundaria">
              {formatearRut(f.rut)} · {f.cargo ?? ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">Categoría {f.categoria}</Badge>
            <Badge variant="outline">{f.establecimiento.nombre}</Badge>
            <Badge variant="outline">{t.contrato[f.tipoContrato]}</Badge>
            {f.estado === "INACTIVO" && <Badge className="bg-error text-white">{t.estado.INACTIVO}</Badge>}
          </div>
        </div>
        <RielCarrera estado={estado} />
      </header>

      <TabsFicha
        inicial={pestana ?? "datos"}
        pestanas={[
          {
            valor: "datos",
            etiqueta: t.pestanas.datos,
            contenido: (
              <SeccionDatos
                carrera={carrera}
                acciones={
                  puedeEditar && (
                    <div className="flex gap-2">
                      <DialogoEditarDatos carrera={carrera} establecimientos={establecimientos} />
                      <DialogoBaja carrera={carrera} />
                    </div>
                  )
                }
              />
            ),
          },
          {
            valor: "experiencia",
            etiqueta: t.pestanas.experiencia,
            contenido: (
              <SeccionExperiencia
                carrera={carrera}
                acciones={puedeEditar && <DialogoExperiencia carrera={carrera} />}
                accionBienio={puedeEditar ? (bienio) => <DialogoReconocerBienio carrera={carrera} bienio={bienio} /> : undefined}
              />
            ),
          },
          {
            valor: "capacitaciones",
            etiqueta: t.pestanas.capacitaciones,
            contenido: <SeccionCapacitaciones carrera={carrera} acciones={puedeEditar && <DialogoCapacitacion carrera={carrera} />} />,
          },
          { valor: "estudios", etiqueta: t.pestanas.estudios, contenido: <SeccionEstudios carrera={carrera} acciones={puedeEditar && <DialogoEstudio carrera={carrera} />} /> },
          { valor: "nivel", etiqueta: t.pestanas.nivel, contenido: <SeccionNivel carrera={carrera} acciones={puedeEditar && <DialogoCambioNivel carrera={carrera} />} /> },
          { valor: "calificaciones", etiqueta: t.pestanas.calificaciones, contenido: <SeccionCalificaciones funcionarioId={f.id} puedeEditar={puedeEditar} /> },
          { valor: "documentos", etiqueta: t.pestanas.documentos, contenido: <SeccionDocumentos carrera={carrera} puedeEditar={puedeEditar} /> },
          { valor: "historial", etiqueta: t.pestanas.historial, contenido: <SeccionHistorial entradas={historial} /> },
          { valor: "alertas", etiqueta: t.pestanas.alertas, contenido: <SeccionAlertas alertas={alertas} /> },
        ]}
      />
    </div>
  );
}
