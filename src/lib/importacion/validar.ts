// Validación de la carga inicial (doc 08): RUT válido, fechas coherentes, categoría y establecimiento válidos,
// grado dentro del rango de la regla NIVELES, duplicados en la planilla y en la base. Si hay un error en
// cualquier fila, no se importa nada: devuelve el informe por fila y columna.

import { cargarReglas } from "@/lib/carrera/reglas";
import { prisma } from "@/lib/db/prisma";
import { fechaCivil, parsearChileno, type FechaCivil } from "@/lib/fechas/civil";
import { limpiarRut, validarRut } from "@/lib/rut";
import type { Categoria, TipoContrato } from "@/generated/prisma/client";
import { COLUMNAS_CARGA, normalizarEncabezado } from "./plantilla";
import type { FilaCruda } from "./parsear";

export interface ErrorFila {
  fila: number;
  columna: string;
  mensaje: string;
}

export interface FilaValidada {
  fila: number;
  rut: string;
  nombres: string;
  apellidos: string;
  categoria: Categoria;
  establecimientoId: string;
  establecimiento: string;
  tipoContrato: TipoContrato;
  fechaIngreso: FechaCivil;
  grado: number;
  gradoDesde: FechaCivil;
  puntajeExperiencia: number | null;
  puntajeCapacitacion: number | null;
  puntajeTotal: number;
  fechaUltimoBienio: FechaCivil;
  bieniosReconocidos: number | null;
  excedentePendiente: number | null;
  jornadaHoras: number | null;
  cargo: string | null;
  correo: string | null;
}

export interface ResultadoValidacion {
  filas: FilaValidada[];
  errores: ErrorFila[];
}

const ENCABEZADO = new Map(COLUMNAS_CARGA.map((c) => [c.clave, c.encabezado]));
const CONTRATOS: Record<string, TipoContrato> = { titular: "TITULAR", "plazo fijo": "PLAZO_FIJO", plazofijo: "PLAZO_FIJO", reemplazo: "REEMPLAZO", contrata: "PLAZO_FIJO" };

function leerFecha(valor: string): FechaCivil | null {
  if (!valor) return null;
  try {
    return valor.includes("/") ? parsearChileno(valor) : fechaCivil(valor.slice(0, 10));
  } catch {
    return null;
  }
}

function leerNumero(valor: string): number | null {
  if (!valor) return null;
  const n = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function validarCargaInicial(institucionId: string, crudas: FilaCruda[]): Promise<ResultadoValidacion> {
  const errores: ErrorFila[] = [];
  const filas: FilaValidada[] = [];
  const [establecimientos, reglas] = await Promise.all([
    prisma.establecimiento.findMany({ where: { institucionId, activo: true }, select: { id: true, nombre: true } }),
    cargarReglas(institucionId),
  ]);
  const porNombre = new Map(establecimientos.map((e) => [normalizarEncabezado(e.nombre), e]));
  const rutsEnPlanilla = new Map<string, number>();

  for (const cruda of crudas) {
    const v = cruda.valores;
    const error = (clave: string, mensaje: string) => errores.push({ fila: cruda.numero, columna: ENCABEZADO.get(clave) ?? clave, mensaje });
    const erroresAntes = errores.length;

    for (const c of COLUMNAS_CARGA) {
      if (c.obligatoria && !(v[c.clave] ?? "").trim()) error(c.clave, "Es obligatoria y está vacía.");
    }

    const rut = limpiarRut(v.rut ?? "");
    if (v.rut && !validarRut(rut)) error("rut", "RUT inválido: revisa el dígito verificador.");
    if (rut) {
      const previa = rutsEnPlanilla.get(rut);
      if (previa) error("rut", `Repetido en la planilla (fila ${previa}).`);
      else rutsEnPlanilla.set(rut, cruda.numero);
    }

    const categoria = (v.categoria ?? "").trim().toUpperCase();
    if (v.categoria && !["A", "B", "C", "D", "E", "F"].includes(categoria)) error("categoria", "Debe ser A, B, C, D, E o F.");

    const establecimiento = porNombre.get(normalizarEncabezado(v.establecimiento ?? ""));
    if (v.establecimiento && !establecimiento) error("establecimiento", "No existe un establecimiento activo con ese nombre (ver Parámetros).");

    const tipoContrato = CONTRATOS[normalizarEncabezado(v.tipoContrato ?? "")];
    if (v.tipoContrato && !tipoContrato) error("tipoContrato", "Debe ser Titular, Plazo fijo o Reemplazo.");

    const fechaIngreso = leerFecha(v.fechaIngreso ?? "");
    if (v.fechaIngreso && !fechaIngreso) error("fechaIngreso", "Fecha inválida; usa dd/mm/aaaa.");
    const gradoDesde = leerFecha(v.gradoDesde ?? "");
    if (v.gradoDesde && !gradoDesde) error("gradoDesde", "Fecha inválida; usa dd/mm/aaaa.");
    const fechaUltimoBienio = leerFecha(v.fechaUltimoBienio ?? "");
    if (v.fechaUltimoBienio && !fechaUltimoBienio) error("fechaUltimoBienio", "Fecha inválida; usa dd/mm/aaaa.");
    if (fechaIngreso && gradoDesde && gradoDesde < fechaIngreso) error("gradoDesde", "No puede ser anterior a la fecha de ingreso.");
    if (fechaIngreso && fechaUltimoBienio && fechaUltimoBienio < fechaIngreso) error("fechaUltimoBienio", "No puede ser anterior a la fecha de ingreso.");

    const grado = leerNumero(v.grado ?? "");
    if (v.grado && (grado === null || !Number.isInteger(grado))) error("grado", "Debe ser un número entero.");
    if (grado !== null && Number.isInteger(grado) && categoria && gradoDesde) {
      try {
        const { nivelIngreso, nivelMaximo } = reglas.vigente("NIVELES", gradoDesde, categoria as Categoria).parametros;
        const [min, max] = nivelIngreso < nivelMaximo ? [nivelIngreso, nivelMaximo] : [nivelMaximo, nivelIngreso];
        if (grado < min || grado > max) error("grado", `Debe estar entre ${min} y ${max} según la regla Niveles vigente.`);
      } catch {
        // Sin regla NIVELES a esa fecha no se puede acotar el grado; la carga sigue
      }
    }

    const puntajeTotal = leerNumero(v.puntajeTotal ?? "");
    if (v.puntajeTotal && (puntajeTotal === null || puntajeTotal < 0)) error("puntajeTotal", "Debe ser un número mayor o igual a 0.");
    const puntajeExperiencia = leerNumero(v.puntajeExperiencia ?? "");
    if (v.puntajeExperiencia && puntajeExperiencia === null) error("puntajeExperiencia", "Debe ser un número.");
    const puntajeCapacitacion = leerNumero(v.puntajeCapacitacion ?? "");
    if (v.puntajeCapacitacion && puntajeCapacitacion === null) error("puntajeCapacitacion", "Debe ser un número.");
    if (puntajeTotal !== null && puntajeExperiencia !== null && puntajeCapacitacion !== null && puntajeExperiencia + puntajeCapacitacion > puntajeTotal + 0.005) {
      error("puntajeTotal", "El total no puede ser menor que experiencia más capacitación.");
    }
    const bieniosReconocidos = leerNumero(v.bieniosReconocidos ?? "");
    if (v.bieniosReconocidos && (bieniosReconocidos === null || !Number.isInteger(bieniosReconocidos) || bieniosReconocidos < 0)) error("bieniosReconocidos", "Debe ser un entero mayor o igual a 0.");
    const excedentePendiente = leerNumero(v.excedentePendiente ?? "");
    if (v.excedentePendiente && (excedentePendiente === null || excedentePendiente < 0)) error("excedentePendiente", "Debe ser un número mayor o igual a 0.");
    const jornadaHoras = leerNumero(v.jornadaHoras ?? "");
    if (v.jornadaHoras && (jornadaHoras === null || !Number.isInteger(jornadaHoras) || jornadaHoras < 1 || jornadaHoras > 44)) error("jornadaHoras", "Debe ser un entero entre 1 y 44.");
    const correo = (v.correo ?? "").trim() || null;
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) error("correo", "Correo inválido.");

    if (errores.length > erroresAntes) continue;
    filas.push({
      fila: cruda.numero,
      rut,
      nombres: (v.nombres ?? "").trim(),
      apellidos: (v.apellidos ?? "").trim(),
      categoria: categoria as Categoria,
      establecimientoId: establecimiento!.id,
      establecimiento: establecimiento!.nombre,
      tipoContrato: tipoContrato!,
      fechaIngreso: fechaIngreso!,
      grado: grado!,
      gradoDesde: gradoDesde!,
      puntajeExperiencia,
      puntajeCapacitacion,
      puntajeTotal: puntajeTotal!,
      fechaUltimoBienio: fechaUltimoBienio!,
      bieniosReconocidos,
      excedentePendiente,
      jornadaHoras,
      cargo: (v.cargo ?? "").trim() || null,
      correo,
    });
  }

  // Duplicados con la base
  if (filas.length > 0) {
    const existentes = await prisma.funcionario.findMany({ where: { institucionId, rut: { in: filas.map((f) => f.rut) } }, select: { rut: true } });
    const enBase = new Set(existentes.map((e) => e.rut));
    for (const f of filas) {
      if (enBase.has(f.rut)) errores.push({ fila: f.fila, columna: "RUT", mensaje: "Ya existe un funcionario con ese RUT en el sistema." });
    }
  }
  errores.sort((a, b) => a.fila - b.fila);
  return { filas: errores.length > 0 ? [] : filas, errores };
}
