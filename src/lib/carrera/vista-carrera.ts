// Vista transversal del motor para el módulo Carrera (doc 05 §3): bienios cumplidos sin decreto, quienes
// cumplen requisitos de ascenso y las proyecciones ordenadas por lo que falta. Solo lectura, calculada al vuelo.

import { diasEntre, hoyEnChile, type FechaCivil } from "@/lib/fechas/civil";
import type { Decimal } from "@/lib/motor/puntaje";
import { listarFuncionarios } from "./listado";

export interface FuncionarioResumen {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  categoria: string;
  establecimiento: string;
}

export interface BienioPorReconocer {
  funcionario: FuncionarioResumen;
  numero: number;
  fechaCumplido: FechaCivil;
  puntaje: Decimal;
  diasDesdeCumplido: number;
  /** "registrado" si viene importado sin decreto; "calculado" si lo detectó el motor */
  origen: "registrado" | "calculado";
}

export interface CumpleAscenso {
  funcionario: FuncionarioResumen;
  nivelVigente: number | null;
  vigenteDesde: FechaCivil | null;
  nivelCalculado: number;
  puntajeTotal: Decimal;
  umbral: Decimal;
}

export interface ProyeccionFila {
  funcionario: FuncionarioResumen;
  nivelVigente: number | null;
  nivelSiguiente: number;
  puntajeTotal: Decimal;
  puntajeFaltante: Decimal;
  fechaEstimada: FechaCivil | null;
  descripcion: string;
}

export interface VistaCarrera {
  fechaCorte: FechaCivil;
  totalFuncionarios: number;
  bienios: BienioPorReconocer[];
  ascensos: CumpleAscenso[];
  proyecciones: ProyeccionFila[];
}

export async function vistaCarrera(institucionId: string, fechaCorte: FechaCivil = hoyEnChile()): Promise<VistaCarrera> {
  const filas = await listarFuncionarios(institucionId, {}, fechaCorte);
  const bienios: BienioPorReconocer[] = [];
  const ascensos: CumpleAscenso[] = [];
  const proyecciones: ProyeccionFila[] = [];

  for (const { funcionario: f, estado } of filas) {
    if (estado.sinInformacion) continue;
    const resumen: FuncionarioResumen = { id: f.id, nombres: f.nombres, apellidos: f.apellidos, rut: f.rut, categoria: f.categoria, establecimiento: f.establecimiento.nombre };
    for (const b of estado.bienios.bienios) {
      if (b.incluidoEnApertura || b.fechaReconocido !== null) continue;
      bienios.push({ funcionario: resumen, numero: b.numero, fechaCumplido: b.fechaCumplido, puntaje: b.puntaje, diasDesdeCumplido: diasEntre(b.fechaCumplido, fechaCorte), origen: b.origen });
    }
    if (estado.nivel.cumpleAscenso) {
      ascensos.push({
        funcionario: resumen,
        nivelVigente: estado.nivel.vigente,
        vigenteDesde: estado.nivel.vigenteDesde,
        nivelCalculado: estado.nivel.calculado,
        puntajeTotal: estado.puntaje.total,
        umbral: estado.nivel.umbralCalculado,
      });
    }
    if (estado.proyeccion) {
      proyecciones.push({
        funcionario: resumen,
        nivelVigente: estado.nivel.vigente,
        nivelSiguiente: estado.proyeccion.nivelSiguiente,
        puntajeTotal: estado.puntaje.total,
        puntajeFaltante: estado.proyeccion.puntajeFaltante,
        fechaEstimada: estado.proyeccion.fechaEstimada,
        descripcion: estado.proyeccion.descripcion,
      });
    }
  }

  bienios.sort((a, b) => a.fechaCumplido.localeCompare(b.fechaCumplido) || a.funcionario.apellidos.localeCompare(b.funcionario.apellidos));
  ascensos.sort((a, b) => b.puntajeTotal.minus(a.puntajeTotal).toNumber());
  proyecciones.sort((a, b) => a.puntajeFaltante.minus(b.puntajeFaltante).toNumber() || (a.fechaEstimada ?? "9999").localeCompare(b.fechaEstimada ?? "9999"));

  return { fechaCorte, totalFuncionarios: filas.length, bienios, ascensos, proyecciones };
}
