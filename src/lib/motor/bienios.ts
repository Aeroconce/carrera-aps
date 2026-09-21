// Bienios (doc 04 §1, subcriterio 4): cada dos años de experiencia reconocida completan un bienio.
//
// Cómo se cuenta el servicio:
// - Se construye una línea de tiempo con los períodos que cuentan a la fecha de corte: los propios y los
//   externos ya reconocidos (reconocidaEl <= fechaCorte). Si el funcionario no tiene períodos registrados,
//   se asume uno propio y vigente desde su fecha de ingreso. Los traslapes cuentan una sola vez; las brechas
//   (renuncia y reingreso) no cuentan.
// - servicio(d) = días de servicio anteriores al día d. Con prorrateo por jornada, cada día vale
//   jornadaHoras / jornadaCompleta.
// - Un bienio se cumple el primer día d en que servicio(d) alcanza su meta. En modo "calendario" la meta
//   del bienio k es la distancia en días entre el ancla y su aniversario de 2k años (así una brecha corre la
//   fecha exactamente lo que duró y el 29 de febrero cae al 28). En modo "dias" la meta es k × dias.
// - Los bienios registrados (importados o reconocidos por decreto) son hechos: se respetan tal cual y el
//   motor calcula hacia adelante desde el último (doc 08). Con apertura (doc 04 §0), el ancla es la fecha del
//   último bienio reconocido que trae la planilla y los bienios anteriores a la apertura ya están en el saldo.
// - El puntaje de un bienio calculado es el de la regla PUNTOS_BIENIO vigente a su fecha cumplida.

import { anioDe, diasEntre, sumarAnios, sumarDias, type FechaCivil } from "../fechas/civil";
import { CERO, puntos, sumarPuntos, type Decimal } from "./puntaje";
import type { Categoria, ConjuntoReglas } from "./reglas";
import type { AperturaEntrada, BienioRegistrado, ExperienciaEntrada } from "./tipos";

export interface BienioCalculado {
  id?: string;
  numero: number;
  fechaCumplido: FechaCivil;
  fechaReconocido: FechaCivil | null;
  decretoNumero: string | null;
  documentoId: string | null;
  puntaje: Decimal;
  /** Regla aplicada a un bienio calculado; null si viene registrado */
  reglaId: string | null;
  origen: "registrado" | "calculado";
  /** true si su puntaje ya viene dentro del saldo de apertura y no se suma de nuevo */
  incluidoEnApertura: boolean;
}

export interface ResultadoBienios {
  bienios: BienioCalculado[];
  /** Bienios en total: los reconocidos según la apertura más los posteriores (para listados y reportes) */
  totalBienios: number;
  /** Parte de experiencia del saldo de apertura (0 si no hay apertura o no está desglosada) */
  puntajeApertura: Decimal;
  /** Bienios posteriores a la apertura (o todos, sin apertura) */
  puntajePosterior: Decimal;
  /** puntajeApertura + puntajePosterior */
  puntajeExperiencia: Decimal;
  /** Próximo bienio si hay un período de experiencia que siga vigente; null si no */
  proximoBienio: FechaCivil | null;
  /** Días de servicio (prorrateados) anteriores al día siguiente a la fecha de corte */
  diasServicio: number;
}

export interface EntradaBienios {
  categoria: Categoria;
  fechaIngreso: FechaCivil;
  experiencias: ExperienciaEntrada[];
  bienios: BienioRegistrado[];
  apertura?: AperturaEntrada | null;
}

interface Segmento {
  desde: FechaCivil;
  /** Primer día NO cubierto; null = abierto */
  hastaExclusivo: FechaCivil | null;
  factor: number;
}

const HORIZONTE_ANIOS = 60;

export function calcularBienios(funcionario: EntradaBienios, fechaCorte: FechaCivil, reglas: ConjuntoReglas): ResultadoBienios {
  const apertura = funcionario.apertura && funcionario.apertura.fecha <= fechaCorte ? funcionario.apertura : null;
  const prorrateo = reglas.parametrosODefecto("PRORRATEO_JORNADA", fechaCorte, funcionario.categoria);
  const experiencias: ExperienciaEntrada[] =
    funcionario.experiencias.length > 0
      ? funcionario.experiencias
      : [{ esPropia: true, fechaDesde: funcionario.fechaIngreso, fechaHasta: null }];
  const segmentos = construirSegmentos(experiencias, fechaCorte, prorrateo);
  const servicio = (dia: FechaCivil) => servicioAntesDe(segmentos, dia);

  const registrados = funcionario.bienios
    .filter((b) => b.fechaCumplido <= fechaCorte)
    .sort((a, b) => a.numero - b.numero)
    .map<BienioCalculado>((b) => ({
      id: b.id,
      numero: b.numero,
      fechaCumplido: b.fechaCumplido,
      fechaReconocido: b.fechaReconocido,
      decretoNumero: b.decretoNumero ?? null,
      documentoId: b.documentoId ?? null,
      puntaje: puntos(b.puntaje),
      reglaId: null,
      origen: "registrado",
      incluidoEnApertura: apertura !== null && b.fechaCumplido <= apertura.fecha,
    }));

  const bienios = [...registrados];
  const primerSegmento = segmentos[0];
  let proximoBienio: FechaCivil | null = null;

  if (primerSegmento) {
    // Ancla: el último bienio registrado o, con apertura, el último reconocido según la planilla
    const ultimoRegistrado = registrados[registrados.length - 1];
    let ancla: FechaCivil | null = null;
    let numeroBase = 0;
    if (ultimoRegistrado && (!apertura?.fechaUltimoBienio || ultimoRegistrado.fechaCumplido >= apertura.fechaUltimoBienio)) {
      ancla = ultimoRegistrado.fechaCumplido;
      numeroBase = ultimoRegistrado.numero;
    } else if (apertura?.fechaUltimoBienio) {
      ancla = apertura.fechaUltimoBienio;
      numeroBase = apertura.bieniosReconocidos ?? ultimoRegistrado?.numero ?? 0;
    } else if (apertura?.bieniosReconocidos) {
      numeroBase = apertura.bieniosReconocidos;
    }
    // Sin ancla conocida, las metas se miden desde el inicio del servicio y la numeración sigue a numeroBase
    const numeroEnAncla = ancla ? numeroBase : 0;
    const anclaEfectiva = ancla ?? primerSegmento.desde;
    const servicioBase = ancla ? servicio(ancla) : 0;
    const modo = reglas.vigente("DIAS_BIENIO", fechaCorte, funcionario.categoria).parametros;

    for (let k = numeroBase + 1; k <= numeroBase + HORIZONTE_ANIOS / 2; k++) {
      const pasos = k - numeroEnAncla;
      const meta =
        modo.modo === "calendario"
          ? servicioBase + diasEntre(anclaEfectiva, sumarAnios(anclaEfectiva, 2 * pasos))
          : servicioBase + pasos * modo.dias;
      const fecha = primerDiaConServicio(segmentos, meta);
      if (!fecha) break;
      if (fecha > fechaCorte) {
        proximoBienio = fecha;
        break;
      }
      // Un bienio calculado anterior a la apertura ya está dentro del saldo: se lista, no se suma
      const regla = reglas.vigente("PUNTOS_BIENIO", fecha, funcionario.categoria);
      bienios.push({
        numero: k,
        fechaCumplido: fecha,
        fechaReconocido: null,
        decretoNumero: null,
        documentoId: null,
        puntaje: puntos(regla.parametros.puntos),
        reglaId: regla.id,
        origen: "calculado",
        incluidoEnApertura: apertura !== null && fecha <= apertura.fecha,
      });
    }
  }

  const puntajeApertura = apertura?.desglosado && apertura.puntajeExperiencia != null ? puntos(apertura.puntajeExperiencia) : CERO;
  const puntajePosterior = sumarPuntos(bienios.filter((b) => !b.incluidoEnApertura).map((b) => b.puntaje));

  const enApertura = bienios.filter((b) => b.incluidoEnApertura).length;
  const totalBienios = Math.max(apertura?.bieniosReconocidos ?? 0, enApertura) + (bienios.length - enApertura);

  return {
    bienios,
    totalBienios,
    puntajeApertura,
    puntajePosterior,
    puntajeExperiencia: puntajeApertura.plus(puntajePosterior),
    proximoBienio,
    diasServicio: Math.round(servicio(sumarDias(fechaCorte, 1)) * 100) / 100,
  };
}

/** Línea de tiempo de servicio: segmentos elementales con el mayor factor de los períodos que los cubren. */
function construirSegmentos(
  experiencias: ExperienciaEntrada[],
  fechaCorte: FechaCivil,
  prorrateo: { activo: boolean; jornadaCompleta: number },
): Segmento[] {
  const periodos = experiencias
    .filter((e) => e.esPropia || (e.reconocidaEl != null && e.reconocidaEl <= fechaCorte))
    .map((e) => {
      if (e.fechaHasta !== null && e.fechaHasta < e.fechaDesde) {
        throw new Error(`Experiencia con fecha de término anterior al inicio (${e.fechaDesde} → ${e.fechaHasta})`);
      }
      const factor =
        prorrateo.activo && e.jornadaHoras != null && e.jornadaHoras > 0
          ? Math.min(1, e.jornadaHoras / prorrateo.jornadaCompleta)
          : 1;
      return { desde: e.fechaDesde, hastaExclusivo: e.fechaHasta === null ? null : sumarDias(e.fechaHasta, 1), factor };
    });
  if (periodos.length === 0) return [];

  const fronteras = Array.from(
    new Set(periodos.flatMap((p) => (p.hastaExclusivo === null ? [p.desde] : [p.desde, p.hastaExclusivo]))),
  ).sort();
  const hayAbierto = periodos.some((p) => p.hastaExclusivo === null);
  const segmentos: Segmento[] = [];

  for (let i = 0; i < fronteras.length; i++) {
    const desde = fronteras[i]!;
    const hastaExclusivo = i + 1 < fronteras.length ? fronteras[i + 1]! : null;
    if (hastaExclusivo === null && !hayAbierto) break;
    const factor = periodos.reduce(
      (mayor, p) =>
        p.desde <= desde && (p.hastaExclusivo === null || (hastaExclusivo !== null && hastaExclusivo <= p.hastaExclusivo))
          ? Math.max(mayor, p.factor)
          : mayor,
      0,
    );
    if (factor > 0) segmentos.push({ desde, hastaExclusivo, factor });
  }
  return segmentos;
}

/** Días de servicio (prorrateados) anteriores al día `dia`. */
function servicioAntesDe(segmentos: Segmento[], dia: FechaCivil): number {
  let total = 0;
  for (const s of segmentos) {
    if (s.desde >= dia) break;
    const fin = s.hastaExclusivo === null || s.hastaExclusivo > dia ? dia : s.hastaExclusivo;
    total += diasEntre(s.desde, fin) * s.factor;
  }
  return total;
}

/** Primer día en que el servicio acumulado alcanza `meta`; null si nunca se alcanza. */
function primerDiaConServicio(segmentos: Segmento[], meta: number): FechaCivil | null {
  let acumulado = 0;
  for (const s of segmentos) {
    const duracion = s.hastaExclusivo === null ? Number.POSITIVE_INFINITY : diasEntre(s.desde, s.hastaExclusivo);
    const alFinal = acumulado + duracion * s.factor;
    if (alFinal >= meta) {
      const diasNecesarios = Math.ceil((meta - acumulado) / s.factor - 1e-9);
      return sumarDias(s.desde, Math.max(0, diasNecesarios));
    }
    acumulado = alFinal;
  }
  return null;
}

/** Año del período al que pertenece una fecha civil (períodos de año calendario). */
export function periodoDe(fecha: FechaCivil): number {
  return anioDe(fecha);
}
