// PDF con Playwright (doc 10): Chromium en el servidor imprime la misma vista HTML del reporte, así pantalla y
// PDF nunca divergen. Apaisado, con encabezado institucional y numeración de páginas.

import { chromium } from "playwright";

export interface OpcionesPdf {
  /** Texto del encabezado de cada página (institución y reporte) */
  encabezado: string;
  /** Texto del pie (fecha de corte y usuario) */
  pie: string;
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const ESTILO_PLANTILLA = "font-family: 'IBM Plex Sans', Arial, sans-serif; font-size: 8px; color: #5b6b75; width: 100%; padding: 0 10mm; display: flex; justify-content: space-between;";

export async function imprimirPdf(url: string, opciones: OpcionesPdf): Promise<Uint8Array> {
  const navegador = await chromium.launch({ headless: true });
  try {
    const pagina = await navegador.newPage();
    await pagina.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await pagina.emulateMedia({ media: "print" });
    const pdf = await pagina.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: "16mm", bottom: "14mm", left: "10mm", right: "10mm" },
      headerTemplate: `<div style="${ESTILO_PLANTILLA}"><span>${escaparHtml(opciones.encabezado)}</span><span>Carrera APS</span></div>`,
      footerTemplate: `<div style="${ESTILO_PLANTILLA}"><span>${escaparHtml(opciones.pie)}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    });
    return new Uint8Array(pdf);
  } finally {
    await navegador.close();
  }
}
