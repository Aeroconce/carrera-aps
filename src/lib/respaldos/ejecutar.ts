// Respaldo de la base de datos (doc 07): pg_dump comprimido con gzip, cifrado con age si hay destinatario,
// hash SHA-256, y registro en la tabla Respaldo. Lo usan el script de cron (scripts/respaldo.ts) y el botón
// "Ejecutar respaldo ahora". pg_dump se busca en el PATH; si no está (desarrollo en Windows), se usa el
// contenedor `db` de Compose.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createGzip } from "node:zlib";
import { registrarRespaldo } from "@/lib/db/respaldos";
import type { ContextoAuditoria } from "@/lib/db/auditado";
import type { Respaldo } from "@/generated/prisma/client";

function marcaDeTiempo(fecha: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}${p(fecha.getMonth() + 1)}${p(fecha.getDate())}-${p(fecha.getHours())}${p(fecha.getMinutes())}${p(fecha.getSeconds())}`;
}

export interface Volcado {
  contenido: Buffer;
  origen: string;
}

function ejecutar(comando: string, args: string[], entrada?: Buffer): Promise<{ codigo: number | null; salida: Buffer; error: string; noEncontrado: boolean }> {
  return new Promise((resolver) => {
    const proceso = spawn(comando, args, { stdio: ["pipe", "pipe", "pipe"], shell: process.platform === "win32" });
    const trozos: Buffer[] = [];
    let error = "";
    let noEncontrado = false;
    proceso.stdout.on("data", (d: Buffer) => trozos.push(d));
    proceso.stderr.on("data", (d: Buffer) => (error += d.toString()));
    proceso.on("error", (e: NodeJS.ErrnoException) => {
      noEncontrado = e.code === "ENOENT";
      resolver({ codigo: null, salida: Buffer.alloc(0), error: e.message, noEncontrado });
    });
    proceso.on("close", (codigo) => resolver({ codigo, salida: Buffer.concat(trozos), error, noEncontrado: noEncontrado || /not recognized|no se reconoce|not found/i.test(error) }));
    if (entrada) proceso.stdin.end(entrada);
    else proceso.stdin.end();
  });
}

/** Volcado SQL de la base: pg_dump local o, si no existe, el del contenedor `db` de Compose. */
export async function volcarBase(): Promise<Volcado> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definida.");
  const local = await ejecutar("pg_dump", ["--dbname", url, "--no-owner", "--no-privileges"]);
  if (local.codigo === 0) return { contenido: local.salida, origen: "pg_dump" };
  if (!local.noEncontrado) throw new Error(`pg_dump falló: ${local.error.trim()}`);

  const { username, pathname } = new URL(url);
  const base = pathname.replace(/^\//, "");
  const docker = await ejecutar("docker", ["compose", "exec", "-T", "db", "pg_dump", "-U", username, "-d", base, "--no-owner", "--no-privileges"]);
  if (docker.codigo !== 0) throw new Error(`pg_dump no está disponible ni en el PATH ni en el contenedor db: ${docker.error.trim()}`);
  return { contenido: docker.salida, origen: "docker compose exec db pg_dump" };
}

function comprimir(contenido: Buffer): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    const gzip = createGzip({ level: 6 });
    const trozos: Buffer[] = [];
    gzip.on("data", (d: Buffer) => trozos.push(d));
    gzip.on("end", () => resolver(Buffer.concat(trozos)));
    gzip.on("error", rechazar);
    gzip.end(contenido);
  });
}

export interface ResultadoRespaldo {
  respaldo: Respaldo;
  origen: string;
  cifrado: boolean;
}

/** Ejecuta un respaldo de la base y lo registra. Un fallo también queda registrado (resultado ERROR). */
export async function ejecutarRespaldoBd(ctx?: ContextoAuditoria): Promise<ResultadoRespaldo> {
  const inicio = Date.now();
  const fecha = new Date();
  const carpeta = process.env.RESPALDOS_DIR || path.join(process.cwd(), "respaldos");
  await mkdir(carpeta, { recursive: true });
  const base = path.join(carpeta, `bd-${marcaDeTiempo(fecha)}.sql.gz`);

  try {
    const volcado = await volcarBase();
    let contenido = await comprimir(volcado.contenido);
    let destino = base;
    let cifrado = false;
    const destinatario = process.env.AGE_RECIPIENT;
    if (destinatario) {
      const age = await ejecutar("age", ["-r", destinatario], contenido);
      if (age.codigo === 0) {
        contenido = age.salida;
        destino = `${base}.age`;
        cifrado = true;
      } else if (!age.noEncontrado) {
        throw new Error(`age falló: ${age.error.trim()}`);
      }
    }
    await writeFile(destino, contenido);
    const tamano = (await stat(destino)).size;
    const hash = createHash("sha256").update(contenido).digest("hex");
    const respaldo = await registrarRespaldo(
      { fecha, tipo: "bd", destino, tamano, hash, resultado: "OK", duracionSeg: Math.max(1, Math.round((Date.now() - inicio) / 1000)) },
      ctx,
    );
    return { respaldo, origen: volcado.origen, cifrado };
  } catch (error) {
    const respaldo = await registrarRespaldo(
      { fecha, tipo: "bd", destino: base, tamano: 0, hash: "", resultado: "ERROR", duracionSeg: Math.max(1, Math.round((Date.now() - inicio) / 1000)) },
      ctx,
    );
    console.error("respaldo", error);
    return { respaldo, origen: "", cifrado: false };
  }
}
