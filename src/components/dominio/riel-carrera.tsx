// Riel de carrera (doc 12, "el elemento memorable"): los 15 niveles como marcas, el actual resaltado en
// institucional, el siguiente marcado, y debajo en cifra grande el puntaje, lo que falta y la fecha estimada.
// Es la única pieza con tratamiento visual propio. Sin animación salvo al cambiar de nivel en pantalla.

import { textosFuncionarios } from "@/app/(admin)/funcionarios/textos";
import { formatearMesAnio, formatearPuntos, puntosConUnidad } from "@/lib/formato";
import type { EstadoCarrera } from "@/lib/motor/estado";
import { cn } from "@/lib/utils";

const t = textosFuncionarios.ficha.riel;

export function RielCarrera({ estado, compacto = false }: { estado: EstadoCarrera; compacto?: boolean }) {
  if (estado.sinInformacion) {
    return <p className="text-sm text-tinta-secundaria">{t.sinInformacion}</p>;
  }
  const { estructura, vigente, calculado, siguiente, puntajeFaltante } = estado.nivel;
  const actual = vigente ?? calculado;
  const progresion = estructura.progresion;
  const resumen = [
    puntosConUnidad(estado.puntaje.total),
    puntajeFaltante && siguiente ? t.faltan(formatearPuntos(puntajeFaltante)) : t.nivelMaximoAlcanzado,
    estado.proyeccion?.fechaEstimada ? t.estimado(formatearMesAnio(estado.proyeccion.fechaEstimada)) : siguiente ? t.sinProyeccion : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2" aria-label="Riel de carrera">
      <div className="flex items-center gap-1 text-xs text-tinta-secundaria">
        <span className="shrink-0">{t.nivelIngreso} {estructura.nivelIngreso}</span>
        <ol className="flex flex-1 items-center justify-between px-1" role="list">
          {progresion.map((nivel) => {
            const esActual = nivel === actual;
            const esSiguiente = siguiente?.nivel === nivel;
            return (
              <li key={nivel} className="relative flex flex-col items-center" aria-label={`Nivel ${nivel}${esActual ? ", actual" : esSiguiente ? ", siguiente" : ""}`}>
                <span
                  className={cn(
                    "block rounded-full border-2 transition-transform duration-300",
                    esActual
                      ? "size-4 border-institucional bg-institucional"
                      : esSiguiente
                        ? "size-3.5 border-institucional bg-superficie"
                        : "size-2 border-linea bg-linea",
                  )}
                />
                {(esActual || esSiguiente) && !compacto && (
                  // En celular las marcas están muy juntas y los rótulos se pisarían: ahí va una línea aparte
                  <span className={cn("absolute top-5 hidden whitespace-nowrap text-[0.6875rem] md:block", esActual ? "font-medium text-institucional" : "text-tinta-secundaria")}>
                    {esActual ? t.actual : t.siguiente} {nivel}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <span className="shrink-0">{t.nivelMaximo} {estructura.nivelMaximo}</span>
      </div>
      {!compacto && (
        <p className="text-xs text-tinta-secundaria md:hidden">
          <span className="font-medium text-institucional">{t.nivelActual} {actual}</span>
          {siguiente ? ` · ${t.siguiente} ${siguiente.nivel}` : ""}
        </p>
      )}
      <p className={cn("text-institucional", compacto ? "mt-1 text-sm font-medium" : "text-2xl font-semibold md:mt-5")}>
        {resumen.join(" · ")}
      </p>
    </div>
  );
}
