// Seed de la demo (doc 08): institución de Lota con sus establecimientos, reglas de demostración (doc 14) y
// los cuatro casos resueltos, cargados por las mismas operaciones auditadas que usa la aplicación.
// Determinista e idempotente: cada elemento se crea solo si no existe (por RUT, nombre o tipo de regla).
// Requiere `pnpm seed:bootstrap` (ADMIN e institución). Ejecutar: pnpm seed:demo

import "dotenv/config";
import { conAuditoria } from "../../src/lib/db/auditado";
import { prisma } from "../../src/lib/db/prisma";
import { crearRegla } from "../../src/lib/db/reglas";
import {
  actualizarInstitucion,
  crearEstablecimiento,
  crearFuncionario,
  crearFuncionarioConApertura,
  reconocerBienio,
  registrarCambioNivel,
  registrarCapacitacion,
  registrarEstudio,
  registrarExperiencia,
} from "../../src/lib/db/carrera";
import { cargarReglas } from "../../src/lib/carrera/reglas";
import { REGLAS_DEMO } from "../../src/lib/reglas/demo";
import { CASOS_DEMO, ESTABLECIMIENTOS_DEMO, INSTITUCION_DEMO } from "./casos";

async function main(): Promise<void> {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  const institucion = await prisma.institucion.findFirst({ orderBy: { createdAt: "asc" } });
  if (!admin || !institucion) throw new Error("Falta el arranque: ejecuta `pnpm seed:bootstrap` primero.");
  const ctx = { usuarioId: admin.id };

  // 0. Las cuentas de la demo se entregan preconfiguradas: sin cambio obligatorio de contraseña en el primer ingreso
  if (admin.debeCambiarPassword) {
    await conAuditoria(ctx, "EDITAR", "User", async (tx) => {
      const actualizado = await tx.user.update({ where: { id: admin.id }, data: { debeCambiarPassword: false } });
      return { resultado: actualizado, entidadId: admin.id, antes: { debeCambiarPassword: true }, despues: { debeCambiarPassword: false }, detalle: "Cuenta de demostración preconfigurada" };
    });
    console.log("ADMIN: cuenta preconfigurada (sin cambio obligatorio de contraseña)");
  }

  // 1. Institución con el nombre real del Departamento (los datos de personas siguen siendo ficticios)
  if (institucion.nombre !== INSTITUCION_DEMO.nombre) {
    await actualizarInstitucion(ctx, institucion.id, INSTITUCION_DEMO);
    console.log(`Institución: ${INSTITUCION_DEMO.nombre}`);
  }

  // 2. Establecimientos reales de Lota (respuesta 6 del foro)
  const establecimientos = new Map<string, string>();
  for (const e of ESTABLECIMIENTOS_DEMO) {
    const existente = await prisma.establecimiento.findFirst({ where: { institucionId: institucion.id, nombre: e.nombre } });
    const fila = existente ?? (await crearEstablecimiento(ctx, institucion.id, { nombre: e.nombre, tipo: e.tipo }));
    establecimientos.set(e.clave, fila.id);
    if (!existente) console.log(`Establecimiento: ${e.nombre}`);
  }

  // 3. Reglas de demostración (doc 14) con sus vigencias, sin cerrar versiones existentes
  const existentes = await prisma.reglaCarrera.count({ where: { institucionId: institucion.id } });
  if (existentes === 0) {
    for (const r of REGLAS_DEMO) {
      await crearRegla(ctx, institucion.id, { tipo: r.tipo, categoria: r.categoria, vigenteDesde: r.vigenteDesde, vigenteHasta: r.vigenteHasta, parametros: r.parametros, fuente: r.fuente }, false);
    }
    console.log(`Reglas: ${REGLAS_DEMO.length} versiones cargadas`);
  }
  const reglas = await cargarReglas(institucion.id);

  // 4. Casos del doc 14
  for (const caso of CASOS_DEMO) {
    const existente = await prisma.funcionario.findUnique({ where: { institucionId_rut: { institucionId: institucion.id, rut: caso.funcionario.rut } } });
    if (existente) {
      console.log(`Caso ${caso.clave}: ya existe`);
      continue;
    }
    const datos = { ...caso.funcionario, institucionId: institucion.id, establecimientoId: establecimientos.get(caso.establecimiento)! };
    const funcionario = caso.apertura
      ? await crearFuncionarioConApertura(ctx, datos, caso.apertura, institucion.nombre)
      : await crearFuncionario(ctx, datos, reglas, institucion.nombre);

    for (const e of caso.experienciasExternas) {
      await registrarExperiencia(ctx, funcionario.id, { institucion: e.institucion, esPropia: false, fechaDesde: e.fechaDesde, fechaHasta: e.fechaHasta, reconocidaEl: e.reconocidaEl });
    }
    for (const est of caso.estudios) {
      await registrarEstudio(ctx, funcionario.id, est);
    }
    for (const c of caso.capacitaciones) {
      await registrarCapacitacion(ctx, funcionario.id, c, reglas);
    }
    for (const b of caso.bieniosReconocidosDespues) {
      const regla = reglas.vigente("PUNTOS_BIENIO", b.fechaCumplido, caso.funcionario.categoria);
      await reconocerBienio(ctx, funcionario.id, { ...b, puntaje: regla.parametros.puntos, reglaId: regla.id });
    }
    for (const n of caso.cambiosDeNivel) {
      await registrarCambioNivel(ctx, funcionario.id, { ...n, motivo: "ASCENSO" });
    }
    console.log(`Caso ${caso.clave}: ${caso.funcionario.nombres} ${caso.funcionario.apellidos} creado`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Error en el seed:", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
