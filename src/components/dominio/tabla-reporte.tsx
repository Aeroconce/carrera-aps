// Tabla de un reporte (doc 06): la misma pieza en pantalla y en la vista de impresión. Columnas numéricas a la
// derecha con cifras tabulares; fila de totales; nota al pie de la sección. En celular desplaza en horizontal
// con indicador (doc 12: el scroll horizontal queda solo para reportes tabulares).

import { formatearChileno } from "@/lib/fechas/civil";
import { formatearPuntos } from "@/lib/formato";
import { totalesDe, type Celda, type Columna, type Seccion } from "@/lib/reportes/tipos";
import { cn } from "@/lib/utils";

export function celdaTexto(valor: Celda | undefined, tipo: Columna["tipo"]): string {
  if (valor === null || valor === undefined) return "";
  if (tipo === "fecha" && typeof valor === "string") return formatearChileno(valor);
  if (tipo === "booleano") return valor ? "Sí" : "No";
  if (tipo === "decimal") return formatearPuntos(valor as number);
  return String(valor);
}

interface Props {
  seccion: Seccion;
  /** Rango de filas a mostrar (paginación en pantalla); sin rango, todas */
  desde?: number;
  hasta?: number;
  /** Muestra el título de la sección sobre la tabla */
  conTitulo?: boolean;
  textos: { vacio: string; totales: string; scrollHorizontal: string };
  imprimir?: boolean;
}

export function TablaReporte({ seccion, desde = 0, hasta, conTitulo = true, textos, imprimir = false }: Props) {
  const filas = seccion.filas.slice(desde, hasta ?? seccion.filas.length);
  const totales = totalesDe(seccion);
  const numerica = (c: Columna) => c.tipo === "entero" || c.tipo === "decimal";
  return (
    <section className={cn("flex flex-col gap-2", imprimir && "break-inside-auto")}>
      {conTitulo && <h2 className="text-base font-medium">{seccion.titulo}</h2>}
      {!imprimir && <p className={cn("text-xs text-tinta-secundaria", seccion.columnas.length <= 8 && "md:hidden")}>{textos.scrollHorizontal}</p>}
      {/* Región desplazable accesible por teclado (axe: scrollable-region-focusable) */}
      <div
        className={cn("overflow-x-auto rounded-lg border border-linea bg-superficie", imprimir && "overflow-visible rounded-none border-0")}
        role="region"
        aria-label={seccion.titulo}
        tabIndex={imprimir ? undefined : 0}
      >
        <table className={cn("w-full text-sm tabular-nums", imprimir && "text-[10px] leading-tight")}>
          <thead>
            <tr className={cn("border-b border-linea bg-fondo text-left text-xs text-tinta-secundaria", imprimir && "bg-institucional-suave text-tinta")}>
              {seccion.columnas.map((c) => (
                <th key={c.clave} scope="col" className={cn("px-3 py-2 font-medium whitespace-nowrap", numerica(c) && "text-right", imprimir && "px-1.5 py-1")}>
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={seccion.columnas.length} className="px-3 py-6 text-center text-sm text-tinta-secundaria">
                  {seccion.nota ?? textos.vacio}
                </td>
              </tr>
            ) : (
              filas.map((fila, i) => (
                <tr key={i} className={cn("border-b border-linea last:border-0", imprimir && "break-inside-avoid")}>
                  {seccion.columnas.map((c) => (
                    <td key={c.clave} className={cn("px-3 py-1.5 align-top", numerica(c) && "text-right whitespace-nowrap", c.tipo === "fecha" && "whitespace-nowrap", imprimir && "px-1.5 py-0.5")}>
                      {celdaTexto(fila[c.clave], c.tipo)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {totales && filas.length > 0 && (
            <tfoot>
              <tr className="border-t border-linea bg-fondo font-medium">
                {seccion.columnas.map((c, i) => (
                  <td key={c.clave} className={cn("px-3 py-2", numerica(c) && "text-right", imprimir && "px-1.5 py-1")}>
                    {i === 0 ? textos.totales : celdaTexto(totales[c.clave], c.tipo)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {seccion.nota && filas.length > 0 && <p className="text-xs text-tinta-secundaria">{seccion.nota}</p>}
    </section>
  );
}
