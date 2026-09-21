// Token firmado de corta vida para la vista de impresión (doc 10): el servidor abre esa vista con Chromium para
// producir el PDF, sin cookies de sesión. El token lleva el reporte y sus filtros, firmados con HMAC-SHA256 y
// con vencimiento; nadie puede fabricar uno sin el secreto del servidor.

import { createHmac, timingSafeEqual } from "node:crypto";

const VIGENCIA_SEGUNDOS = 120;

function secreto(): string {
  const valor = process.env.BETTER_AUTH_SECRET;
  if (!valor) throw new Error("BETTER_AUTH_SECRET no está definida.");
  return valor;
}

function firmar(datos: string): string {
  return createHmac("sha256", secreto()).update(datos).digest("base64url");
}

export function firmarToken(carga: Record<string, unknown>, vigenciaSegundos: number = VIGENCIA_SEGUNDOS): string {
  const cuerpo = Buffer.from(JSON.stringify({ ...carga, exp: Math.floor(Date.now() / 1000) + vigenciaSegundos })).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo)}`;
}

export function verificarToken<T extends Record<string, unknown>>(token: string | undefined): T | null {
  if (!token) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = Buffer.from(firmar(cuerpo));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  try {
    const carga = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")) as T & { exp?: number };
    if (typeof carga.exp !== "number" || carga.exp < Math.floor(Date.now() / 1000)) return null;
    return carga;
  } catch {
    return null;
  }
}
