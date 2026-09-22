"use client";

// Selector de fecha con calendario propio (doc 12): campo de texto dd/mm/aaaa (se puede escribir directamente)
// más un calendario desplegable con el diseño de la aplicación, en vez del selector del navegador. El valor
// que viaja en el formulario es la fecha civil AAAA-MM-DD, en un campo oculto, así los filtros y las acciones
// del servidor no cambian.

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { EntradaNativa } from "@/components/ui/entrada-nativa";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatearChileno, hoyEnChile, parsearChileno, partes, type FechaCivil } from "@/lib/fechas/civil";
import { cn } from "cn";

const DIAS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
const textos = {
  abrir: "Elegir fecha en el calendario",
  mesAnterior: "Mes anterior",
  mesSiguiente: "Mes siguiente",
  borrar: "Borrar",
  hoy: "Hoy",
  placeholder: "dd/mm/aaaa",
};

interface Celda {
  iso: FechaCivil;
  dia: number;
  delMes: boolean;
}

/** Semanas del mes (lunes a domingo) con los días vecinos que completan la primera y la última fila. */
function semanasDe(anio: number, mes: number): Celda[][] {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const desplazamiento = (primero.getUTCDay() + 6) % 7;
  const semanas: Celda[][] = [];
  for (let fila = 0; fila < 6; fila++) {
    const semana: Celda[] = [];
    for (let columna = 0; columna < 7; columna++) {
      const d = new Date(Date.UTC(anio, mes - 1, 1 - desplazamiento + fila * 7 + columna));
      semana.push({ iso: d.toISOString().slice(0, 10), dia: d.getUTCDate(), delMes: d.getUTCMonth() === mes - 1 });
    }
    if (fila > 0 && semana.every((c) => !c.delMes)) break;
    semanas.push(semana);
  }
  return semanas;
}

function tituloMes(anio: number, mes: number): string {
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(anio, mes - 1, 1)));
}

function nombreLargo(iso: FechaCivil): string {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function aIso(texto: string): FechaCivil | null {
  try {
    return parsearChileno(texto);
  } catch {
    return null;
  }
}

interface Props {
  /** Nombre del campo que recibe el formulario (fecha civil AAAA-MM-DD). */
  name: string;
  /** Valor inicial en AAAA-MM-DD. */
  defaultValue?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

export function SelectorFecha({ name, defaultValue = "", id, required, className }: Props) {
  const idGenerado = useId();
  const idEntrada = id ?? `fecha-${idGenerado}`;
  const [iso, setIso] = useState<FechaCivil | "">(defaultValue && aIso(formatearChileno(defaultValue)) ? defaultValue : "");
  const [texto, setTexto] = useState(iso ? formatearChileno(iso) : "");
  const [abierto, setAbierto] = useState(false);
  const hoy = hoyEnChile();
  const base = partes(iso || hoy);
  const [vista, setVista] = useState({ anio: base.anio, mes: base.mes });
  const invalido = texto.trim() !== "" && iso === "";

  function elegir(fecha: FechaCivil | "") {
    setIso(fecha);
    setTexto(fecha ? formatearChileno(fecha) : "");
    if (fecha) {
      const p = partes(fecha);
      setVista({ anio: p.anio, mes: p.mes });
    }
  }

  function escribir(valor: string) {
    setTexto(valor);
    const fecha = valor.trim() === "" ? "" : aIso(valor.trim());
    if (fecha === null) {
      setIso("");
      return;
    }
    setIso(fecha);
    if (fecha) {
      const p = partes(fecha);
      setVista({ anio: p.anio, mes: p.mes });
    }
  }

  function moverMes(delta: number) {
    setVista((v) => {
      const total = v.anio * 12 + (v.mes - 1) + delta;
      return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
    });
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <EntradaNativa
        id={idEntrada}
        type="text"
        inputMode="numeric"
        placeholder={textos.placeholder}
        value={texto}
        onChange={(evento) => escribir(evento.target.value)}
        required={required}
        aria-invalid={invalido || undefined}
        autoComplete="off"
        className="h-10 w-full pr-10"
      />
      <input type="hidden" name={name} value={iso} />
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          render={<button type="button" aria-label={textos.abrir} className="absolute right-1 inline-flex size-8 items-center justify-center rounded-md text-tinta-secundaria hover:bg-institucional-suave hover:text-institucional focus-visible:ring-3 focus-visible:ring-ring/50 outline-none" />}
        >
          <CalendarIcon className="size-4" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="icon-sm" aria-label={textos.mesAnterior} onClick={() => moverMes(-1)}>
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Button>
            <p className="text-sm font-medium first-letter:uppercase" aria-live="polite">{tituloMes(vista.anio, vista.mes)}</p>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={textos.mesSiguiente} onClick={() => moverMes(1)}>
              <ChevronRightIcon className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-tinta-secundaria" aria-hidden>
            {DIAS.map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div role="group" aria-label={tituloMes(vista.anio, vista.mes)} className="grid grid-cols-7 gap-1">
            {semanasDe(vista.anio, vista.mes)
              .flat()
              .map((c) => {
                const elegido = c.iso === iso;
                const esHoy = c.iso === hoy;
                return (
                  <button
                    key={c.iso}
                    type="button"
                    aria-label={nombreLargo(c.iso)}
                    aria-pressed={elegido}
                    onClick={() => {
                      elegir(c.iso);
                      setAbierto(false);
                    }}
                    className={cn(
                      "size-9 rounded-md text-sm tabular-nums outline-none transition-colors hover:bg-institucional-suave focus-visible:ring-3 focus-visible:ring-ring/50",
                      !c.delMes && "text-tinta-secundaria/60",
                      esHoy && !elegido && "ring-1 ring-institucional font-medium text-institucional",
                      elegido && "bg-institucional text-white hover:bg-institucional",
                    )}
                  >
                    {c.dia}
                  </button>
                );
              })}
          </div>
          <div className="flex justify-between border-t border-linea pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => elegir("")}>
              {textos.borrar}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                elegir(hoy);
                setAbierto(false);
              }}
            >
              {textos.hoy}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
