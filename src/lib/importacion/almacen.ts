// Almacén temporal de importaciones validadas (doc 13 F13): entre la vista previa y la confirmación, las filas
// validadas esperan en un archivo del directorio temporal, identificadas por un token aleatorio y ligadas al
// usuario que las subió. Caducan a los 30 minutos.

import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FilaValidada } from "./validar";

export interface ImportacionPendiente {
  token: string;
  usuarioId: string;
  institucionId: string;
  nombreArchivo: string;
  creadaEn: number;
  filas: FilaValidada[];
}

const CADUCIDAD_MS = 30 * 60_000;
const carpeta = () => path.join(os.tmpdir(), "carrera-aps-importacion");
const rutaDe = (token: string) => path.join(carpeta(), `${token}.json`);

export async function guardarPendiente(datos: Omit<ImportacionPendiente, "token" | "creadaEn">): Promise<string> {
  await mkdir(carpeta(), { recursive: true });
  const token = randomBytes(16).toString("hex");
  const pendiente: ImportacionPendiente = { ...datos, token, creadaEn: Date.now() };
  await writeFile(rutaDe(token), JSON.stringify(pendiente), "utf8");
  return token;
}

export async function leerPendiente(token: string): Promise<ImportacionPendiente | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  try {
    const pendiente = JSON.parse(await readFile(rutaDe(token), "utf8")) as ImportacionPendiente;
    if (Date.now() - pendiente.creadaEn > CADUCIDAD_MS) {
      await borrarPendiente(token);
      return null;
    }
    return pendiente;
  } catch {
    return null;
  }
}

export async function borrarPendiente(token: string): Promise<void> {
  await rm(rutaDe(token), { force: true });
}
