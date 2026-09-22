// Calificaciones de la demo (doc 08): dos procesos cerrados (2024 y 2025) con la dotación calificada, 12
// anotaciones de mérito o demérito y un proceso 2026 abierto con calificaciones pendientes (alerta).

import { cargarReglas } from "../../src/lib/carrera/reglas";
import type { ContextoAuditoria } from "../../src/lib/db/auditado";
import { agregarNota, calificar, cambiarEstadoProceso, crearProceso, listaDe } from "../../src/lib/db/calificaciones";
import { prisma } from "../../src/lib/db/prisma";

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

export async function sembrarCalificaciones(ctx: ContextoAuditoria, institucionId: string): Promise<void> {
  if ((await prisma.procesoCalificacion.count({ where: { institucionId } })) > 0) {
    console.log("Calificaciones: ya existen procesos, se omite");
    return;
  }
  const azar = mulberry32(20260921 + 7);
  const reglas = await cargarReglas(institucionId);
  const funcionarios = await prisma.funcionario.findMany({ where: { institucionId, estado: "ACTIVO" }, select: { id: true, categoria: true, fechaIngreso: true } });

  let notas = 0;
  for (const anio of [2024, 2025]) {
    const proceso = await crearProceso(ctx, institucionId, { nombre: `Calificación ${anio}`, periodoDesde: `${anio}-01-01`, periodoHasta: `${anio}-12-31` });
    let calificados = 0;
    for (const f of funcionarios) {
      if (f.fechaIngreso > new Date(`${anio}-06-30T00:00:00.000Z`)) continue;
      const puntaje = Math.round((4.2 + azar() * 2.8) * 10) / 10;
      const lista = listaDe(reglas, `${anio}-12-31`, f.categoria, puntaje);
      const c = await calificar(ctx, { procesoId: proceso.id, funcionarioId: f.id, puntajeFinal: puntaje, lista, observaciones: null });
      calificados++;
      if (anio === 2025 && notas < 12 && azar() < 0.08) {
        const merito = azar() < 0.7;
        await agregarNota(ctx, c.id, { tipo: merito ? "MERITO" : "DEMERITO", descripcion: merito ? MERITOS[notas % MERITOS.length]! : DEMERITOS[notas % DEMERITOS.length]!, fecha: `${anio}-${String(3 + (notas % 9)).padStart(2, "0")}-15` });
        notas++;
      }
    }
    await cambiarEstadoProceso(ctx, proceso.id, "CERRADO");
    console.log(`Calificaciones: proceso ${anio} cerrado con ${calificados} calificados`);
  }
  const abierto = await crearProceso(ctx, institucionId, { nombre: "Calificación 2026", periodoDesde: "2026-01-01", periodoHasta: "2026-12-31" });
  let pendientes = 0;
  for (const [i, f] of funcionarios.entries()) {
    if (i % 15 === 0) {
      pendientes++;
      continue;
    }
    const puntaje = Math.round((4.2 + azar() * 2.8) * 10) / 10;
    await calificar(ctx, { procesoId: abierto.id, funcionarioId: f.id, puntajeFinal: puntaje, lista: listaDe(reglas, "2026-12-31", f.categoria, puntaje), observaciones: null });
  }
  console.log(`Calificaciones: ${notas} anotaciones y proceso 2026 abierto con ${pendientes} pendientes`);
}
