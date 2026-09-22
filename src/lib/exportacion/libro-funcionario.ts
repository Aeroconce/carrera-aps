// Un libro Excel por funcionario (doc 06, exportación integral): Datos, Experiencia, Bienios, Capacitaciones,
// Estudios, Niveles, Calificaciones y Documentos, con tipos conservados.

import type { FilaFuncionario } from "@/lib/carrera/listado";
import { desdeDate } from "@/lib/fechas/civil";
import { formatearRut, nombreCompleto } from "@/lib/formato";
import { ETIQUETAS } from "@/lib/reportes/etiquetas";
import type { Seccion } from "@/lib/reportes/tipos";
import type { CalificacionFuncionario, Documento, NotaMerito, ProcesoCalificacion } from "@/generated/prisma/client";
import { agregarHoja, crearLibro, escribir } from "./xlsx";

export interface ExtrasFuncionario {
  calificaciones: Array<CalificacionFuncionario & { proceso: ProcesoCalificacion; notasMerito: NotaMerito[] }>;
  documentos: Documento[];
}

const numero = (v: { toString(): string } | number | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));
const fecha = (v: Date | string | null | undefined) => (v ? (v instanceof Date ? desdeDate(v) : v) : null);

export function seccionesFuncionario(fila: FilaFuncionario, extras: ExtrasFuncionario): Seccion[] {
  const { funcionario: f, estado } = fila;
  const a = f.apertura;
  return [
    {
      id: "datos",
      titulo: "Datos",
      columnas: [
        { clave: "campo", titulo: "Campo", tipo: "texto", ancho: 32 },
        { clave: "valor", titulo: "Valor", tipo: "texto", ancho: 50 },
      ],
      filas: [
        ["RUT", formatearRut(f.rut)],
        ["Nombre", nombreCompleto(f)],
        ["Categoría", f.categoria],
        ["Establecimiento", f.establecimiento.nombre],
        ["Tipo de contrato", ETIQUETAS.contrato[f.tipoContrato]],
        ["Fecha de ingreso", fecha(f.fechaIngreso)],
        ["Cargo", f.cargo],
        ["Jornada (horas)", f.jornadaHoras],
        ["Estado", ETIQUETAS.estadoFuncionario[f.estado]],
        ["Fecha de egreso", fecha(f.fechaEgreso)],
        ["Nivel vigente", estado.sinInformacion ? null : (estado.nivel.vigente ?? estado.nivel.calculado)],
        ["Puntaje total", estado.sinInformacion ? null : numero(estado.puntaje.total)],
        ["Puntaje experiencia", estado.sinInformacion ? null : numero(estado.puntaje.experiencia)],
        ["Puntaje capacitación", estado.sinInformacion ? null : numero(estado.puntaje.capacitacion)],
        ["Puntaje estudios", estado.sinInformacion ? null : numero(estado.puntaje.estudios)],
        ["Apertura: saldos al", fecha(a?.fecha)],
        ["Apertura: puntaje total", numero(a?.puntajeTotal)],
        ["Apertura: experiencia", numero(a?.puntajeExperiencia)],
        ["Apertura: capacitación", numero(a?.puntajeCapacitacion)],
        ["Apertura: nivel", a?.nivel ?? null],
        ["Apertura: último bienio", fecha(a?.fechaUltimoBienio)],
        ["Apertura: bienios reconocidos", a?.bieniosReconocidos ?? null],
        ["Apertura: fuente", a?.fuente ?? null],
      ].map(([campo, valor]) => ({ campo: String(campo), valor: valor === null || valor === undefined ? null : typeof valor === "number" ? valor : String(valor) })),
    },
    {
      id: "experiencia",
      titulo: "Experiencia",
      columnas: [
        { clave: "institucion", titulo: "Institución", tipo: "texto", ancho: 30 },
        { clave: "tipo", titulo: "Tipo", tipo: "texto", ancho: 12 },
        { clave: "desde", titulo: "Desde", tipo: "fecha", ancho: 12 },
        { clave: "hasta", titulo: "Hasta", tipo: "fecha", ancho: 12 },
        { clave: "jornada", titulo: "Jornada (h)", tipo: "entero", ancho: 12 },
        { clave: "reconocidaEl", titulo: "Reconocida el", tipo: "fecha", ancho: 14 },
      ],
      filas: f.experiencias.map((e) => ({ institucion: e.institucion, tipo: e.esPropia ? "Propia" : "Reconocida", desde: fecha(e.fechaDesde), hasta: fecha(e.fechaHasta), jornada: e.jornadaHoras ?? null, reconocidaEl: fecha(e.reconocidaEl) })),
    },
    {
      id: "bienios",
      titulo: "Bienios",
      columnas: [
        { clave: "numero", titulo: "N°", tipo: "entero", ancho: 6 },
        { clave: "fechaCumplido", titulo: "Cumplido", tipo: "fecha", ancho: 12 },
        { clave: "fechaReconocido", titulo: "Reconocido", tipo: "fecha", ancho: 12 },
        { clave: "decreto", titulo: "Decreto", tipo: "texto", ancho: 14 },
        { clave: "puntaje", titulo: "Puntos", tipo: "decimal", ancho: 9 },
        { clave: "estado", titulo: "Estado", tipo: "texto", ancho: 24 },
      ],
      filas: estado.sinInformacion
        ? []
        : estado.bienios.bienios.map((b) => ({ numero: b.numero, fechaCumplido: b.fechaCumplido, fechaReconocido: b.fechaReconocido, decreto: b.decretoNumero, puntaje: b.incluidoEnApertura ? null : numero(b.puntaje), estado: b.incluidoEnApertura ? ETIQUETAS.bienioEstado.enSaldo : b.fechaReconocido ? ETIQUETAS.bienioEstado.reconocido : ETIQUETAS.bienioEstado.pendiente })),
    },
    {
      id: "capacitaciones",
      titulo: "Capacitaciones",
      columnas: [
        { clave: "nombre", titulo: "Actividad", tipo: "texto", ancho: 34 },
        { clave: "institucion", titulo: "Institución", tipo: "texto", ancho: 26 },
        { clave: "tipo", titulo: "Tipo", tipo: "texto", ancho: 11 },
        { clave: "horas", titulo: "Horas", tipo: "entero", ancho: 8 },
        { clave: "inicio", titulo: "Inicio", tipo: "fecha", ancho: 12 },
        { clave: "termino", titulo: "Término", tipo: "fecha", ancho: 12 },
        { clave: "aprobado", titulo: "Aprobada", tipo: "booleano", ancho: 10 },
        { clave: "periodo", titulo: "Período", tipo: "entero", ancho: 9 },
        { clave: "calculado", titulo: "Calculado", tipo: "decimal", ancho: 10 },
        { clave: "aplicado", titulo: "Aplicado", tipo: "decimal", ancho: 10 },
      ],
      filas: f.capacitaciones.map((c) => ({ nombre: c.nombre, institucion: c.institucionDicta, tipo: ETIQUETAS.tipoCapacitacion[c.tipo], horas: c.horas, inicio: fecha(c.fechaInicio), termino: fecha(c.fechaTermino), aprobado: c.aprobado, periodo: c.periodo, calculado: numero(c.puntajeCalculado), aplicado: numero(c.puntajeAplicado) })),
    },
    {
      id: "estudios",
      titulo: "Estudios",
      columnas: [
        { clave: "tipo", titulo: "Tipo", tipo: "texto", ancho: 12 },
        { clave: "nombre", titulo: "Nombre", tipo: "texto", ancho: 34 },
        { clave: "institucion", titulo: "Institución", tipo: "texto", ancho: 26 },
        { clave: "obtencion", titulo: "Obtención", tipo: "fecha", ancho: 12 },
        { clave: "reconocidoEl", titulo: "Reconocido el", tipo: "fecha", ancho: 14 },
        { clave: "puntaje", titulo: "Puntos", tipo: "decimal", ancho: 9 },
      ],
      filas: f.estudios.map((e) => ({ tipo: ETIQUETAS.tipoEstudio[e.tipo], nombre: e.nombre, institucion: e.institucion, obtencion: fecha(e.fechaObtencion), reconocidoEl: fecha(e.reconocidoEl), puntaje: numero(e.puntaje) })),
    },
    {
      id: "niveles",
      titulo: "Niveles",
      columnas: [
        { clave: "nivel", titulo: "Nivel", tipo: "entero", ancho: 8 },
        { clave: "desde", titulo: "Desde", tipo: "fecha", ancho: 12 },
        { clave: "hasta", titulo: "Hasta", tipo: "fecha", ancho: 12 },
        { clave: "motivo", titulo: "Motivo", tipo: "texto", ancho: 14 },
        { clave: "decreto", titulo: "Decreto", tipo: "texto", ancho: 14 },
        { clave: "decretoFecha", titulo: "Fecha decreto", tipo: "fecha", ancho: 14 },
        { clave: "puntaje", titulo: "Puntaje al cambio", tipo: "decimal", ancho: 16 },
      ],
      filas: f.niveles.map((n) => ({ nivel: n.nivel, desde: fecha(n.fechaDesde), hasta: fecha(n.fechaHasta), motivo: ETIQUETAS.motivoNivel[n.motivo], decreto: n.decretoNumero, decretoFecha: fecha(n.decretoFecha), puntaje: numero(n.puntajeAlCambio) })),
    },
    {
      id: "calificaciones",
      titulo: "Calificaciones",
      columnas: [
        { clave: "proceso", titulo: "Proceso", tipo: "texto", ancho: 22 },
        { clave: "puntaje", titulo: "Puntaje final", tipo: "decimal", ancho: 12 },
        { clave: "lista", titulo: "Lista", tipo: "texto", ancho: 10 },
        { clave: "meritos", titulo: "Méritos", tipo: "entero", ancho: 9 },
        { clave: "demeritos", titulo: "Deméritos", tipo: "entero", ancho: 10 },
        { clave: "observaciones", titulo: "Observaciones", tipo: "texto", ancho: 40 },
      ],
      filas: extras.calificaciones.map((c) => ({ proceso: c.proceso.nombre, puntaje: numero(c.puntajeFinal), lista: c.lista, meritos: c.notasMerito.filter((n) => n.tipo === "MERITO").length, demeritos: c.notasMerito.filter((n) => n.tipo === "DEMERITO").length, observaciones: c.observaciones })),
    },
    {
      id: "documentos",
      titulo: "Documentos",
      columnas: [
        { clave: "nombre", titulo: "Nombre", tipo: "texto", ancho: 40 },
        { clave: "tipo", titulo: "Tipo", tipo: "texto", ancho: 24 },
        { clave: "fecha", titulo: "Subido el", tipo: "fecha", ancho: 12 },
        { clave: "archivo", titulo: "Archivo en el ZIP", tipo: "texto", ancho: 50 },
        { clave: "hash", titulo: "SHA-256", tipo: "texto", ancho: 66 },
      ],
      filas: extras.documentos.map((d) => ({ nombre: d.nombre, tipo: d.tipo, fecha: desdeDate(d.createdAt), archivo: `documentos/${f.rut}/${d.id}-${d.nombre}`, hash: d.hash })),
    },
  ];
}

export async function libroFuncionario(fila: FilaFuncionario, extras: ExtrasFuncionario): Promise<Uint8Array> {
  const libro = crearLibro();
  for (const seccion of seccionesFuncionario(fila, extras)) agregarHoja(libro, seccion);
  return escribir(libro);
}
