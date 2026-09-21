import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirSesion } from "@/lib/auth/sesion";
import { resumenInicio } from "@/lib/carrera/listado";
import { textosInicio } from "./textos";

const NOMBRES_ALERTA: Record<string, string> = {
  BIENIO_PROXIMO: "Bienio próximo",
  BIENIO_PENDIENTE_RECONOCER: "Bienio sin reconocer",
  NIVEL_ALCANZADO: "Nivel alcanzado",
  NIVEL_PROXIMO: "Nivel próximo",
  CAPACITACION_POR_VENCER_PERIODO: "Cierre de período",
  CALIFICACION_PENDIENTE: "Calificación pendiente",
  DOCUMENTO_FALTANTE: "Documento faltante",
};

// Inicio (doc 05 módulo 1): contadores que muestran en diez segundos que hay alertas automáticas y cálculo vivo.
export default async function InicioPage() {
  const sesion = await exigirSesion({ roles: ["ADMIN", "SUPERVISION"] });
  const institucionId = sesion.user.institucionId;
  const resumen = institucionId ? await resumenInicio(institucionId) : null;
  const totalAlertas = resumen?.alertasPorTipo.reduce((s, a) => s + a.total, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{textosInicio.titulo}</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-tinta-secundaria">{textosInicio.dotacion}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{resumen?.dotacionActiva ?? 0}</p>
            <p className="text-xs text-tinta-secundaria">{textosInicio.funcionarios}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-tinta-secundaria">{textosInicio.bieniosProximos}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {(["en30", "en60", "en90"] as const).map((clave) => (
              <div key={clave}>
                <p className="text-2xl font-semibold">{resumen?.bieniosProximos[clave] ?? 0}</p>
                <p className="text-xs text-tinta-secundaria">{textosInicio[clave]}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-tinta-secundaria">{textosInicio.cumplenAscenso}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{resumen?.cumplenAscenso ?? 0}</p>
            <p className="text-xs text-tinta-secundaria">{textosInicio.funcionarios}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-tinta-secundaria">{textosInicio.alertasActivas}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalAlertas}</p>
            {resumen && resumen.alertasPorTipo.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-tinta-secundaria">
                {resumen.alertasPorTipo.slice(0, 4).map((a) => (
                  <li key={a.tipo} className="flex justify-between gap-2">
                    <span>{NOMBRES_ALERTA[a.tipo] ?? a.tipo}</span>
                    <span className="font-medium text-tinta">{a.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-tinta-secundaria">{textosInicio.sinAlertas}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-tinta-secundaria">{textosInicio.porEstablecimiento}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-linea">
              {resumen?.porEstablecimiento.map((e) => (
                <li key={e.nombre} className="flex justify-between gap-4 py-1.5">
                  <span>{e.nombre}</span>
                  <span className="font-medium">{e.total}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-tinta-secundaria">{textosInicio.porCategoria}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-2">
              {resumen?.porCategoria.map((c) => (
                <li key={c.categoria} className="rounded-lg border border-linea px-3 py-2">
                  <p className="text-xs text-tinta-secundaria">Categoría {c.categoria}</p>
                  <p className="text-lg font-semibold">{c.total}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/alertas" className={buttonVariants({ variant: "default" })}>
          {textosInicio.verAlertas}
        </Link>
        <Link href="/funcionarios" className={buttonVariants({ variant: "outline" })}>
          {textosInicio.verFuncionarios}
        </Link>
      </div>
    </div>
  );
}
