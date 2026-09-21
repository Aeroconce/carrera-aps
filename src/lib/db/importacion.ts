// Carga inicial (doc 08): por cada fila validada crea el funcionario con su movimiento de apertura (auditado como
// APERTURA por crearFuncionarioConApertura) y al final deja una entrada IMPORTAR con el resumen y el archivo.
// La usan el asistente de Importar y el seed de la demo (mismo camino que producción).

import type { FilaValidada } from "@/lib/importacion/validar";
import type { FechaCivil } from "@/lib/fechas/civil";
import { conAuditoria, type ContextoAuditoria } from "./auditado";
import { crearFuncionarioConApertura } from "./carrera";
import { prisma } from "./prisma";

export interface ResultadoImportacion {
  creados: number;
  omitidos: Array<{ fila: number; rut: string; motivo: string }>;
  ids: string[];
}

export async function importarCargaInicial(
  ctx: ContextoAuditoria,
  institucionId: string,
  filas: FilaValidada[],
  opciones: { nombreArchivo: string; fechaSaldos: FechaCivil; fuente?: string },
): Promise<ResultadoImportacion> {
  const institucion = await prisma.institucion.findUniqueOrThrow({ where: { id: institucionId }, select: { nombre: true } });
  const resultado: ResultadoImportacion = { creados: 0, omitidos: [], ids: [] };
  const fuente = opciones.fuente ?? `Carga inicial: ${opciones.nombreArchivo}`;

  for (const f of filas) {
    try {
      const creado = await crearFuncionarioConApertura(
        ctx,
        {
          institucionId,
          rut: f.rut,
          nombres: f.nombres,
          apellidos: f.apellidos,
          categoria: f.categoria,
          tipoContrato: f.tipoContrato,
          fechaIngreso: f.fechaIngreso,
          establecimientoId: f.establecimientoId,
          cargo: f.cargo,
          jornadaHoras: f.jornadaHoras,
          email: f.correo,
        },
        {
          fecha: opciones.fechaSaldos,
          nivel: f.grado,
          nivelDesde: f.gradoDesde,
          puntajeTotal: f.puntajeTotal,
          desglosado: f.puntajeExperiencia !== null && f.puntajeCapacitacion !== null,
          puntajeExperiencia: f.puntajeExperiencia,
          puntajeCapacitacion: f.puntajeCapacitacion,
          fechaUltimoBienio: f.fechaUltimoBienio,
          bieniosReconocidos: f.bieniosReconocidos,
          excedentePendiente: f.excedentePendiente,
          fuente,
        },
        institucion.nombre,
      );
      resultado.creados++;
      resultado.ids.push(creado.id);
    } catch (error) {
      resultado.omitidos.push({ fila: f.fila, rut: f.rut, motivo: error instanceof Error ? error.message : String(error) });
    }
  }

  await conAuditoria(ctx, "IMPORTAR", "Funcionario", async () => ({
    resultado: undefined,
    entidadId: institucionId,
    despues: { archivo: opciones.nombreArchivo, fechaSaldos: opciones.fechaSaldos, creados: resultado.creados, omitidos: resultado.omitidos.length },
    detalle: `${opciones.nombreArchivo}: ${resultado.creados} creados, ${resultado.omitidos.length} omitidos`,
  }));
  return resultado;
}
