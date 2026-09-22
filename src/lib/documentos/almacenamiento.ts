// Almacenamiento de documentos adjuntos (doc 05 §7, doc 03 Documento): archivos en disco del servidor, fuera de
// /public (DOCUMENTOS_DIR), con nombre aleatorio; se sirven solo por la ruta autenticada de descarga.
// Tipos aceptados: PDF, JPG y PNG, verificados por sus primeros bytes, no solo por la extensión.

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const TAMANO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;

const TIPOS: Array<{ mime: string; extension: string; firma: (b: Uint8Array) => boolean }> = [
  { mime: "application/pdf", extension: "pdf", firma: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/png", extension: "png", firma: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", extension: "jpg", firma: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
];

export function carpetaDocumentos(): string {
  return process.env.DOCUMENTOS_DIR || path.join(process.cwd(), "documentos");
}

/** Detecta el tipo por los primeros bytes; null si no es PDF, PNG ni JPG. */
export function detectarTipo(contenido: Uint8Array): { mime: string; extension: string } | null {
  const t = TIPOS.find((x) => x.firma(contenido));
  return t ? { mime: t.mime, extension: t.extension } : null;
}

export interface ArchivoGuardado {
  ruta: string;
  mime: string;
  tamano: number;
  hash: string;
}

/** Guarda el contenido bajo <institucionId>/<uuid>.<ext> y devuelve la ruta relativa, tipo, tamaño y hash. */
export async function guardarArchivo(institucionId: string, contenido: Uint8Array): Promise<ArchivoGuardado> {
  const tipo = detectarTipo(contenido);
  if (!tipo) throw new Error("Tipo de archivo no permitido: solo PDF, JPG o PNG.");
  const relativa = path.posix.join(institucionId, `${randomUUID()}.${tipo.extension}`);
  const absoluta = path.join(carpetaDocumentos(), relativa);
  await mkdir(path.dirname(absoluta), { recursive: true });
  await writeFile(absoluta, contenido);
  return { ruta: relativa, mime: tipo.mime, tamano: contenido.byteLength, hash: createHash("sha256").update(contenido).digest("hex") };
}

export async function leerArchivo(ruta: string): Promise<Uint8Array> {
  const absoluta = path.join(carpetaDocumentos(), ruta);
  if (!absoluta.startsWith(path.resolve(carpetaDocumentos()))) throw new Error("Ruta fuera del almacenamiento.");
  return readFile(absoluta);
}

/** PDF mínimo válido con una o varias líneas de texto (solo ASCII: la fuente base no trae acentos): documentos ficticios de la demo. */
export function pdfMinimo(texto: string | string[]): Uint8Array {
  const lineas = (Array.isArray(texto) ? texto : [texto]).map((l) =>
    l
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7e]/g, " ")
      .replace(/[()\\]/g, " "),
  );
  const contenido = `BT /F1 12 Tf 16 TL 40 780 Td ${lineas.map((l, i) => `${i > 0 ? "T* " : ""}(${l}) Tj`).join(" ")} ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let cuerpo = "%PDF-1.4\n";
  const posiciones: number[] = [];
  objetos.forEach((o, i) => {
    posiciones.push(cuerpo.length);
    cuerpo += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = cuerpo.length;
  cuerpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posiciones.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
  cuerpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(cuerpo);
}
