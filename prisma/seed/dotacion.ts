// Dotación ficticia de la demo (doc 08): 316 funcionarios generados de forma determinista que, sumados a los
// cuatro casos del doc 14, completan los 320 de la respuesta 6 del foro. Entran por la misma carga inicial que
// usará el Departamento (validarCargaInicial + importarCargaInicial, apertura al 31/12/2024) y después se
// registran con las operaciones auditadas de la aplicación los movimientos que hacen visibles los casos.
// Ningún nombre real: nombres y RUT generados con dígito verificador válido.

import { listarFuncionarios } from "../../src/lib/carrera/listado";
import { cargarReglas } from "../../src/lib/carrera/reglas";
import type { ContextoAuditoria } from "../../src/lib/db/auditado";
import { sincronizarAlertas } from "../../src/lib/db/alertas";
import { darDeBaja, reconocerBienio, registrarCambioNivel, registrarCapacitacion, registrarEstudio, registrarExperiencia } from "../../src/lib/db/carrera";
import { importarCargaInicial } from "../../src/lib/db/importacion";
import { prisma } from "../../src/lib/db/prisma";
import { desdeDate, diasEntre, hoyEnChile, sumarAnios, sumarDias, type FechaCivil } from "../../src/lib/fechas/civil";
import { validarCargaInicial } from "../../src/lib/importacion/validar";
import { generarRutConDv } from "../../src/lib/rut";

export const FECHA_SALDOS: FechaCivil = "2024-12-31";
const SEMILLA = 20260921;

// ---------------------------------------------------------------------------
// Generador determinista
// ---------------------------------------------------------------------------

function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMBRES_F = ["Valentina", "Camila", "Francisca", "Javiera", "Catalina", "Antonia", "Constanza", "Daniela", "Fernanda", "Isidora", "Josefa", "Martina", "Paula", "Rocío", "Sofía", "Trinidad", "Andrea", "Carolina", "Claudia", "Marcela", "Pamela", "Patricia", "Verónica", "Ximena", "Alejandra", "Bárbara", "Gabriela", "Loreto", "Macarena", "Natalia"];
const NOMBRES_M = ["Benjamín", "Matías", "Vicente", "Sebastián", "Tomás", "Joaquín", "Diego", "Felipe", "Ignacio", "Nicolás", "Cristóbal", "Maximiliano", "Rodrigo", "Gonzalo", "Andrés", "Cristian", "Francisco", "Jorge", "Luis", "Marcelo", "Mauricio", "Patricio", "Ricardo", "Sergio", "Álvaro", "Esteban", "Fabián", "Hernán", "Óscar", "Raúl"];
const APELLIDOS = ["González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda", "Morales", "Rodríguez", "López", "Fuentes", "Hernández", "Torres", "Araya", "Flores", "Espinoza", "Valenzuela", "Castillo", "Tapia", "Reyes", "Gutiérrez", "Castro", "Pizarro", "Álvarez", "Vásquez", "Sánchez", "Fernández", "Ramírez", "Carrasco", "Gómez", "Cortés", "Herrera", "Núñez", "Jara", "Vergara", "Rivera", "Figueroa", "Riquelme", "García", "Miranda", "Bravo", "Vera", "Molina", "Vega", "Campos", "Sandoval", "Orellana", "Cárdenas", "Olivares", "Alarcón", "Vidal", "Salazar", "Aguilera", "Navarro", "Leiva", "Escobar", "Peña"];

const CARGOS: Record<string, string[]> = {
  A: ["Médico", "Odontóloga", "Químico farmacéutico", "Bioquímica"],
  B: ["Enfermera", "Matrona", "Kinesiólogo", "Nutricionista", "Psicóloga", "Trabajadora social", "Tecnólogo médico", "Terapeuta ocupacional", "Fonoaudióloga"],
  C: ["Técnico en enfermería", "Técnico paramédico", "Técnico dental", "Técnico en farmacia"],
  D: ["Auxiliar paramédico", "Auxiliar de enfermería"],
  E: ["Administrativo", "Secretaria", "Digitador", "Encargado de SOME"],
  F: ["Auxiliar de servicio", "Conductor", "Estafeta", "Guardia"],
};
const DISTRIBUCION: Array<[string, number]> = [["A", 32], ["B", 76], ["C", 69], ["D", 57], ["E", 44], ["F", 38]];
const ESTABLECIMIENTOS = ["CESFAM Juan Cartes Arias", "CESFAM Sergio Lagos Olave", "CECOSF de Colcura", "Departamento de Salud de Lota"];

interface Plan {
  rut: string;
  nombres: string;
  apellidos: string;
  categoria: string;
  establecimiento: string;
  tipoContrato: string;
  fechaIngreso: FechaCivil;
  bienios: number;
  fechaUltimoBienio: FechaCivil;
  puntajeExperiencia: number;
  puntajeCapacitacion: number;
  grado: number;
  gradoDesde: FechaCivil;
  jornada: number;
  cargo: string;
  caso: string | null;
}

function nivelDe(puntaje: number): number {
  return Math.max(1, 15 - Math.floor(puntaje / 20));
}

function fechaAleatoria(azar: () => number, desde: number, hasta: number): FechaCivil {
  const anio = desde + Math.floor(azar() * (hasta - desde + 1));
  const mes = 1 + Math.floor(azar() * 12);
  const dia = 1 + Math.floor(azar() * 28);
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Ancla de bienios: k bienios cumplidos al 31/12/2024 desde la fecha de ingreso. */
function bieniosAl(fechaIngreso: FechaCivil, corte: FechaCivil): { k: number; ultimo: FechaCivil } {
  let k = 0;
  let ultimo = fechaIngreso;
  while (sumarAnios(fechaIngreso, 2 * (k + 1)) <= corte) {
    k++;
    ultimo = sumarAnios(fechaIngreso, 2 * k);
  }
  return { k, ultimo };
}

export function planificarDotacion(): Plan[] {
  const azar = mulberry32(SEMILLA);
  const planes: Plan[] = [];
  let correlativo = 0;
  for (const [categoria, cantidad] of DISTRIBUCION) {
    for (let i = 0; i < cantidad; i++) {
      correlativo++;
      const mujer = azar() < 0.62;
      const nombres = `${(mujer ? NOMBRES_F : NOMBRES_M)[Math.floor(azar() * 30)]} ${(mujer ? NOMBRES_F : NOMBRES_M)[Math.floor(azar() * 30)]}`;
      const apellidos = `${APELLIDOS[Math.floor(azar() * APELLIDOS.length)]} ${APELLIDOS[Math.floor(azar() * APELLIDOS.length)]}`;
      const r = azar();
      const fechaIngreso = r < 0.15 ? fechaAleatoria(azar, 1998, 2009) : r < 0.85 ? fechaAleatoria(azar, 2010, 2022) : fechaAleatoria(azar, 2023, 2024);
      const { k, ultimo } = bieniosAl(fechaIngreso, FECHA_SALDOS);
      const anios = Math.max(0, diasEntre(fechaIngreso, FECHA_SALDOS) / 365.25);
      const puntajeExperiencia = k * 10;
      const puntajeCapacitacion = Math.min(Math.round(anios * 8), Math.round(azar() * 6 + anios * (3 + azar() * 4)));
      const rc = azar();
      const tipoContrato = rc < 0.7 ? "Titular" : rc < 0.92 ? "Plazo fijo" : "Reemplazo";
      const cargos = CARGOS[categoria]!;
      planes.push({
        rut: generarRutConDv(14_000_000 + correlativo * 1_013 + Math.floor(azar() * 900)),
        nombres,
        apellidos,
        categoria,
        establecimiento: ESTABLECIMIENTOS[Math.floor(azar() * (categoria === "E" ? 4 : 3))]!,
        tipoContrato,
        fechaIngreso,
        bienios: k,
        fechaUltimoBienio: ultimo,
        puntajeExperiencia,
        puntajeCapacitacion,
        grado: nivelDe(puntajeExperiencia + puntajeCapacitacion),
        gradoDesde: k > 0 ? ultimo : fechaIngreso,
        jornada: azar() < 0.8 ? 44 : azar() < 0.5 ? 33 : 22,
        cargo: cargos[Math.floor(azar() * cargos.length)]!,
        caso: null,
      });
    }
  }

  // Casos del doc 08 (marcados en el cargo para que la comisión los encuentre)
  const hoy = hoyEnChile();
  let indice = 5;
  const tomar = (n: number, caso: string, ajustar: (p: Plan, i: number) => void) => {
    for (let i = 0; i < n; i++) {
      const p = planes[indice++]!;
      p.caso = caso;
      p.cargo = `${p.cargo} · Caso ${caso}`;
      ajustar(p, i);
      p.grado = Math.min(p.grado, nivelDe(p.puntajeExperiencia + p.puntajeCapacitacion));
    }
  };
  // 1. Bienio que se cumple en los próximos 30 días
  tomar(5, "bienio próximo", (p, i) => {
    p.fechaUltimoBienio = sumarAnios(sumarDias(hoy, 5 + i * 5), -2);
    p.fechaIngreso = sumarAnios(p.fechaUltimoBienio, -2 * Math.max(1, p.bienios));
    p.gradoDesde = p.fechaUltimoBienio;
  });
  // 2. Bienio cumplido hace 40 días sin reconocer
  tomar(5, "bienio sin reconocer", (p, i) => {
    p.fechaUltimoBienio = sumarAnios(sumarDias(hoy, -(40 + i * 3)), -2);
    p.fechaIngreso = sumarAnios(p.fechaUltimoBienio, -2 * Math.max(1, p.bienios));
    p.gradoDesde = p.fechaUltimoBienio;
  });
  // 3. Experiencia reconocida de otro Servicio de Salud (se registra después)
  tomar(3, "experiencia externa", () => {});
  // 4. Capacitación sobre el tope en 2025 (se registra después)
  tomar(10, "excedente 2025", () => {});
  // 5. Cadena de excedentes en tres períodos (se registra después)
  tomar(2, "excedente en cadena", () => {});
  // 6. Curso no aprobado (se registra después)
  tomar(5, "curso no aprobado", () => {});
  // 7. Categorías A y B con diplomado o magíster (se registra después)
  tomar(8, "estudios", (p) => {
    p.categoria = p.categoria === "A" || p.categoria === "B" ? p.categoria : "B";
  });
  // 8. A menos de 10 puntos del siguiente nivel
  tomar(5, "nivel próximo", (p, i) => {
    const total = p.puntajeExperiencia + p.puntajeCapacitacion;
    const siguiente = Math.floor(total / 20) * 20 + 20;
    p.puntajeCapacitacion = Math.max(0, siguiente - 8 + i - p.puntajeExperiencia);
  });
  // 9. Cumplen requisitos de ascenso sin decreto: el grado quedó un nivel por debajo del puntaje
  tomar(3, "cumple ascenso", (p) => {
    p.puntajeCapacitacion += 20;
    p.grado = Math.min(15, nivelDe(p.puntajeExperiencia + p.puntajeCapacitacion) + 1);
  });
  // 10. Cambio de nivel con decreto después de la apertura (se registra después)
  tomar(6, "cambio de nivel", () => {});
  // 11. Inactivos con fecha de egreso (se registra después)
  tomar(5, "inactivo", () => {});
  return planes;
}

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

export async function sembrarDotacion(ctx: ContextoAuditoria, institucionId: string): Promise<void> {
  const existentes = await prisma.funcionario.count({ where: { institucionId } });
  if (existentes >= 300) {
    console.log(`Dotación: ya hay ${existentes} funcionarios, se omite`);
    return;
  }
  const planes = planificarDotacion();
  const crudas = planes.map((p, i) => ({
    numero: i + 2,
    valores: {
      rut: p.rut,
      nombres: p.nombres,
      apellidos: p.apellidos,
      categoria: p.categoria,
      establecimiento: p.establecimiento,
      tipoContrato: p.tipoContrato,
      fechaIngreso: p.fechaIngreso,
      grado: String(p.grado),
      gradoDesde: p.gradoDesde,
      puntajeExperiencia: String(p.puntajeExperiencia),
      puntajeCapacitacion: String(p.puntajeCapacitacion),
      puntajeTotal: String(p.puntajeExperiencia + p.puntajeCapacitacion),
      fechaUltimoBienio: p.fechaUltimoBienio,
      bieniosReconocidos: String(p.bienios),
      excedentePendiente: "",
      jornadaHoras: String(p.jornada),
      cargo: p.cargo,
      correo: "",
    },
  }));
  const validacion = await validarCargaInicial(institucionId, crudas);
  if (validacion.errores.length > 0) {
    throw new Error(`La dotación generada no pasa la validación: ${JSON.stringify(validacion.errores.slice(0, 5))}`);
  }
  const resultado = await importarCargaInicial(ctx, institucionId, validacion.filas, { nombreArchivo: "dotacion-demo.xlsx", fechaSaldos: FECHA_SALDOS, fuente: "Planilla de demostración (dotación ficticia), saldos al 31/12/2024" });
  console.log(`Dotación: ${resultado.creados} funcionarios cargados por la carga inicial`);

  // Movimientos posteriores a la apertura, con las mismas operaciones auditadas de la aplicación
  const reglas = await cargarReglas(institucionId);
  const porRut = new Map((await prisma.funcionario.findMany({ where: { institucionId }, select: { id: true, rut: true, categoria: true, fechaIngreso: true } })).map((f) => [f.rut, f]));
  const azar = mulberry32(SEMILLA + 1);
  const cap = (nombre: string, horas: number, termino: FechaCivil, aprobado = true, conNota = true) => ({
    nombre,
    institucionDicta: azar() < 0.5 ? "Servicio de Salud Concepción" : "Universidad de Concepción",
    tipo: horas >= 120 ? ("DIPLOMADO" as const) : ("CURSO" as const),
    horas,
    fechaInicio: sumarDias(termino, -Math.max(7, Math.round(horas / 4))),
    fechaTermino: termino,
    notaOEvaluacion: conNota ? 5.5 + Math.round(azar() * 15) / 10 : null,
    aprobado,
    esOtraComuna: azar() < 0.3,
    periodo: Number(termino.slice(0, 4)),
  });

  for (const p of planes) {
    const f = porRut.get(p.rut);
    if (!f || !p.caso) continue;
    switch (p.caso) {
      case "experiencia externa":
        await registrarExperiencia(ctx, f.id, { institucion: "Servicio de Salud Talcahuano", esPropia: false, fechaDesde: sumarAnios(p.fechaIngreso, -3), fechaHasta: sumarDias(p.fechaIngreso, -1), reconocidaEl: "2025-03-15" });
        break;
      case "excedente 2025":
        await registrarCapacitacion(ctx, f.id, cap("Diplomado en gestión en salud", 180, "2025-06-30"), reglas);
        await registrarCapacitacion(ctx, f.id, cap("Curso de urgencias", 40, "2025-09-30"), reglas);
        await registrarCapacitacion(ctx, f.id, cap("Curso de calidad y seguridad del paciente", 40, "2025-11-15"), reglas);
        break;
      case "excedente en cadena":
        await registrarCapacitacion(ctx, f.id, cap("Diplomado en salud familiar", 200, "2025-05-30"), reglas);
        await registrarCapacitacion(ctx, f.id, cap("Diplomado en gestión de redes", 180, "2025-10-30"), reglas);
        await registrarCapacitacion(ctx, f.id, cap("Curso de liderazgo", 60, "2026-04-30"), reglas);
        break;
      case "curso no aprobado":
        await registrarCapacitacion(ctx, f.id, cap("Curso de RCP avanzado", 24, "2026-03-20", false), reglas);
        await registrarCapacitacion(ctx, f.id, cap("Curso de registro clínico", 20, "2026-05-10"), reglas);
        break;
      case "estudios":
        await registrarEstudio(ctx, f.id, { tipo: azar() < 0.5 ? "DIPLOMADO" : "MAGISTER", nombre: azar() < 0.5 ? "Diplomado en salud pública" : "Magíster en salud pública", institucion: "Universidad de Concepción", fechaObtencion: "2025-08-20", reconocidoEl: "2025-10-01" });
        break;
      case "cambio de nivel": {
        const nivelActual = p.grado;
        const nuevo = Math.max(1, nivelActual - 1);
        await registrarCambioNivel(ctx, f.id, { nivel: nuevo, fechaDesde: azar() < 0.5 ? "2025-07-01" : "2026-03-01", puntajeAlCambio: p.puntajeExperiencia + p.puntajeCapacitacion + 10, motivo: "ASCENSO", decretoNumero: `D-${300 + Math.floor(azar() * 600)}/2025`, decretoFecha: "2025-06-15" });
        break;
      }
      case "inactivo":
        await darDeBaja(ctx, f.id, { fechaEgreso: "2026-05-31", motivoEgreso: azar() < 0.5 ? "Renuncia voluntaria" : "Jubilación" });
        break;
      default:
        break;
    }
  }

  // Bienios posteriores a la apertura ya reconocidos por decreto en una parte de la dotación
  const rutsGenerados = new Set(planes.map((p) => p.rut));
  const funcionarios = await prisma.funcionario.findMany({ where: { institucionId, estado: "ACTIVO" }, include: { apertura: true } });
  let reconocidos = 0;
  for (const f of funcionarios) {
    // Solo la dotación generada: los casos del doc 14 (casos.ts) se conservan tal como están documentados
    if (!rutsGenerados.has(f.rut) || !f.apertura?.fechaUltimoBienio || azar() > 0.9) continue;
    const ultimo = desdeDate(f.apertura.fechaUltimoBienio);
    const siguiente = sumarAnios(ultimo, 2);
    if (siguiente <= FECHA_SALDOS || siguiente > sumarDias(hoyEnChile(), -60)) continue;
    const regla = reglas.vigente("PUNTOS_BIENIO", siguiente, f.categoria);
    await reconocerBienio(ctx, f.id, {
      numero: (f.apertura.bieniosReconocidos ?? 0) + 1,
      fechaCumplido: siguiente,
      puntaje: regla.parametros.puntos,
      reglaId: regla.id,
      fechaReconocido: sumarDias(siguiente, 20),
      decretoNumero: `D-${100 + reconocidos}/${siguiente.slice(0, 4)}`,
      decretoFecha: sumarDias(siguiente, 20),
    });
    reconocidos++;
  }
  console.log(`Dotación: ${reconocidos} bienios posteriores a la apertura reconocidos por decreto`);

  // Ascensos alcanzados después de la apertura: en la vida real el decreto sigue al puntaje; quedan pendientes
  // solo los casos marcados y los del doc 14. Así el módulo Carrera y la alerta NIVEL_ALCANZADO muestran pocos.
  const casosPendientes = new Set(planes.filter((p) => p.caso === "cumple ascenso").map((p) => p.rut));
  const hoyCivil = hoyEnChile();
  let ascensos = 0;
  for (const fila of await listarFuncionarios(institucionId, {}, hoyCivil)) {
    const f = fila.funcionario;
    if (!rutsGenerados.has(f.rut) || casosPendientes.has(f.rut) || !fila.estado.nivel.cumpleAscenso) continue;
    const ultimoBienio = fila.estado.bienios.bienios.filter((b) => !b.incluidoEnApertura).map((b) => b.fechaCumplido).sort().pop();
    const vigenteDesde = fila.estado.nivel.vigenteDesde ?? FECHA_SALDOS;
    let fechaDesde = ultimoBienio ? sumarDias(ultimoBienio, 15) : "2026-01-15";
    if (fechaDesde <= vigenteDesde) fechaDesde = sumarDias(vigenteDesde, 30);
    if (fechaDesde > hoyCivil) fechaDesde = hoyCivil;
    await registrarCambioNivel(ctx, f.id, {
      nivel: fila.estado.nivel.calculado,
      fechaDesde,
      puntajeAlCambio: fila.estado.puntaje.total.toString(),
      motivo: "ASCENSO",
      decretoNumero: `D-${700 + ascensos}/${fechaDesde.slice(0, 4)}`,
      decretoFecha: fechaDesde,
    });
    ascensos++;
  }
  console.log(`Dotación: ${ascensos} ascensos registrados por decreto`);

  const alertas = await sincronizarAlertas(ctx, institucionId);
  console.log(`Alertas: ${alertas.nuevas} nuevas, ${alertas.activas} activas`);
}
