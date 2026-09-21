// Textos del módulo Capacitaciones (doc 05 §4, doc 12).

export const textosCapacitaciones = {
  titulo: "Capacitaciones",
  intro: "Actividades de capacitación de la dotación con su puntaje según la tabla vigente a la fecha de término, lo aplicado en cada período y el excedente que se arrastra.",
  registrar: "Registrar capacitación",
  funcionario: "Funcionario",
  elegir: "Elegir…",
  importar: "Carga masiva (Importar)",
  total: (n: number) => (n === 1 ? "1 actividad" : `${n} actividades`),
  pestanas: { listado: "Actividades", periodo: "Por período" },
  filtros: { buscar: "Funcionario", establecimiento: "Establecimiento", periodo: "Período", aprobada: "Aprobada", todos: "Todos", todas: "Todas", si: "Sí", no: "No", aplicar: "Filtrar", limpiar: "Limpiar" },
  columnas: { funcionario: "Funcionario", actividad: "Actividad", tipo: "Tipo", horas: "Horas", termino: "Término", aprobada: "Aprobada", periodo: "Período", calculado: "Calculado", aplicado: "Aplicado", excedente: "Excedente" },
  vacio: "No hay capacitaciones que coincidan con los filtros.",
  porPeriodo: {
    intro: (periodo: number) => `Resumen del período ${periodo}: puntaje calculado, arrastre recibido de períodos anteriores, tope, aplicado y excedente que pasa al siguiente.`,
    periodo: "Período",
    columnas: { funcionario: "Funcionario", actividades: "Actividades", calculado: "Calculado", arrastre: "Arrastre recibido", tope: "Tope", aplicado: "Aplicado", excedente: "Excedente" },
    vacio: "Sin capacitaciones en ese período.",
    ver: "Ver",
  },
  paginacion: { anterior: "Anterior", siguiente: "Siguiente", mostrando: (desde: number, hasta: number, total: number) => `${desde} a ${hasta} de ${total}` },
} as const;
