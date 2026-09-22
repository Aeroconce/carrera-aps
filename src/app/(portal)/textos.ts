// Textos del portal del funcionario (BT 10, doc 05 §15, doc 13 F14, doc 12: móvil primero, sin edición).

export const textosPortal = {
  titulo: "Mi carrera",
  producto: "Carrera APS",
  sinFuncionario: {
    titulo: "Tu cuenta no está asociada a un funcionario",
    texto: "Pide a la Encargada de Carrera Funcionaria que vincule tu usuario con tu ficha para ver tu carrera aquí.",
  },
  situacion: (fecha: string) => `Situación al ${fecha}`,
  resumen: {
    nivel: "Nivel actual",
    puntaje: "Puntaje acumulado",
    faltan: "Para el siguiente nivel",
    estimado: "Fecha estimada",
    sinProyeccion: "Sin proyección",
    nivelMaximo: "Nivel máximo alcanzado",
    desglose: (exp: string, cap: string, est: string) => `Experiencia ${exp} · Capacitación ${cap} · Estudios ${est}`,
    supuestos: "Supuestos",
  },
  secciones: {
    bienios: "Mis bienios",
    capacitaciones: "Mis capacitaciones",
    estudios: "Mis estudios",
    calificaciones: "Mis calificaciones",
    documentos: "Mis documentos",
  },
  bienios: {
    proximo: (fecha: string) => `Próximo bienio: ${fecha}`,
    sinProximo: "Sin período de experiencia vigente",
    reconocido: "Reconocido",
    pendiente: "Cumplido, en trámite de reconocimiento",
    enSaldo: "Incluido en el saldo de apertura",
    decreto: (numero: string) => `Decreto ${numero}`,
    puntos: (p: string) => `${p} puntos`,
    vacio: "Aún no completas tu primer bienio.",
  },
  capacitaciones: {
    horas: (h: number) => `${h} horas`,
    aprobada: "Aprobada",
    noAprobada: "No aprobada (0 puntos)",
    calculado: (p: string) => `Calculado ${p}`,
    aplicado: (p: string) => `aplicado ${p}`,
    periodo: (periodo: number, aplicado: string, tope: string, excedente: string) => `Período ${periodo}: ${aplicado} de ${tope} puntos aplicados${excedente !== "0" ? ` · excedente ${excedente}` : ""}`,
    vacio: "Sin capacitaciones registradas.",
    total: (p: string) => `Total de capacitación: ${p} puntos`,
  },
  estudios: {
    reconocido: (fecha: string) => `Reconocido el ${fecha}`,
    sinReconocer: "Pendiente de reconocimiento",
    beneficio: "Beneficio informativo",
    puntos: (p: string) => `${p} puntos`,
    vacio: "Sin estudios registrados.",
  },
  calificaciones: {
    lista: (lista: string | null) => (lista ? `Lista: ${lista}` : "Sin lista"),
    puntaje: (p: string) => `Puntaje final ${p}`,
    notas: (meritos: number, demeritos: number) => `${meritos} anotaciones de mérito · ${demeritos} de demérito`,
    acta: "Ver acta",
    vacio: "Sin calificaciones registradas.",
  },
  documentos: {
    descargar: "Descargar",
    vacio: "Sin documentos adjuntos.",
  },
  pie: "Datos de demostración; dotación ficticia",
  // Compatibilidad con la primera versión del portal
  proximamente: { titulo: "Portal en construcción", texto: "" },
} as const;
