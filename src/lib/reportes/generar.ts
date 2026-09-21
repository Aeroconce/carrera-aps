// Generación de un reporte (doc 06): resuelve el alcance, calcula el estado de cada funcionario a la fecha de
// corte con el motor (reglas vigentes a esa fecha) y arma las secciones según la definición. Solo lectura.

import { listarFuncionarios, type FilaFuncionario } from "@/lib/carrera/listado";
import { cargarReglas } from "@/lib/carrera/reglas";
import { prisma } from "@/lib/db/prisma";
import { aDate, desdeDate } from "@/lib/fechas/civil";
import { formatearRut, nombreCompleto } from "@/lib/formato";
import { TIPOS_REGLA, type ConjuntoReglas } from "@/lib/motor/reglas";
import { definicionDe, type CalificacionReporte, type DefinicionReporte } from "./definiciones";
import { ETIQUETAS } from "./etiquetas";
import type { FiltrosReporte } from "./filtros";
import type { ContextoReporte, ReglaAplicada, ReporteGenerado } from "./tipos";

export interface UsuarioGenerador {
  name: string;
}

/** Funcionarios del alcance que existían a la fecha, con el estado a esa fecha (activo, inactivo o todos). */
function enAlcance(filas: FilaFuncionario[], filtros: FiltrosReporte): FilaFuncionario[] {
  return filas.filter(({ funcionario: f, estado }) => {
    if (desdeDate(f.fechaIngreso) > filtros.fecha) return false;
    if (filtros.alcance === "funcionario" && f.id !== filtros.funcionarioId) return false;
    if (filtros.alcance === "establecimiento" && f.establecimientoId !== filtros.establecimientoId) return false;
    if (filtros.estado === "ACTIVO" && !estado.activo) return false;
    if (filtros.estado === "INACTIVO" && estado.activo) return false;
    if (filtros.nivel && !estado.sinInformacion && (estado.nivel.vigente ?? estado.nivel.calculado) !== filtros.nivel) return false;
    if (filtros.nivel && estado.sinInformacion) return false;
    return true;
  });
}

function reglasAplicadas(reglas: ConjuntoReglas, fecha: string): ReglaAplicada[] {
  const salida: ReglaAplicada[] = [];
  for (const tipo of TIPOS_REGLA) {
    try {
      const r = reglas.vigente(tipo, fecha);
      salida.push({ tipo, categoria: r.categoria, vigenteDesde: r.vigenteDesde, fuente: r.fuente });
    } catch {
      // Sin regla de ese tipo a la fecha: el motor usa el valor por defecto del doc 04 o la omite
    }
  }
  return salida;
}

async function describirAlcance(filtros: FiltrosReporte): Promise<string> {
  if (filtros.alcance === "funcionario" && filtros.funcionarioId) {
    const f = await prisma.funcionario.findUnique({ where: { id: filtros.funcionarioId }, select: { nombres: true, apellidos: true, rut: true } });
    return f ? `Funcionario: ${nombreCompleto(f)} (${formatearRut(f.rut)})` : "Funcionario";
  }
  if (filtros.alcance === "establecimiento" && filtros.establecimientoId) {
    const e = await prisma.establecimiento.findUnique({ where: { id: filtros.establecimientoId }, select: { nombre: true } });
    return e ? `Establecimiento: ${e.nombre}` : "Establecimiento";
  }
  return "Dotación completa";
}

function describirFiltros(filtros: FiltrosReporte): ContextoReporte["filtros"] {
  const lista: ContextoReporte["filtros"] = [];
  if (filtros.categoria) lista.push({ etiqueta: "Categoría", valor: filtros.categoria });
  if (filtros.nivel) lista.push({ etiqueta: "Nivel", valor: String(filtros.nivel) });
  if (filtros.tipoContrato) lista.push({ etiqueta: "Tipo de contrato", valor: ETIQUETAS.contrato[filtros.tipoContrato] });
  lista.push({ etiqueta: "Estado", valor: filtros.estado === "ACTIVO" ? "Activos a la fecha" : filtros.estado === "INACTIVO" ? "Inactivos a la fecha" : "Todos" });
  return lista;
}

export async function generarReporte(
  institucionId: string,
  definicion: DefinicionReporte,
  filtros: FiltrosReporte,
  usuario: UsuarioGenerador,
): Promise<ReporteGenerado> {
  const [institucion, reglas, todas, alcance] = await Promise.all([
    prisma.institucion.findUniqueOrThrow({ where: { id: institucionId }, select: { nombre: true } }),
    cargarReglas(institucionId),
    listarFuncionarios(institucionId, { estado: "TODOS", categoria: filtros.categoria, tipoContrato: filtros.tipoContrato }, filtros.fecha),
    describirAlcance(filtros),
  ]);
  const filas = enAlcance(todas, filtros);

  let calificaciones: CalificacionReporte[] = [];
  if (definicion.necesitaCalificaciones && filas.length > 0) {
    calificaciones = await prisma.calificacionFuncionario.findMany({
      where: { funcionarioId: { in: filas.map((f) => f.funcionario.id) }, proceso: { periodoDesde: { lte: aDate(filtros.fecha) } } },
      include: { proceso: true, notasMerito: true },
    });
  }

  return {
    id: definicion.id,
    numero: definicion.numero,
    nombre: definicion.nombre,
    descripcion: definicion.descripcion,
    archivo: definicion.archivo,
    secciones: definicion.generar({ filas, fechaCorte: filtros.fecha, reglas, calificaciones }),
    contexto: {
      institucion: institucion.nombre,
      fechaCorte: filtros.fecha,
      generadoEl: new Date(),
      generadoPor: usuario.name,
      alcance,
      filtros: describirFiltros(filtros),
      reglas: reglasAplicadas(reglas, filtros.fecha),
      totalFuncionarios: filas.length,
    },
  };
}

export async function generarReportePorId(institucionId: string, id: string, filtros: FiltrosReporte, usuario: UsuarioGenerador): Promise<ReporteGenerado | null> {
  const definicion = definicionDe(id);
  return definicion ? generarReporte(institucionId, definicion, filtros, usuario) : null;
}
