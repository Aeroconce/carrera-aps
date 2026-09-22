// Diccionario de datos (doc 06, exportación integral): se genera desde prisma/schema.prisma leyendo modelos,
// columnas, tipos, relaciones y los comentarios `///` que documentan cada uno. Sin dependencias del cliente.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { crearLibro, escribir } from "./xlsx";

export interface ColumnaDiccionario {
  modelo: string;
  columna: string;
  tipo: string;
  obligatoria: boolean;
  lista: boolean;
  clave: string;
  descripcion: string;
}

export interface Diccionario {
  modelos: Array<{ nombre: string; tabla: string; descripcion: string }>;
  columnas: ColumnaDiccionario[];
  relaciones: Array<{ modelo: string; columna: string; apunta: string; campos: string }>;
  enums: Array<{ nombre: string; valores: string }>;
}

export function parsearEsquema(texto: string): Diccionario {
  const lineas = texto.split(/\r?\n/);
  const d: Diccionario = { modelos: [], columnas: [], relaciones: [], enums: [] };
  let comentario: string[] = [];
  let modelo: string | null = null;
  let enumActual: { nombre: string; valores: string[] } | null = null;
  let mapa = "";

  for (const cruda of lineas) {
    const linea = cruda.trim();
    if (linea.startsWith("///")) {
      comentario.push(linea.replace(/^\/\/\/\s?/, ""));
      continue;
    }
    const m = /^model\s+(\w+)\s*\{/.exec(linea);
    if (m) {
      modelo = m[1]!;
      mapa = modelo;
      d.modelos.push({ nombre: modelo, tabla: modelo, descripcion: comentario.join(" ") });
      comentario = [];
      continue;
    }
    const e = /^enum\s+(\w+)\s*\{/.exec(linea);
    if (e) {
      enumActual = { nombre: e[1]!, valores: [] };
      comentario = [];
      continue;
    }
    if (linea === "}") {
      if (modelo) {
        const registro = d.modelos.find((x) => x.nombre === modelo);
        if (registro) registro.tabla = mapa;
      }
      if (enumActual) d.enums.push({ nombre: enumActual.nombre, valores: enumActual.valores.join(", ") });
      modelo = null;
      enumActual = null;
      comentario = [];
      continue;
    }
    if (enumActual) {
      if (/^\w+$/.test(linea)) enumActual.valores.push(linea);
      continue;
    }
    if (!modelo || !linea || linea.startsWith("//")) {
      continue;
    }
    const mm = /^@@map\("([^"]+)"\)/.exec(linea);
    if (mm) {
      mapa = mm[1]!;
      continue;
    }
    if (linea.startsWith("@@")) continue;
    const c = /^(\w+)\s+([\w\[\]?]+)(.*)$/.exec(linea);
    if (!c) continue;
    const [, columna, tipoCrudo, resto] = c;
    const tipo = tipoCrudo!.replace(/[\[\]?]/g, "");
    const relacion = /@relation\(fields:\s*\[([^\]]+)\],\s*references:\s*\[([^\]]+)\]/.exec(resto ?? "");
    if (relacion) {
      d.relaciones.push({ modelo, columna: columna!, apunta: tipo, campos: `${relacion[1]} → ${tipo}.${relacion[2]}` });
      comentario = [];
      continue;
    }
    if (/^[A-Z]/.test(tipo) && !["String", "Int", "Boolean", "DateTime", "Decimal", "Json", "BigInt", "Float"].includes(tipo) && !d.enums.some((x) => x.nombre === tipo) && !/@db\./.test(resto ?? "")) {
      // Relación inversa (lista o referencia sin fields): no es columna
      if (tipoCrudo!.endsWith("[]") || !/@/.test(resto ?? "")) {
        comentario = [];
        continue;
      }
    }
    d.columnas.push({
      modelo,
      columna: columna!,
      tipo: tipoCrudo!.replace("?", ""),
      obligatoria: !tipoCrudo!.includes("?") && !tipoCrudo!.endsWith("[]"),
      lista: tipoCrudo!.endsWith("[]"),
      clave: /@id\b/.test(resto ?? "") ? "PK" : /@unique/.test(resto ?? "") ? "único" : "",
      descripcion: comentario.join(" "),
    });
    comentario = [];
  }
  return d;
}

export async function leerDiccionario(): Promise<Diccionario> {
  const ruta = path.join(process.cwd(), "prisma", "schema.prisma");
  return parsearEsquema(await readFile(ruta, "utf8"));
}

export async function diccionarioAXlsx(): Promise<Uint8Array> {
  const d = await leerDiccionario();
  const libro = crearLibro();
  const tablas = libro.addWorksheet("Tablas");
  tablas.columns = [
    { header: "Modelo", key: "nombre", width: 26 },
    { header: "Tabla", key: "tabla", width: 26 },
    { header: "Descripción", key: "descripcion", width: 100 },
  ];
  for (const m of d.modelos) tablas.addRow(m);
  const columnas = libro.addWorksheet("Columnas");
  columnas.columns = [
    { header: "Modelo", key: "modelo", width: 24 },
    { header: "Columna", key: "columna", width: 26 },
    { header: "Tipo", key: "tipo", width: 16 },
    { header: "Obligatoria", key: "obligatoria", width: 12 },
    { header: "Clave", key: "clave", width: 10 },
    { header: "Descripción", key: "descripcion", width: 90 },
  ];
  for (const c of d.columnas) columnas.addRow({ ...c, obligatoria: c.obligatoria ? "Sí" : "No" });
  const relaciones = libro.addWorksheet("Relaciones");
  relaciones.columns = [
    { header: "Modelo", key: "modelo", width: 24 },
    { header: "Campo", key: "columna", width: 24 },
    { header: "Apunta a", key: "apunta", width: 24 },
    { header: "Claves", key: "campos", width: 50 },
  ];
  for (const r of d.relaciones) relaciones.addRow(r);
  const enums = libro.addWorksheet("Enumeraciones");
  enums.columns = [
    { header: "Enumeración", key: "nombre", width: 26 },
    { header: "Valores", key: "valores", width: 100 },
  ];
  for (const e of d.enums) enums.addRow(e);
  for (const hoja of libro.worksheets) hoja.getRow(1).font = { bold: true };
  return escribir(libro);
}
