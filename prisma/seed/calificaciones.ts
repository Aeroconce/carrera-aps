// Calificaciones de la demo (doc 08, BT 4.6): tres procesos (2024 y 2025 cerrados, 2026 abierto con pendientes)
// con comisión evaluadora, factores y subfactores ponderados, notas por subfactor, puntaje final calculado,
// lista según la regla, acta individual en PDF por calificación y 12 anotaciones de mérito o demérito.
// Determinista. Idempotente: si los procesos ya existen con factores se omite; si existen sin factores
// (versión anterior de la demo) se rehacen desde cero, actas incluidas.

import { rm } from "node:fs/promises";
import path from "node:path";
import { calcularPuntajeFinal } from "../../src/lib/calificaciones/puntaje";
import { cargarReglas } from "../../src/lib/carrera/reglas";
import type { ContextoAuditoria } from "../../src/lib/db/auditado";
import { aFactorBase, agregarIntegrante, agregarNota, calificar, cambiarEstadoProceso, copiarFactores, crearFactor, crearProceso, listaDe } from "../../src/lib/db/calificaciones";
import { crearDocumento } from "../../src/lib/db/documentos";
import { prisma } from "../../src/lib/db/prisma";
import { carpetaDocumentos, guardarArchivo, pdfMinimo } from "../../src/lib/documentos/almacenamiento";
import { formatearRut } from "../../src/lib/formato";

function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MERITOS = ["Destacada participación en campaña de vacunación", "Reconocimiento de la dirección por atención de usuarios", "Liderazgo en plan de mejora continua", "Cobertura voluntaria de turnos críticos"];
const DEMERITOS = ["Atraso reiterado en registro clínico", "Incumplimiento de protocolo de entrega de turno"];

// Comisión ficticia (ningún nombre real): presidencia, jefatura de personal y representación de los funcionarios
const PRESIDENCIA = { nombre: "Marcela Sanhueza Ortiz", rol: "Presidenta (Directora del Departamento de Salud)" };
const PERSONAL = { nombre: "Rodrigo Astete Muñoz", rol: "Integrante (Jefatura de Personal)" };
const COMISION: Record<number, Array<{ nombre: string; rol: string }>> = {
  2024: [PRESIDENCIA, PERSONAL, { nombre: "Claudia Neira Pincheira", rol: "Representante de la Asociación de Funcionarios" }],
  2025: [PRESIDENCIA, PERSONAL, { nombre: "Jorge Ulloa Riffo", rol: "Representante de la Asociación de Funcionarios" }],
  2026: [PRESIDENCIA, PERSONAL, { nombre: "Jorge Ulloa Riffo", rol: "Representante de la Asociación de Funcionarios" }],
};

// Factores de demostración (doc 14: escala 1 a 7 por subfactor, ponderación por factor)
const FACTORES: Array<{ nombre: string; ponderacion: number; subfactores: Array<[string, number]> }> = [
  { nombre: "Rendimiento", ponderacion: 40, subfactores: [["Cantidad de trabajo", 50], ["Calidad del trabajo", 50]] },
  { nombre: "Condiciones personales", ponderacion: 30, subfactores: [["Interés por el trabajo", 50], ["Capacidad para realizar el trabajo", 50]] },
  { nombre: "Comportamiento funcionario", ponderacion: 30, subfactores: [["Cumplimiento de normas e instrucciones", 50], ["Asistencia y puntualidad", 50]] },
];

const redondear1 = (n: number) => Math.round(n * 10) / 10;
const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Borra procesos, factores, comisión, calificaciones, anotaciones y actas (archivos incluidos) de la institución. */
async function limpiar(institucionId: string): Promise<void> {
  const actas = await prisma.documento.findMany({ where: { institucionId, tipo: "ACTA" }, select: { id: true, ruta: true } });
  await prisma.notaMerito.deleteMany({ where: { calificacion: { proceso: { institucionId } } } });
  await prisma.calificacionFuncionario.deleteMany({ where: { proceso: { institucionId } } });
  await prisma.factorCalificacion.deleteMany({ where: { proceso: { institucionId }, padreId: { not: null } } });
  await prisma.factorCalificacion.deleteMany({ where: { proceso: { institucionId } } });
  await prisma.comisionCalificacion.deleteMany({ where: { proceso: { institucionId } } });
  await prisma.procesoCalificacion.deleteMany({ where: { institucionId } });
  await prisma.documento.deleteMany({ where: { id: { in: actas.map((a) => a.id) } } });
  for (const a of actas) await rm(path.join(carpetaDocumentos(), a.ruta), { force: true });
  console.log(`Calificaciones: versión anterior eliminada (${actas.length} actas)`);
}

export async function sembrarCalificaciones(ctx: ContextoAuditoria, institucionId: string): Promise<void> {
  const procesos = await prisma.procesoCalificacion.count({ where: { institucionId } });
  if (procesos > 0) {
    const conFactores = await prisma.procesoCalificacion.count({ where: { institucionId, factores: { some: {} } } });
    if (conFactores === procesos) {
      console.log("Calificaciones: ya existen procesos con factores, se omite");
      return;
    }
    await limpiar(institucionId);
  }
  const azar = mulberry32(20260921 + 7);
  const reglas = await cargarReglas(institucionId);
  const funcionarios = await prisma.funcionario.findMany({
    where: { institucionId, estado: "ACTIVO" },
    select: { id: true, rut: true, nombres: true, apellidos: true, categoria: true, fechaIngreso: true },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  let notas = 0;
  let actas = 0;
  let anteriorId: string | null = null;
  for (const anio of [2024, 2025, 2026]) {
    const abierto = anio === 2026;
    const proceso = await crearProceso(ctx, institucionId, { nombre: `Calificación ${anio}`, periodoDesde: `${anio}-01-01`, periodoHasta: `${anio}-12-31` });
    const comision = COMISION[anio] ?? [];
    for (const integrante of comision) await agregarIntegrante(ctx, proceso.id, integrante);

    // Factores: creados en el primer proceso y copiados en los siguientes ("copiar del proceso anterior")
    if (anteriorId) {
      await copiarFactores(ctx, proceso.id, anteriorId);
    } else {
      for (const f of FACTORES) {
        const padre = await crearFactor(ctx, proceso.id, { nombre: f.nombre, ponderacion: f.ponderacion, padreId: null });
        for (const [nombre, ponderacion] of f.subfactores) await crearFactor(ctx, proceso.id, { nombre, ponderacion, padreId: padre.id });
      }
    }
    anteriorId = proceso.id;
    const factores = (await prisma.factorCalificacion.findMany({ where: { procesoId: proceso.id } })).map(aFactorBase);
    const subfactores = factores.filter((f) => f.padreId !== null);

    let calificados = 0;
    let pendientes = 0;
    for (const [i, f] of funcionarios.entries()) {
      if (!abierto && f.fechaIngreso > new Date(`${anio}-06-30T00:00:00.000Z`)) continue;
      if (abierto && i % 15 === 0) {
        pendientes++;
        continue;
      }
      const base = 4.2 + azar() * 2.8;
      const puntajes: Record<string, number> = {};
      for (const s of subfactores) puntajes[s.id] = acotar(redondear1(base + (azar() - 0.5) * 1.2), 1, 7);
      const calculo = calcularPuntajeFinal(factores, puntajes);
      const puntaje = calculo.puntajeFinal ?? redondear1(base);
      const lista = listaDe(reglas, `${anio}-12-31`, f.categoria, puntaje);
      const nombre = `${f.nombres} ${f.apellidos}`;

      const lineas = [
        `ACTA DE CALIFICACION ${anio} (documento de demostracion)`,
        "Departamento de Salud de Lota - Comision de calificacion",
        `Funcionario: ${nombre} - RUT ${formatearRut(f.rut)} - Categoria ${f.categoria}`,
        "",
        ...calculo.porFactor.flatMap((factor) => [
          `${factor.nombre} (${factor.ponderacion} %): ${factor.nota ?? "-"}`,
          ...subfactores.filter((s) => s.padreId === factor.factorId).map((s) => `   - ${s.nombre} (${s.ponderacion} %): ${puntajes[s.id]}`),
        ]),
        "",
        `Puntaje final: ${puntaje} - ${lista ?? "sin lista"}`,
        `Comision: ${comision.map((c) => `${c.nombre} (${c.rol})`).join("; ")}`,
      ];
      const guardado = await guardarArchivo(institucionId, pdfMinimo(lineas));
      const acta = await crearDocumento(ctx, {
        institucionId,
        funcionarioId: f.id,
        tipo: "ACTA",
        nombre: `Acta Calificación ${anio} - ${nombre}.pdf`,
        ruta: guardado.ruta,
        mime: guardado.mime,
        tamano: guardado.tamano,
        hash: guardado.hash,
      });
      actas++;
      const c = await calificar(ctx, { procesoId: proceso.id, funcionarioId: f.id, puntajeFinal: puntaje, lista, observaciones: null, puntajes, actaDocumentoId: acta.id });
      calificados++;
      if (anio === 2025 && notas < 12 && azar() < 0.08) {
        const merito = azar() < 0.7;
        await agregarNota(ctx, c.id, { tipo: merito ? "MERITO" : "DEMERITO", descripcion: merito ? MERITOS[notas % MERITOS.length]! : DEMERITOS[notas % DEMERITOS.length]!, fecha: `${anio}-${String(3 + (notas % 9)).padStart(2, "0")}-15` });
        notas++;
      }
    }
    if (!abierto) await cambiarEstadoProceso(ctx, proceso.id, "CERRADO");
    console.log(`Calificaciones: proceso ${anio} ${abierto ? `abierto con ${pendientes} pendientes` : "cerrado"}, ${calificados} calificados, ${comision.length} integrantes, ${factores.length} factores`);
  }
  console.log(`Calificaciones: ${notas} anotaciones y ${actas} actas`);
}
