// Escrituras de carrera (docs 05, 07, 13 y 15): cada operación es una transacción auditada con conAuditoria.
// Las usan las server actions y el seed de la demo, para que la carga de datos quede auditada como en producción.
// Nunca se borra un funcionario: se da de baja con estado y fecha de egreso.

import { aDate, desdeDate, hoyEnChile, sumarDias, type FechaCivil } from "@/lib/fechas/civil";
import { calcularCapacitacion, puntuarActividad } from "@/lib/motor/capacitacion";
import { puntos } from "@/lib/motor/puntaje";
import type { ConjuntoReglas } from "@/lib/motor/reglas";
import type { CapacitacionEntrada } from "@/lib/motor/tipos";
import type {
  Categoria,
  Funcionario,
  MotivoNivel,
  Prisma,
  TipoCapacitacion,
  TipoContrato,
  TipoEstablecimiento,
  TipoEstudio,
} from "@/generated/prisma/client";
import { conAuditoria, type ClienteTransaccion, type ContextoAuditoria } from "./auditado";
import { diffCampos } from "./diff-campos";

// ---------------------------------------------------------------------------
// Institución y establecimientos
// ---------------------------------------------------------------------------

export async function actualizarInstitucion(ctx: ContextoAuditoria, id: string, cambios: { nombre?: string; comuna?: string }) {
  return conAuditoria(ctx, "EDITAR", "Institucion", async (tx) => {
    const antes = await tx.institucion.findUniqueOrThrow({ where: { id } });
    const despues = await tx.institucion.update({ where: { id }, data: cambios });
    return { resultado: despues, entidadId: id, ...diffCampos(antes, despues) };
  });
}

export async function crearEstablecimiento(ctx: ContextoAuditoria, institucionId: string, datos: { nombre: string; tipo: TipoEstablecimiento }) {
  return conAuditoria(ctx, "CREAR", "Establecimiento", async (tx) => {
    const creado = await tx.establecimiento.create({ data: { institucionId, ...datos } });
    return { resultado: creado, entidadId: creado.id, despues: creado };
  });
}

// ---------------------------------------------------------------------------
// Funcionarios
// ---------------------------------------------------------------------------

export interface DatosFuncionario {
  institucionId: string;
  rut: string;
  nombres: string;
  apellidos: string;
  categoria: Categoria;
  tipoContrato: TipoContrato;
  fechaIngreso: FechaCivil;
  establecimientoId: string;
  cargo?: string | null;
  jornadaHoras?: number | null;
  email?: string | null;
  fechaNacimiento?: FechaCivil | null;
}

export interface DatosApertura {
  /** Día al que corresponden los saldos (la víspera de la puesta en marcha) */
  fecha: FechaCivil;
  nivel: number;
  nivelDesde: FechaCivil;
  puntajeTotal: number | string;
  desglosado: boolean;
  puntajeExperiencia?: number | string | null;
  puntajeCapacitacion?: number | string | null;
  fechaUltimoBienio?: FechaCivil | null;
  bieniosReconocidos?: number | null;
  excedentePendiente?: number | string | null;
  fuente: string;
}

function datosFuncionarioAPrisma(datos: DatosFuncionario): Prisma.FuncionarioUncheckedCreateInput {
  return {
    institucionId: datos.institucionId,
    rut: datos.rut,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    categoria: datos.categoria,
    tipoContrato: datos.tipoContrato,
    fechaIngreso: aDate(datos.fechaIngreso),
    establecimientoId: datos.establecimientoId,
    cargo: datos.cargo ?? null,
    jornadaHoras: datos.jornadaHoras ?? null,
    email: datos.email ?? null,
    fechaNacimiento: datos.fechaNacimiento ? aDate(datos.fechaNacimiento) : null,
  };
}

/** Alta de un funcionario nuevo (sin saldo): nivel de ingreso según la regla NIVELES y período propio vigente. */
export async function crearFuncionario(ctx: ContextoAuditoria, datos: DatosFuncionario, reglas: ConjuntoReglas, nombreInstitucion: string): Promise<Funcionario> {
  const nivelIngreso = reglas.vigente("NIVELES", datos.fechaIngreso, datos.categoria).parametros.nivelIngreso;
  return conAuditoria(ctx, "CREAR", "Funcionario", async (tx) => {
    const creado = await tx.funcionario.create({ data: datosFuncionarioAPrisma(datos) });
    await tx.nivelHistorico.create({
      data: { funcionarioId: creado.id, nivel: nivelIngreso, fechaDesde: aDate(datos.fechaIngreso), puntajeAlCambio: 0, motivo: "INGRESO" },
    });
    await tx.experiencia.create({
      data: { funcionarioId: creado.id, institucion: nombreInstitucion, esPropia: true, fechaDesde: aDate(datos.fechaIngreso), jornadaHoras: datos.jornadaHoras ?? null },
    });
    return { resultado: creado, entidadId: creado.id, despues: creado };
  });
}

/** Carga inicial (doc 08): funcionario + movimiento de apertura + nivel vigente + período propio, en una transacción. */
export async function crearFuncionarioConApertura(
  ctx: ContextoAuditoria,
  datos: DatosFuncionario,
  apertura: DatosApertura,
  nombreInstitucion: string,
): Promise<Funcionario> {
  return conAuditoria(ctx, "APERTURA", "Funcionario", async (tx) => {
    const creado = await tx.funcionario.create({ data: datosFuncionarioAPrisma(datos) });
    const movimiento = await tx.apertura.create({
      data: {
        funcionarioId: creado.id,
        fecha: aDate(apertura.fecha),
        nivel: apertura.nivel,
        nivelDesde: aDate(apertura.nivelDesde),
        puntajeTotal: puntos(apertura.puntajeTotal).toFixed(2),
        desglosado: apertura.desglosado,
        puntajeExperiencia: apertura.puntajeExperiencia != null ? puntos(apertura.puntajeExperiencia).toFixed(2) : null,
        puntajeCapacitacion: apertura.puntajeCapacitacion != null ? puntos(apertura.puntajeCapacitacion).toFixed(2) : null,
        fechaUltimoBienio: apertura.fechaUltimoBienio ? aDate(apertura.fechaUltimoBienio) : null,
        bieniosReconocidos: apertura.bieniosReconocidos ?? null,
        excedentePendiente: apertura.excedentePendiente != null ? puntos(apertura.excedentePendiente).toFixed(2) : null,
        fuente: apertura.fuente,
        creadoPorId: ctx.usuarioId,
      },
    });
    await tx.nivelHistorico.create({
      data: {
        funcionarioId: creado.id,
        nivel: apertura.nivel,
        fechaDesde: aDate(apertura.nivelDesde),
        puntajeAlCambio: puntos(apertura.puntajeTotal).toFixed(2),
        motivo: "APERTURA",
      },
    });
    await tx.experiencia.create({
      data: { funcionarioId: creado.id, institucion: nombreInstitucion, esPropia: true, fechaDesde: aDate(datos.fechaIngreso), jornadaHoras: datos.jornadaHoras ?? null },
    });
    return {
      resultado: creado,
      entidadId: creado.id,
      despues: { funcionario: creado, apertura: movimiento },
      detalle: apertura.fuente,
    };
  });
}

export async function actualizarFuncionario(ctx: ContextoAuditoria, id: string, cambios: Partial<Omit<DatosFuncionario, "institucionId">>) {
  return conAuditoria(ctx, "EDITAR", "Funcionario", async (tx) => {
    const antes = await tx.funcionario.findUniqueOrThrow({ where: { id } });
    const data: Prisma.FuncionarioUncheckedUpdateInput = {
      ...(cambios.rut !== undefined && { rut: cambios.rut }),
      ...(cambios.nombres !== undefined && { nombres: cambios.nombres }),
      ...(cambios.apellidos !== undefined && { apellidos: cambios.apellidos }),
      ...(cambios.categoria !== undefined && { categoria: cambios.categoria }),
      ...(cambios.tipoContrato !== undefined && { tipoContrato: cambios.tipoContrato }),
      ...(cambios.fechaIngreso !== undefined && { fechaIngreso: aDate(cambios.fechaIngreso) }),
      ...(cambios.establecimientoId !== undefined && { establecimientoId: cambios.establecimientoId }),
      ...(cambios.cargo !== undefined && { cargo: cambios.cargo }),
      ...(cambios.jornadaHoras !== undefined && { jornadaHoras: cambios.jornadaHoras }),
      ...(cambios.email !== undefined && { email: cambios.email }),
      ...(cambios.fechaNacimiento !== undefined && { fechaNacimiento: cambios.fechaNacimiento ? aDate(cambios.fechaNacimiento) : null }),
    };
    const despues = await tx.funcionario.update({ where: { id }, data });
    return { resultado: despues, entidadId: id, ...diffCampos(antes, despues) };
  });
}

/** Baja lógica: estado INACTIVO con fecha y motivo de egreso; cierra el período de experiencia vigente. */
export async function darDeBaja(ctx: ContextoAuditoria, id: string, datos: { fechaEgreso: FechaCivil; motivoEgreso: string }) {
  return conAuditoria(ctx, "ELIMINAR", "Funcionario", async (tx) => {
    const antes = await tx.funcionario.findUniqueOrThrow({ where: { id } });
    const despues = await tx.funcionario.update({
      where: { id },
      data: { estado: "INACTIVO", fechaEgreso: aDate(datos.fechaEgreso), motivoEgreso: datos.motivoEgreso },
    });
    await tx.experiencia.updateMany({ where: { funcionarioId: id, esPropia: true, fechaHasta: null }, data: { fechaHasta: aDate(datos.fechaEgreso) } });
    return { resultado: despues, entidadId: id, ...diffCampos(antes, despues) };
  });
}

// ---------------------------------------------------------------------------
// Experiencia, bienios, capacitación, estudios, niveles
// ---------------------------------------------------------------------------

export interface DatosExperiencia {
  institucion: string;
  esPropia: boolean;
  fechaDesde: FechaCivil;
  fechaHasta: FechaCivil | null;
  jornadaHoras?: number | null;
  reconocidaEl?: FechaCivil | null;
  documentoId?: string | null;
}

export async function registrarExperiencia(ctx: ContextoAuditoria, funcionarioId: string, datos: DatosExperiencia) {
  return conAuditoria(ctx, datos.esPropia ? "CREAR" : "RECONOCER", "Experiencia", async (tx) => {
    const creada = await tx.experiencia.create({
      data: {
        funcionarioId,
        institucion: datos.institucion,
        esPropia: datos.esPropia,
        fechaDesde: aDate(datos.fechaDesde),
        fechaHasta: datos.fechaHasta ? aDate(datos.fechaHasta) : null,
        jornadaHoras: datos.jornadaHoras ?? null,
        reconocidaEl: datos.reconocidaEl ? aDate(datos.reconocidaEl) : null,
        documentoId: datos.documentoId ?? null,
      },
    });
    return { resultado: creada, entidadId: creada.id, despues: creada };
  });
}

export interface DatosReconocerBienio {
  numero: number;
  fechaCumplido: FechaCivil;
  puntaje: number | string;
  reglaId: string;
  fechaReconocido: FechaCivil;
  decretoNumero: string;
  decretoFecha: FechaCivil;
  documentoId?: string | null;
}

/** Reconocimiento de un bienio calculado por el motor: crea el registro con su decreto (doc 13, F4). */
export async function reconocerBienio(ctx: ContextoAuditoria, funcionarioId: string, datos: DatosReconocerBienio) {
  return conAuditoria(ctx, "RECONOCER", "Bienio", async (tx) => {
    const existente = await tx.bienio.findUnique({ where: { funcionarioId_numero: { funcionarioId, numero: datos.numero } } });
    const data = {
      fechaReconocido: aDate(datos.fechaReconocido),
      decretoNumero: datos.decretoNumero,
      decretoFecha: aDate(datos.decretoFecha),
      documentoId: datos.documentoId ?? null,
    };
    const guardado = existente
      ? await tx.bienio.update({ where: { id: existente.id }, data })
      : await tx.bienio.create({
          data: { funcionarioId, numero: datos.numero, fechaCumplido: aDate(datos.fechaCumplido), puntaje: puntos(datos.puntaje).toFixed(2), reglaId: datos.reglaId, ...data },
        });
    return { resultado: guardado, entidadId: guardado.id, antes: existente ?? undefined, despues: guardado };
  });
}

export interface DatosCapacitacion {
  nombre: string;
  institucionDicta: string;
  tipo: TipoCapacitacion;
  horas: number;
  fechaInicio: FechaCivil;
  fechaTermino: FechaCivil;
  notaOEvaluacion?: number | string | null;
  aprobado: boolean;
  esOtraComuna: boolean;
  periodo: number;
  documentoId?: string | null;
}

/**
 * Registro de una capacitación (doc 13, F3): puntúa con la tabla vigente a su término y recalcula el reparto
 * del período (puntaje aplicado por actividad y excedentes) con el motor, en la misma transacción.
 */
export async function registrarCapacitacion(ctx: ContextoAuditoria, funcionarioId: string, datos: DatosCapacitacion, reglas: ConjuntoReglas) {
  return conAuditoria(ctx, "CREAR", "Capacitacion", async (tx) => {
    const funcionario = await tx.funcionario.findUniqueOrThrow({ where: { id: funcionarioId }, include: { apertura: true } });
    const entrada: CapacitacionEntrada = {
      horas: datos.horas,
      fechaTermino: datos.fechaTermino,
      aprobado: datos.aprobado,
      conNota: datos.notaOEvaluacion != null,
      periodo: datos.periodo,
    };
    const puntuada = puntuarActividad(entrada, reglas, funcionario.categoria);
    const creada = await tx.capacitacion.create({
      data: {
        funcionarioId,
        nombre: datos.nombre,
        institucionDicta: datos.institucionDicta,
        tipo: datos.tipo,
        horas: datos.horas,
        fechaInicio: aDate(datos.fechaInicio),
        fechaTermino: aDate(datos.fechaTermino),
        notaOEvaluacion: datos.notaOEvaluacion != null ? puntos(datos.notaOEvaluacion).toFixed(2) : null,
        aprobado: datos.aprobado,
        esOtraComuna: datos.esOtraComuna,
        periodo: datos.periodo,
        documentoId: datos.documentoId ?? null,
        puntajeCalculado: puntuada.puntaje.toFixed(2),
        puntajeAplicado: "0.00",
        reglaId: puntuada.reglaId,
      },
    });
    await sincronizarCapacitacion(tx, funcionarioId, reglas);
    const actualizada = await tx.capacitacion.findUniqueOrThrow({ where: { id: creada.id } });
    return { resultado: actualizada, entidadId: creada.id, despues: actualizada };
  });
}

/** Recalcula con el motor el puntaje aplicado de cada actividad y los excedentes del funcionario, y los persiste. */
export async function sincronizarCapacitacion(tx: ClienteTransaccion, funcionarioId: string, reglas: ConjuntoReglas, fechaCorte: FechaCivil = hoyEnChile()) {
  const funcionario = await tx.funcionario.findUniqueOrThrow({
    where: { id: funcionarioId },
    include: { apertura: true, capacitaciones: true },
  });
  const entradas: CapacitacionEntrada[] = funcionario.capacitaciones.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    horas: c.horas,
    fechaTermino: desdeDate(c.fechaTermino),
    aprobado: c.aprobado,
    conNota: c.notaOEvaluacion !== null,
    periodo: c.periodo,
    documentoId: c.documentoId,
  }));
  const apertura = funcionario.apertura
    ? {
        fecha: desdeDate(funcionario.apertura.fecha),
        nivel: funcionario.apertura.nivel,
        nivelDesde: desdeDate(funcionario.apertura.nivelDesde),
        puntajeTotal: funcionario.apertura.puntajeTotal.toString(),
        desglosado: funcionario.apertura.desglosado,
        puntajeCapacitacion: funcionario.apertura.puntajeCapacitacion?.toString() ?? null,
        excedentePendiente: funcionario.apertura.excedentePendiente?.toString() ?? null,
      }
    : null;
  // Corte al final del año en curso para que las actividades ya registradas con término futuro también se repartan
  const corte = fechaCorte > `${fechaCorte.slice(0, 4)}-12-31` ? fechaCorte : `${fechaCorte.slice(0, 4)}-12-31`;
  const resultado = calcularCapacitacion(entradas, corte, reglas, funcionario.categoria, apertura);

  for (const actividad of resultado.actividades) {
    if (!actividad.id) continue;
    await tx.capacitacion.update({
      where: { id: actividad.id },
      data: { puntajeCalculado: actividad.puntaje.toFixed(2), puntajeAplicado: actividad.puntajeAplicado.toFixed(2), reglaId: actividad.reglaId },
    });
  }
  await tx.excedenteCapacitacion.deleteMany({ where: { funcionarioId } });
  for (const e of resultado.excedentes) {
    await tx.excedenteCapacitacion.upsert({
      where: { funcionarioId_periodoOrigen_periodoDestino: { funcionarioId, periodoOrigen: e.periodoOrigen, periodoDestino: e.periodoDestino } },
      create: { funcionarioId, periodoOrigen: e.periodoOrigen, periodoDestino: e.periodoDestino, puntaje: e.puntaje.toFixed(2), caducadoEl: e.caducadoEl ? aDate(e.caducadoEl) : null },
      update: { puntaje: e.puntaje.toFixed(2), caducadoEl: e.caducadoEl ? aDate(e.caducadoEl) : null },
    });
  }
  return resultado;
}

export interface DatosEstudio {
  tipo: TipoEstudio;
  nombre: string;
  institucion: string;
  fechaObtencion: FechaCivil;
  reconocidoEl?: FechaCivil | null;
  puntaje?: number | string | null;
  beneficio?: string | null;
  documentoId?: string | null;
}

export async function registrarEstudio(ctx: ContextoAuditoria, funcionarioId: string, datos: DatosEstudio) {
  return conAuditoria(ctx, datos.reconocidoEl ? "RECONOCER" : "CREAR", "Estudio", async (tx) => {
    const creado = await tx.estudio.create({
      data: {
        funcionarioId,
        tipo: datos.tipo,
        nombre: datos.nombre,
        institucion: datos.institucion,
        fechaObtencion: aDate(datos.fechaObtencion),
        reconocidoEl: datos.reconocidoEl ? aDate(datos.reconocidoEl) : null,
        puntaje: datos.puntaje != null ? puntos(datos.puntaje).toFixed(2) : null,
        beneficio: datos.beneficio ?? null,
        documentoId: datos.documentoId ?? null,
      },
    });
    return { resultado: creado, entidadId: creado.id, despues: creado };
  });
}

export interface DatosCambioNivel {
  nivel: number;
  fechaDesde: FechaCivil;
  puntajeAlCambio: number | string;
  motivo: MotivoNivel;
  decretoNumero?: string | null;
  decretoFecha?: FechaCivil | null;
  documentoId?: string | null;
}

/** Cambio de nivel por decreto (doc 13, F5): cierra el nivel vigente el día anterior y abre el nuevo. */
export async function registrarCambioNivel(ctx: ContextoAuditoria, funcionarioId: string, datos: DatosCambioNivel) {
  return conAuditoria(ctx, "RECONOCER", "NivelHistorico", async (tx) => {
    const vigente = await tx.nivelHistorico.findFirst({ where: { funcionarioId, fechaHasta: null }, orderBy: { fechaDesde: "desc" } });
    if (vigente && desdeDate(vigente.fechaDesde) >= datos.fechaDesde) {
      throw new Error("La fecha del nuevo nivel debe ser posterior a la del nivel vigente.");
    }
    if (vigente) {
      await tx.nivelHistorico.update({ where: { id: vigente.id }, data: { fechaHasta: aDate(sumarDias(datos.fechaDesde, -1)) } });
    }
    const nuevo = await tx.nivelHistorico.create({
      data: {
        funcionarioId,
        nivel: datos.nivel,
        fechaDesde: aDate(datos.fechaDesde),
        puntajeAlCambio: puntos(datos.puntajeAlCambio).toFixed(2),
        motivo: datos.motivo,
        decretoNumero: datos.decretoNumero ?? null,
        decretoFecha: datos.decretoFecha ? aDate(datos.decretoFecha) : null,
        documentoId: datos.documentoId ?? null,
      },
    });
    return {
      resultado: nuevo,
      entidadId: nuevo.id,
      antes: vigente ? { nivel: vigente.nivel, fechaDesde: vigente.fechaDesde } : undefined,
      despues: { nivel: nuevo.nivel, fechaDesde: nuevo.fechaDesde, decretoNumero: nuevo.decretoNumero },
    };
  });
}
