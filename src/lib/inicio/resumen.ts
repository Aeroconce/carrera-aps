// Datos de Inicio (doc 05 módulo 1): dotación, lo que exige un acto administrativo, lo que viene en los próximos
// meses, el avance del período y el estado del sistema. Todo sale del motor sobre la dotación activa (un solo
// recorrido) más unas pocas consultas; nada se persiste ni se estima.

import { listarFuncionarios } from "@/lib/carrera/listado";
import { prisma } from "@/lib/db/prisma";
import { anioDe, desdeDate, diasEntre, hoyEnChile, type FechaCivil } from "@/lib/fechas/civil";
import type { Categoria } from "@/generated/prisma/client";

export interface ResumenInicio {
  fechaCorte: FechaCivil;
  dotacionActiva: number;
  inactivos: number;
  antiguedadPromedioAnios: number;
  puntajePromedio: number;
  porEstablecimiento: Array<{ nombre: string; total: number }>;
  porCategoria: Array<{ categoria: Categoria; total: number }>;
  porNivel: Array<{ nivel: number; total: number }>;
  bieniosProximos: { en30: number; en60: number; en90: number };
  bieniosSinReconocer: number;
  proximosBienios: Array<{ id: string; nombre: string; establecimiento: string; numero: number; fecha: FechaCivil; dias: number }>;
  cumplenAscenso: number;
  cercaDeNivel: number;
  masCerca: Array<{ id: string; nombre: string; establecimiento: string; faltan: number; nivelSiguiente: number }>;
  alertasPorTipo: Array<{ tipo: string; total: number }>;
  calificacion: { id: string; nombre: string; calificados: number; pendientes: number; listas: Array<{ nombre: string; total: number }> } | null;
  capacitacion: { periodo: number; actividades: number; funcionarios: number; puntosAplicados: number; conTope: number };
  documentos: { total: number; funcionariosConDocumentos: number };
  actividadReciente: Array<{ id: string; fecha: Date; usuario: string; accion: string; entidad: string; detalle: string | null }>;
  respaldo: { fecha: Date; resultado: string } | null;
  ultimoVerificado: Date | null;
}

const PUNTOS_CERCA_DE_NIVEL = 10;

export async function resumenInicio(institucionId: string, fechaCorte: FechaCivil = hoyEnChile()): Promise<ResumenInicio> {
  const anio = anioDe(fechaCorte);
  const [filas, inactivos, procesoAbierto, totalDocumentos, funcionariosConDocumentos, actividad, respaldo, verificado] = await Promise.all([
    listarFuncionarios(institucionId, {}, fechaCorte),
    prisma.funcionario.count({ where: { institucionId, estado: "INACTIVO" } }),
    prisma.procesoCalificacion.findFirst({ where: { institucionId, estado: "ABIERTO" }, orderBy: { periodoDesde: "desc" }, include: { calificaciones: { select: { funcionarioId: true, lista: true } } } }),
    prisma.documento.count({ where: { institucionId } }),
    prisma.documento.findMany({ where: { institucionId, funcionarioId: { not: null } }, distinct: ["funcionarioId"], select: { funcionarioId: true } }),
    prisma.auditoria.findMany({ take: 6, orderBy: { fecha: "desc" }, include: { usuario: { select: { name: true } } } }),
    prisma.respaldo.findFirst({ orderBy: { fecha: "desc" }, select: { fecha: true, resultado: true } }),
    prisma.respaldo.findFirst({ where: { verificadoEl: { not: null } }, orderBy: { verificadoEl: "desc" }, select: { verificadoEl: true } }),
  ]);

  const porEstablecimiento = new Map<string, number>();
  const porCategoria = new Map<Categoria, number>();
  const porNivel = new Map<number, number>();
  const alertasPorTipo = new Map<string, number>();
  const bieniosProximos = { en30: 0, en60: 0, en90: 0 };
  const proximosBienios: ResumenInicio["proximosBienios"] = [];
  const masCerca: ResumenInicio["masCerca"] = [];
  let cumplenAscenso = 0;
  let sumaAntiguedad = 0;
  let sumaPuntaje = 0;
  const capacitacion = { periodo: anio, actividades: 0, funcionarios: 0, puntosAplicados: 0, conTope: 0 };

  for (const fila of filas) {
    const { funcionario, estado } = fila;
    const nombre = `${funcionario.nombres} ${funcionario.apellidos}`;
    const establecimiento = funcionario.establecimiento.nombre;
    porEstablecimiento.set(establecimiento, (porEstablecimiento.get(establecimiento) ?? 0) + 1);
    porCategoria.set(funcionario.categoria, (porCategoria.get(funcionario.categoria) ?? 0) + 1);
    const nivel = estado.nivel.vigente ?? estado.nivel.calculado;
    porNivel.set(nivel, (porNivel.get(nivel) ?? 0) + 1);
    sumaAntiguedad += diasEntre(desdeDate(funcionario.fechaIngreso), fechaCorte) / 365.25;
    sumaPuntaje += Number(estado.puntaje.total);

    const proximo = estado.bienios.proximoBienio;
    if (proximo) {
      const dias = diasEntre(fechaCorte, proximo);
      if (dias <= 30) bieniosProximos.en30++;
      if (dias <= 60) bieniosProximos.en60++;
      if (dias <= 90) bieniosProximos.en90++;
      if (dias >= 0 && dias <= 90) proximosBienios.push({ id: funcionario.id, nombre, establecimiento, numero: estado.bienios.totalBienios + 1, fecha: proximo, dias });
    }
    if (estado.nivel.cumpleAscenso) cumplenAscenso++;
    const faltan = estado.nivel.puntajeFaltante === null ? null : Number(estado.nivel.puntajeFaltante);
    if (!estado.nivel.cumpleAscenso && faltan !== null && faltan > 0 && faltan <= PUNTOS_CERCA_DE_NIVEL && estado.nivel.siguiente) {
      masCerca.push({ id: funcionario.id, nombre, establecimiento, faltan, nivelSiguiente: estado.nivel.siguiente.nivel });
    }
    for (const a of fila.alertas) alertasPorTipo.set(a.tipo, (alertasPorTipo.get(a.tipo) ?? 0) + 1);

    const actividades = estado.capacitacion.actividades.filter((a) => a.periodo === anio);
    if (actividades.length > 0) {
      capacitacion.actividades += actividades.length;
      capacitacion.funcionarios++;
    }
    const periodo = estado.capacitacion.periodos.find((p) => p.periodo === anio);
    if (periodo) {
      capacitacion.puntosAplicados += Number(periodo.aplicado);
      if (Number(periodo.tope) > 0 && Number(periodo.aplicado) >= Number(periodo.tope)) capacitacion.conTope++;
    }
  }

  const activos = new Set(filas.map((f) => f.funcionario.id));
  const calificacion = procesoAbierto
    ? (() => {
        const deActivos = procesoAbierto.calificaciones.filter((c) => activos.has(c.funcionarioId));
        const listas = new Map<string, number>();
        for (const c of deActivos) listas.set(c.lista ?? "Sin lista", (listas.get(c.lista ?? "Sin lista") ?? 0) + 1);
        return {
          id: procesoAbierto.id,
          nombre: procesoAbierto.nombre,
          calificados: deActivos.length,
          pendientes: filas.length - deActivos.length,
          listas: [...listas].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        };
      })()
    : null;

  return {
    fechaCorte,
    dotacionActiva: filas.length,
    inactivos,
    antiguedadPromedioAnios: filas.length ? Math.round((sumaAntiguedad / filas.length) * 10) / 10 : 0,
    puntajePromedio: filas.length ? Math.round(sumaPuntaje / filas.length) : 0,
    porEstablecimiento: [...porEstablecimiento].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total),
    porCategoria: (["A", "B", "C", "D", "E", "F"] as const).map((categoria) => ({ categoria, total: porCategoria.get(categoria) ?? 0 })),
    porNivel: [...porNivel].map(([nivel, total]) => ({ nivel, total })).sort((a, b) => b.nivel - a.nivel),
    bieniosProximos,
    bieniosSinReconocer: alertasPorTipo.get("BIENIO_PENDIENTE_RECONOCER") ?? 0,
    proximosBienios: proximosBienios.sort((a, b) => a.dias - b.dias || a.nombre.localeCompare(b.nombre, "es")).slice(0, 6),
    cumplenAscenso,
    cercaDeNivel: masCerca.length,
    masCerca: masCerca.sort((a, b) => a.faltan - b.faltan || a.nombre.localeCompare(b.nombre, "es")).slice(0, 5),
    alertasPorTipo: [...alertasPorTipo].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total),
    calificacion,
    capacitacion: { ...capacitacion, puntosAplicados: Math.round(capacitacion.puntosAplicados) },
    documentos: { total: totalDocumentos, funcionariosConDocumentos: funcionariosConDocumentos.length },
    actividadReciente: actividad.map((a) => ({ id: a.id, fecha: a.fecha, usuario: a.usuario.name, accion: a.accion, entidad: a.entidad, detalle: a.detalle })),
    respaldo,
    ultimoVerificado: verificado?.verificadoEl ?? null,
  };
}
