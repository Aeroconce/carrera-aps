// Seed de la demo (doc 08): institución de Lota con sus establecimientos, reglas de demostración (doc 14) y
// los cuatro casos resueltos, cargados por las mismas operaciones auditadas que usa la aplicación.
// Determinista e idempotente: cada elemento se crea solo si no existe (por RUT, nombre o tipo de regla).
// Requiere `pnpm seed:bootstrap` (ADMIN e institución). Ejecutar: pnpm seed:demo

import "dotenv/config";
import { auth } from "../../src/lib/auth/auth";
import { sincronizarAlertas } from "../../src/lib/db/alertas";
import { conAuditoria } from "../../src/lib/db/auditado";
import { prisma } from "../../src/lib/db/prisma";
import { crearRegla } from "../../src/lib/db/reglas";
import { registrarRespaldo } from "../../src/lib/db/respaldos";
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
import { sembrarCalificaciones } from "./calificaciones";
import { sembrarDocumentos } from "./documentos";
import { sembrarDotacion } from "./dotacion";

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
  // Experiencias propias registradas con el nombre de arranque (versión anterior del seed): llevan el nombre real
  const renombradas = await prisma.experiencia.updateMany({ where: { esPropia: true, institucion: { not: INSTITUCION_DEMO.nombre }, funcionario: { institucionId: institucion.id } }, data: { institucion: INSTITUCION_DEMO.nombre } });
  if (renombradas.count > 0) console.log(`Experiencias propias renombradas: ${renombradas.count}`);

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
      ? await crearFuncionarioConApertura(ctx, datos, caso.apertura, INSTITUCION_DEMO.nombre)
      : await crearFuncionario(ctx, datos, reglas, INSTITUCION_DEMO.nombre);

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

  // 4b. Dotación ficticia de 316 funcionarios por la carga inicial (doc 08), con los casos visibles
  await sembrarDotacion(ctx, institucion.id);
  await sembrarDocumentos(ctx, institucion.id);
  await sembrarCalificaciones(ctx, institucion.id);

  // 5. Cuentas de demostración (doc 08, doc 11): SUPERVISION y FUNCIONARIO (asociado a María, caso 1).
  // Las contraseñas vienen de .env (scripts/generar-contrasenas-demo.ts); nunca se imprimen.
  const maria = await prisma.funcionario.findUnique({ where: { institucionId_rut: { institucionId: institucion.id, rut: CASOS_DEMO[0]!.funcionario.rut } } });
  const cuentas = [
    { email: process.env.SEED_SUPERVISION_EMAIL ?? "supervision.demo@carrera-aps.local", password: process.env.SEED_SUPERVISION_PASSWORD, name: "Supervisión (demo)", role: "SUPERVISION", funcionarioId: null },
    { email: process.env.SEED_FUNCIONARIO_EMAIL ?? "funcionario.demo@carrera-aps.local", password: process.env.SEED_FUNCIONARIO_PASSWORD, name: maria ? `${maria.nombres} ${maria.apellidos}` : "Funcionario (demo)", role: "FUNCIONARIO", funcionarioId: maria?.id ?? null },
  ];
  for (const cuenta of cuentas) {
    if (!cuenta.password) {
      console.log(`Cuenta ${cuenta.email}: sin contraseña en .env, se omite (ejecuta scripts/generar-contrasenas-demo.ts)`);
      continue;
    }
    const existente = await prisma.user.findUnique({ where: { email: cuenta.email } });
    if (!existente) {
      await auth.api.createUser({
        body: { email: cuenta.email, password: cuenta.password, name: cuenta.name, role: cuenta.role as "SUPERVISION" | "FUNCIONARIO", data: { institucionId: institucion.id, funcionarioId: cuenta.funcionarioId, debeCambiarPassword: false } },
      });
      console.log(`Cuenta ${cuenta.email}: creada (${cuenta.role})`);
    } else {
      const contexto = await auth.$context;
      await contexto.internalAdapter.updatePassword(existente.id, await contexto.password.hash(cuenta.password));
      await prisma.user.update({ where: { id: existente.id }, data: { role: cuenta.role, institucionId: institucion.id, funcionarioId: cuenta.funcionarioId, debeCambiarPassword: false, banned: false, name: cuenta.name } });
      console.log(`Cuenta ${cuenta.email}: actualizada`);
    }
  }

  // 5b. Alertas al día con todo lo sembrado (documentos adjuntos y calificaciones pendientes)
  const alertas = await sincronizarAlertas(ctx, institucion.id);
  console.log(`Alertas: ${alertas.activas} activas tras la sincronización final`);

  // 6. Evidencia de respaldos (doc 08): 30 respaldos diarios de la base, el último verificado por restauración.
  if ((await prisma.respaldo.count()) === 0) {
    const { createHash } = await import("node:crypto");
    const hoy = new Date();
    for (let i = 30; i >= 1; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i, 3, 0, 0);
      const marca = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}${String(fecha.getDate()).padStart(2, "0")}`;
      await registrarRespaldo({
        fecha,
        tipo: "bd",
        destino: `/data/respaldos/bd-${marca}-030000.sql.gz.age`,
        tamano: 2_400_000 + ((i * 7919) % 300_000),
        hash: createHash("sha256").update(`demo-respaldo-${marca}`).digest("hex"),
        resultado: "OK",
        duracionSeg: 4 + (i % 5),
        verificadoEl: i === 1 ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 9, 30, 0) : null,
      });
    }
    console.log("Respaldos: 30 registros de demostración");
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
