// Exportación integral (doc 06, subcriterio 12, BT 6; doc 09: un botón que genera el ZIP en línea):
// dump completo de la base, diccionario de datos, un Excel por funcionario, el consolidado con los nueve
// reportes, los documentos adjuntos y un README con fecha, versión y hash de cada archivo.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync, zipSync, type Zippable } from "fflate";
import { listarFuncionarios } from "@/lib/carrera/listado";
import { prisma } from "@/lib/db/prisma";
import { leerArchivo } from "@/lib/documentos/almacenamiento";
import { formatearChileno, hoyEnChile } from "@/lib/fechas/civil";
import { DEFINICIONES } from "@/lib/reportes/definiciones";
import { generarReporte } from "@/lib/reportes/generar";
import { volcarBase } from "@/lib/respaldos/ejecutar";
import { diccionarioAXlsx } from "./diccionario";
import { libroFuncionario } from "./libro-funcionario";
import { agregarHoja, agregarHojaParametros, crearLibro, escribir } from "./xlsx";

export interface ResultadoIntegral {
  contenido: Uint8Array;
  nombre: string;
  archivos: number;
  tamano: number;
  hash: string;
  advertencias: string[];
}

async function version(): Promise<string> {
  try {
    const paquete = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as { version?: string };
    return paquete.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function generarExportacionIntegral(institucionId: string, usuario: { name: string }): Promise<ResultadoIntegral> {
  const hoy = hoyEnChile();
  const entradas: Zippable = {};
  const advertencias: string[] = [];
  const hashes: Array<[string, string]> = [];
  const agregar = (ruta: string, contenido: Uint8Array) => {
    entradas[ruta] = contenido;
    hashes.push([ruta, createHash("sha256").update(contenido).digest("hex")]);
  };

  // 1. Base de datos
  try {
    const volcado = await volcarBase();
    agregar("bd/dump.sql.gz", gzipSync(new Uint8Array(volcado.contenido), { level: 6 }));
  } catch (error) {
    advertencias.push(`No se pudo incluir el volcado de la base: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 2. Diccionario de datos
  agregar("bd/diccionario-de-datos.xlsx", await diccionarioAXlsx());

  // 3. Un libro por funcionario
  const filas = await listarFuncionarios(institucionId, { estado: "TODOS" }, hoy);
  const [calificaciones, documentos] = await Promise.all([
    prisma.calificacionFuncionario.findMany({ where: { funcionario: { institucionId } }, include: { proceso: true, notasMerito: true } }),
    prisma.documento.findMany({ where: { institucionId }, orderBy: { createdAt: "asc" } }),
  ]);
  for (const fila of filas) {
    const id = fila.funcionario.id;
    const extras = { calificaciones: calificaciones.filter((c) => c.funcionarioId === id), documentos: documentos.filter((d) => d.funcionarioId === id) };
    agregar(`funcionarios/${fila.funcionario.rut}.xlsx`, await libroFuncionario(fila, extras));
  }

  // 4. Consolidado: los nueve reportes a la fecha
  const consolidado = crearLibro();
  for (const definicion of DEFINICIONES.filter((d) => d.numero > 0).sort((a, b) => a.numero - b.numero)) {
    const reporte = await generarReporte(institucionId, definicion, { alcance: "dotacion", fecha: hoy, estado: "TODOS", pagina: 1 }, usuario);
    for (const seccion of reporte.secciones) agregarHoja(consolidado, { ...seccion, titulo: `${definicion.numero} ${seccion.titulo}`.slice(0, 31) });
    if (definicion.numero === 1) agregarHojaParametros(consolidado, reporte);
  }
  agregar("consolidado.xlsx", await escribir(consolidado));

  // 5. Documentos adjuntos, en carpetas por RUT
  const rutDe = new Map(filas.map((f) => [f.funcionario.id, f.funcionario.rut]));
  for (const d of documentos) {
    try {
      const carpeta = d.funcionarioId ? rutDe.get(d.funcionarioId) ?? "sin-funcionario" : "institucionales";
      agregar(`documentos/${carpeta}/${d.id}-${d.nombre}`, await leerArchivo(d.ruta));
    } catch {
      advertencias.push(`Documento no encontrado en disco: ${d.nombre}`);
    }
  }

  // 6. README con fecha, versión y hashes
  const lineas = [
    "Carrera APS - Exportación integral",
    `Fecha: ${formatearChileno(hoy)} (${new Date().toISOString()})`,
    `Versión del sistema: ${await version()}`,
    `Generada por: ${usuario.name}`,
    `Funcionarios: ${filas.length} · Documentos: ${documentos.length}`,
    "",
    "Contenido:",
    "  bd/dump.sql.gz               volcado completo de la base (pg_dump, gzip)",
    "  bd/diccionario-de-datos.xlsx tablas, columnas, tipos, relaciones y enumeraciones",
    "  funcionarios/<rut>.xlsx      un libro por funcionario con toda su carrera",
    "  consolidado.xlsx             los nueve reportes de las bases a la fecha",
    "  documentos/<rut>/            archivos adjuntos",
    "",
    ...(advertencias.length ? ["Advertencias:", ...advertencias.map((a) => `  - ${a}`), ""] : []),
    "SHA-256 de cada archivo:",
    ...hashes.map(([ruta, hash]) => `${hash}  ${ruta}`),
    "",
  ];
  entradas["README.txt"] = new TextEncoder().encode(lineas.join("\n"));

  const contenido = zipSync(entradas, { level: 6 });
  return {
    contenido,
    nombre: `exportacion-integral_${hoy}.zip`,
    archivos: Object.keys(entradas).length,
    tamano: contenido.byteLength,
    hash: createHash("sha256").update(contenido).digest("hex"),
    advertencias,
  };
}
