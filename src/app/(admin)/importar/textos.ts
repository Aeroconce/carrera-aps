// Textos del asistente de importación (doc 08, doc 13 F13, doc 12).

export const textosImportar = {
  titulo: "Importar",
  intro: "Carga inicial desde la planilla del Departamento: una fila por funcionario con su grado y puntaje vigentes. Cada fila crea el funcionario y su movimiento de apertura, auditado. Si alguna fila tiene errores, no se importa nada.",
  pasos: ["Descargar la plantilla", "Subir la planilla completa", "Revisar errores o vista previa", "Confirmar la carga"],
  plantilla: "Descargar plantilla",
  archivo: "Planilla (.xlsx)",
  fechaSaldos: "Fecha de los saldos",
  fechaSaldosAyuda: "Día al que corresponden grado y puntaje de la planilla: la víspera de la puesta en marcha.",
  validar: "Validar planilla",
  validando: "Validando…",
  faltantes: "Faltan columnas obligatorias en la planilla:",
  errores: (n: number, total: number) => (n === 1 ? `1 error en ${total} filas. Corrige la planilla y vuelve a subirla; no se importó nada.` : `${n} errores en ${total} filas. Corrige la planilla y vuelve a subirla; no se importó nada.`),
  columnasError: { fila: "Fila", columna: "Columna", mensaje: "Error" },
  vistaPrevia: (mostradas: number, total: number) => (total > mostradas ? `Vista previa: primeras ${mostradas} de ${total} filas válidas` : `Vista previa: ${total} ${total === 1 ? "fila válida" : "filas válidas"}`),
  columnasPrevia: { rut: "RUT", nombre: "Nombre", categoria: "Cat.", establecimiento: "Establecimiento", contrato: "Contrato", ingreso: "Ingreso", grado: "Grado", desde: "Desde", total: "Puntaje", exp: "Exp.", cap: "Cap.", bienio: "Último bienio", n: "N°" },
  confirmar: (n: number) => `Importar ${n} ${n === 1 ? "funcionario" : "funcionarios"}`,
  importando: "Importando…",
  otraPlanilla: "Subir otra planilla",
  resultado: {
    titulo: "Carga realizada",
    creados: (n: number) => `${n} ${n === 1 ? "funcionario creado" : "funcionarios creados"}`,
    omitidos: (n: number) => `${n} ${n === 1 ? "omitido" : "omitidos"}`,
    verFuncionarios: "Ver funcionarios",
    auditoria: "La carga quedó en Auditoría como IMPORTAR y cada funcionario con su movimiento de APERTURA.",
  },
  sinDesglose: "sin desglose",
} as const;
