"use server";

// Server actions del módulo Funcionarios (doc 05 módulo 2, doc 13 F3 a F5, doc 15): validan con Zod, exigen
// sesión ADMIN sobre la misma institución y escriben con las operaciones auditadas de src/lib/db/carrera.ts.
// Nunca lanzan al cliente: devuelven { ok, data } o { ok: false, error } con mensajes en español.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSesion, type SesionActual } from "@/lib/auth/sesion";
import { aEntradaMotor, cargarFuncionario, type FuncionarioConHistorial } from "@/lib/carrera/funcionario";
import { cargarReglas } from "@/lib/carrera/reglas";
import * as db from "@/lib/db/carrera";
import { prisma } from "@/lib/db/prisma";
import { hoyEnChile, parsearChileno, type FechaCivil } from "@/lib/fechas/civil";
import { calcularEstadoCarrera } from "@/lib/motor/estado";
import type { ConjuntoReglas } from "@/lib/motor/reglas";
import { limpiarRut, validarRut } from "@/lib/rut";
import { errorInterno, type RespuestaAccion } from "./tipos";

// ---------------------------------------------------------------------------
// Utilidades de validación
// ---------------------------------------------------------------------------

const fechaChilena = z.string().trim().transform((valor, ctx) => {
  try {
    return parsearChileno(valor);
  } catch {
    ctx.addIssue({ code: "custom", message: "Escribe la fecha como dd/mm/aaaa." });
    return z.NEVER;
  }
});
const fechaOpcional = z
  .string()
  .trim()
  .transform((valor, ctx) => {
    if (!valor) return null;
    try {
      return parsearChileno(valor);
    } catch {
      ctx.addIssue({ code: "custom", message: "Escribe la fecha como dd/mm/aaaa." });
      return z.NEVER;
    }
  });
const texto = (max: number) => z.string().trim().min(1, { error: "Este campo es obligatorio." }).max(max, { error: `Máximo ${max} caracteres.` });
const textoOpcional = (max: number) => z.string().trim().max(max, { error: `Máximo ${max} caracteres.` }).transform((v) => v || null);
const entero = (min: number, max: number) =>
  z.coerce.number({ error: "Escribe un número." }).int({ error: "Escribe un número entero." }).min(min, { error: `Mínimo ${min}.` }).max(max, { error: `Máximo ${max}.` });
const marcado = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
/** Número opcional escrito con coma o punto; vacío = null. */
const numeroOpcional = (min: number, max: number, enteroSolo = false) =>
  z
    .string()
    .trim()
    .transform((valor, ctx) => {
      if (!valor) return null;
      const n = Number(valor.replace(",", "."));
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: "custom", message: "Escribe un número." });
        return z.NEVER;
      }
      if (enteroSolo && !Number.isInteger(n)) {
        ctx.addIssue({ code: "custom", message: "Escribe un número entero." });
        return z.NEVER;
      }
      if (n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `Debe estar entre ${min} y ${max}.` });
        return z.NEVER;
      }
      return n;
    });
const rutValido = z.string().trim().transform((valor, ctx) => {
  const limpio = limpiarRut(valor);
  if (!validarRut(limpio)) {
    ctx.addIssue({ code: "custom", message: "El RUT no es válido. Revisa el dígito verificador." });
    return z.NEVER;
  }
  return limpio;
});

function objeto(fd: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of fd.entries()) {
    if (typeof valor === "string") salida[clave] = valor;
  }
  return salida;
}

function respuestaValidacion(error: z.ZodError): RespuestaAccion<never> {
  const campos = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return {
    ok: false,
    error: {
      codigo: "VALIDACION",
      mensaje: "Revisa los campos marcados.",
      campos: Object.fromEntries(Object.entries(campos).filter(([, v]) => v && v.length > 0).map(([k, v]) => [k, v as string[]])),
    },
  };
}

function respuestaError(codigo: string, mensaje: string, campos?: Record<string, string[]>): RespuestaAccion<never> {
  return { ok: false, error: { codigo, mensaje, campos } };
}

interface Contexto {
  sesion: SesionActual;
  funcionario: FuncionarioConHistorial;
  reglas: ConjuntoReglas;
}

/** Sesión ADMIN, funcionario de la misma institución y sus reglas. */
async function contextoDe(funcionarioId: string): Promise<Contexto | RespuestaAccion<never>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const funcionario = await cargarFuncionario(funcionarioId);
  if (!funcionario || funcionario.institucionId !== sesion.user.institucionId) {
    return respuestaError("NO_ENCONTRADO", "El funcionario no existe o no pertenece a tu institución.");
  }
  return { sesion, funcionario, reglas: await cargarReglas(funcionario.institucionId) };
}

function esError(x: unknown): x is RespuestaAccion<never> {
  return typeof x === "object" && x !== null && "ok" in x && (x as { ok: boolean }).ok === false;
}

// ---------------------------------------------------------------------------
// Capacitación (doc 13, F3)
// ---------------------------------------------------------------------------

const esquemaCapacitacion = z
  .object({
    nombre: texto(200),
    institucionDicta: texto(200),
    tipo: z.enum(["CURSO", "DIPLOMADO", "SEMINARIO", "PASANTIA", "OTRO"], { error: "Elige un tipo." }),
    horas: entero(1, 5000),
    fechaInicio: fechaChilena,
    fechaTermino: fechaChilena,
    notaOEvaluacion: numeroOpcional(1, 7),
    aprobado: marcado,
    esOtraComuna: marcado,
    periodo: numeroOpcional(2000, 2100, true),
  })
  .refine((d) => d.fechaTermino >= d.fechaInicio, { error: "La fecha de término no puede ser anterior a la de inicio.", path: ["fechaTermino"] });

export async function registrarCapacitacionAction(funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const ctx = await contextoDe(funcionarioId);
  if (esError(ctx)) return ctx;
  const datos = esquemaCapacitacion.safeParse(objeto(fd));
  if (!datos.success) return respuestaValidacion(datos.error);
  const d = datos.data;
  const anioTermino = Number(d.fechaTermino.slice(0, 4));
  const periodo = d.periodo ?? anioTermino;
  if (Math.abs(periodo - anioTermino) > 1) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { periodo: ["El período debe coincidir con el año de término (o el anterior o siguiente)."] });
  }
  const duplicada = ctx.funcionario.capacitaciones.some(
    (c) => c.nombre.toLowerCase() === d.nombre.toLowerCase() && c.institucionDicta.toLowerCase() === d.institucionDicta.toLowerCase() && c.fechaTermino.toISOString().slice(0, 10) === d.fechaTermino,
  );
  if (duplicada) return respuestaError("DUPLICADA", "Esta capacitación ya está registrada con el mismo nombre, institución y fecha de término.");
  try {
    const creada = await db.registrarCapacitacion(
      { usuarioId: ctx.sesion.user.id },
      funcionarioId,
      { ...d, periodo, notaOEvaluacion: d.notaOEvaluacion },
      ctx.reglas,
    );
    revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: creada.id } };
  } catch (error) {
    console.error("registrarCapacitacionAction", error);
    return errorInterno();
  }
}

// ---------------------------------------------------------------------------
// Reconocer bienio (doc 13, F4)
// ---------------------------------------------------------------------------

const esquemaReconocerBienio = z.object({
  numero: entero(1, 40),
  decretoNumero: texto(50),
  decretoFecha: fechaChilena,
});

export async function reconocerBienioAction(funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const ctx = await contextoDe(funcionarioId);
  if (esError(ctx)) return ctx;
  const datos = esquemaReconocerBienio.safeParse(objeto(fd));
  if (!datos.success) return respuestaValidacion(datos.error);
  const d = datos.data;
  // El bienio a reconocer es el que calcula el motor: no se confía en fechas ni puntos venidos del formulario
  const estado = calcularEstadoCarrera(aEntradaMotor(ctx.funcionario), hoyEnChile(), ctx.reglas);
  const bienio = estado.bienios.bienios.find((b) => b.numero === d.numero);
  if (!bienio) return respuestaError("NO_ENCONTRADO", "Ese bienio no está cumplido según el cálculo vigente.");
  if (bienio.fechaReconocido) return respuestaError("YA_RECONOCIDO", "Ese bienio ya está reconocido.");
  if (d.decretoFecha < bienio.fechaCumplido) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { decretoFecha: ["La fecha del decreto no puede ser anterior a la fecha en que se cumplió el bienio."] });
  }
  const regla = bienio.reglaId ?? ctx.reglas.vigente("PUNTOS_BIENIO", bienio.fechaCumplido, ctx.funcionario.categoria).id;
  try {
    const guardado = await db.reconocerBienio({ usuarioId: ctx.sesion.user.id }, funcionarioId, {
      numero: bienio.numero,
      fechaCumplido: bienio.fechaCumplido,
      puntaje: bienio.puntaje.toString(),
      reglaId: regla,
      fechaReconocido: d.decretoFecha,
      decretoNumero: d.decretoNumero,
      decretoFecha: d.decretoFecha,
    });
    revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: guardado.id } };
  } catch (error) {
    console.error("reconocerBienioAction", error);
    return errorInterno();
  }
}

// ---------------------------------------------------------------------------
// Cambio de nivel (doc 13, F5)
// ---------------------------------------------------------------------------

const esquemaCambioNivel = z.object({
  nivel: entero(1, 99),
  fechaDesde: fechaChilena,
  decretoNumero: texto(50),
  decretoFecha: fechaChilena,
  motivo: z.enum(["ASCENSO", "HOMOLOGACION", "AJUSTE"], { error: "Elige un motivo." }),
});

export async function registrarCambioNivelAction(funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const ctx = await contextoDe(funcionarioId);
  if (esError(ctx)) return ctx;
  const datos = esquemaCambioNivel.safeParse(objeto(fd));
  if (!datos.success) return respuestaValidacion(datos.error);
  const d = datos.data;
  const estado = calcularEstadoCarrera(aEntradaMotor(ctx.funcionario), hoyEnChile(), ctx.reglas);
  if (!estado.nivel.estructura.progresion.includes(d.nivel)) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { nivel: [`El nivel debe estar entre ${estado.nivel.estructura.nivelIngreso} y ${estado.nivel.estructura.nivelMaximo}.`] });
  }
  if (estado.nivel.vigenteDesde && d.fechaDesde <= estado.nivel.vigenteDesde) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { fechaDesde: ["La fecha debe ser posterior a la del nivel vigente."] });
  }
  try {
    const nuevo = await db.registrarCambioNivel({ usuarioId: ctx.sesion.user.id }, funcionarioId, {
      nivel: d.nivel,
      fechaDesde: d.fechaDesde,
      puntajeAlCambio: estado.puntaje.total.toString(),
      motivo: d.motivo,
      decretoNumero: d.decretoNumero,
      decretoFecha: d.decretoFecha,
    });
    revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: nuevo.id } };
  } catch (error) {
    console.error("registrarCambioNivelAction", error);
    return error instanceof Error && error.message.includes("posterior") ? respuestaError("VALIDACION", error.message) : errorInterno();
  }
}

// ---------------------------------------------------------------------------
// Estudios y experiencia
// ---------------------------------------------------------------------------

const esquemaEstudio = z.object({
  tipo: z.enum(["TITULO", "DIPLOMADO", "POSTITULO", "MAGISTER", "DOCTORADO"], { error: "Elige un tipo." }),
  nombre: texto(200),
  institucion: texto(200),
  fechaObtencion: fechaChilena,
  reconocidoEl: fechaOpcional,
});

export async function registrarEstudioAction(funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const ctx = await contextoDe(funcionarioId);
  if (esError(ctx)) return ctx;
  const datos = esquemaEstudio.safeParse(objeto(fd));
  if (!datos.success) return respuestaValidacion(datos.error);
  const d = datos.data;
  if (d.reconocidoEl && d.reconocidoEl < d.fechaObtencion) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { reconocidoEl: ["El reconocimiento no puede ser anterior a la obtención."] });
  }
  try {
    const creado = await db.registrarEstudio({ usuarioId: ctx.sesion.user.id }, funcionarioId, d);
    revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: creado.id } };
  } catch (error) {
    console.error("registrarEstudioAction", error);
    return errorInterno();
  }
}

const esquemaExperiencia = z
  .object({
    institucion: texto(200),
    esPropia: marcado,
    fechaDesde: fechaChilena,
    fechaHasta: fechaOpcional,
    jornadaHoras: numeroOpcional(1, 44, true),
    reconocidaEl: fechaOpcional,
  })
  .refine((d) => d.fechaHasta === null || d.fechaHasta >= d.fechaDesde, { error: "La fecha de término no puede ser anterior a la de inicio.", path: ["fechaHasta"] })
  .refine((d) => d.esPropia || d.reconocidaEl !== null, { error: "La experiencia externa necesita la fecha del acto que la reconoce.", path: ["reconocidaEl"] });

export async function registrarExperienciaAction(funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const ctx = await contextoDe(funcionarioId);
  if (esError(ctx)) return ctx;
  const datos = esquemaExperiencia.safeParse(objeto(fd));
  if (!datos.success) return respuestaValidacion(datos.error);
  try {
    const creada = await db.registrarExperiencia({ usuarioId: ctx.sesion.user.id }, funcionarioId, datos.data);
    revalidatePath(`/funcionarios/${funcionarioId}`);
    return { ok: true, data: { id: creada.id } };
  } catch (error) {
    console.error("registrarExperienciaAction", error);
    return errorInterno();
  }
}

// ---------------------------------------------------------------------------
// Datos del funcionario: alta, edición y baja (doc 05 módulo 2, BT 4.1)
// ---------------------------------------------------------------------------

const esquemaDatos = z.object({
  rut: rutValido,
  nombres: texto(120),
  apellidos: texto(120),
  categoria: z.enum(["A", "B", "C", "D", "E", "F"], { error: "Elige una categoría." }),
  tipoContrato: z.enum(["TITULAR", "PLAZO_FIJO", "REEMPLAZO"], { error: "Elige un tipo de contrato." }),
  fechaIngreso: fechaChilena,
  establecimientoId: texto(64),
  cargo: textoOpcional(120),
  jornadaHoras: numeroOpcional(1, 44, true),
  email: z.string().trim().transform((v) => v || null),
  fechaNacimiento: fechaOpcional,
});

const esquemaApertura = z.object({
  aperturaFecha: fechaChilena,
  aperturaNivel: entero(1, 99),
  aperturaNivelDesde: fechaChilena,
  aperturaPuntajeTotal: z.coerce.number({ error: "Escribe el puntaje total." }).min(0),
  aperturaDesglosado: marcado,
  aperturaPuntajeExperiencia: numeroOpcional(0, 10000),
  aperturaPuntajeCapacitacion: numeroOpcional(0, 10000),
  aperturaFechaUltimoBienio: fechaOpcional,
  aperturaBieniosReconocidos: numeroOpcional(0, 40, true),
  aperturaExcedentePendiente: numeroOpcional(0, 10000),
  aperturaFuente: texto(200),
});

export async function crearFuncionarioAction(fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const sesion = await exigirSesion({ roles: ["ADMIN"] });
  const institucionId = sesion.user.institucionId;
  if (!institucionId) return respuestaError("SIN_INSTITUCION", "Tu cuenta no está asociada a una institución.");
  const entrada = objeto(fd);
  const datos = esquemaDatos.safeParse(entrada);
  if (!datos.success) return respuestaValidacion(datos.error);
  const conApertura = entrada.conApertura === "on";
  const apertura = conApertura ? esquemaApertura.safeParse(entrada) : null;
  if (apertura && !apertura.success) return respuestaValidacion(apertura.error);

  const [institucion, establecimiento, existente] = await Promise.all([
    prisma.institucion.findUniqueOrThrow({ where: { id: institucionId } }),
    prisma.establecimiento.findFirst({ where: { id: datos.data.establecimientoId, institucionId } }),
    prisma.funcionario.findUnique({ where: { institucionId_rut: { institucionId, rut: datos.data.rut } } }),
  ]);
  if (!establecimiento) return respuestaError("VALIDACION", "Revisa los campos marcados.", { establecimientoId: ["Elige un establecimiento de tu institución."] });
  if (existente) return respuestaError("DUPLICADO", "Ya existe un funcionario con ese RUT.", { rut: ["Ya existe un funcionario con ese RUT."] });
  if (datos.data.email && !z.email().safeParse(datos.data.email).success) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { email: ["Escribe un correo válido."] });
  }

  const reglas = await cargarReglas(institucionId);
  const base: db.DatosFuncionario = { ...datos.data, institucionId };
  try {
    const creado = apertura?.success
      ? await db.crearFuncionarioConApertura({ usuarioId: sesion.user.id }, base, {
          fecha: apertura.data.aperturaFecha,
          nivel: apertura.data.aperturaNivel,
          nivelDesde: apertura.data.aperturaNivelDesde,
          puntajeTotal: apertura.data.aperturaPuntajeTotal,
          desglosado: apertura.data.aperturaDesglosado,
          puntajeExperiencia: apertura.data.aperturaDesglosado ? apertura.data.aperturaPuntajeExperiencia : null,
          puntajeCapacitacion: apertura.data.aperturaDesglosado ? apertura.data.aperturaPuntajeCapacitacion : null,
          fechaUltimoBienio: apertura.data.aperturaFechaUltimoBienio,
          bieniosReconocidos: apertura.data.aperturaBieniosReconocidos,
          excedentePendiente: apertura.data.aperturaExcedentePendiente,
          fuente: apertura.data.aperturaFuente,
        }, institucion.nombre)
      : await db.crearFuncionario({ usuarioId: sesion.user.id }, base, reglas, institucion.nombre);
    revalidatePath("/funcionarios");
    return { ok: true, data: { id: creado.id } };
  } catch (error) {
    console.error("crearFuncionarioAction", error);
    return errorInterno();
  }
}

export async function actualizarFuncionarioAction(funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const ctx = await contextoDe(funcionarioId);
  if (esError(ctx)) return ctx;
  const datos = esquemaDatos.safeParse(objeto(fd));
  if (!datos.success) return respuestaValidacion(datos.error);
  const d = datos.data;
  if (d.email && !z.email().safeParse(d.email).success) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { email: ["Escribe un correo válido."] });
  }
  const establecimiento = await prisma.establecimiento.findFirst({ where: { id: d.establecimientoId, institucionId: ctx.funcionario.institucionId } });
  if (!establecimiento) return respuestaError("VALIDACION", "Revisa los campos marcados.", { establecimientoId: ["Elige un establecimiento de tu institución."] });
  if (d.rut !== ctx.funcionario.rut) {
    const otro = await prisma.funcionario.findUnique({ where: { institucionId_rut: { institucionId: ctx.funcionario.institucionId, rut: d.rut } } });
    if (otro) return respuestaError("DUPLICADO", "Ya existe un funcionario con ese RUT.", { rut: ["Ya existe un funcionario con ese RUT."] });
  }
  try {
    await db.actualizarFuncionario({ usuarioId: ctx.sesion.user.id }, funcionarioId, d);
    revalidatePath(`/funcionarios/${funcionarioId}`);
    revalidatePath("/funcionarios");
    return { ok: true, data: { id: funcionarioId } };
  } catch (error) {
    console.error("actualizarFuncionarioAction", error);
    return errorInterno();
  }
}

const esquemaBaja = z.object({ fechaEgreso: fechaChilena, motivoEgreso: texto(300) });

export async function darDeBajaAction(funcionarioId: string, fd: FormData): Promise<RespuestaAccion<{ id: string }>> {
  const ctx = await contextoDe(funcionarioId);
  if (esError(ctx)) return ctx;
  if (ctx.funcionario.estado === "INACTIVO") return respuestaError("YA_INACTIVO", "El funcionario ya está dado de baja.");
  const datos = esquemaBaja.safeParse(objeto(fd));
  if (!datos.success) return respuestaValidacion(datos.error);
  const ingreso: FechaCivil = ctx.funcionario.fechaIngreso.toISOString().slice(0, 10);
  if (datos.data.fechaEgreso < ingreso) {
    return respuestaError("VALIDACION", "Revisa los campos marcados.", { fechaEgreso: ["La fecha de egreso no puede ser anterior al ingreso."] });
  }
  try {
    await db.darDeBaja({ usuarioId: ctx.sesion.user.id }, funcionarioId, datos.data);
    revalidatePath(`/funcionarios/${funcionarioId}`);
    revalidatePath("/funcionarios");
    return { ok: true, data: { id: funcionarioId } };
  } catch (error) {
    console.error("darDeBajaAction", error);
    return errorInterno();
  }
}
