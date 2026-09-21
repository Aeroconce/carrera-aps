// Textos del área administrativa (doc 12). Los nombres de menú son los de las bases, en su orden.

export const textosShell = {
  producto: "Carrera APS",
  abrirMenu: "Abrir menú",
  notaDemo: "Datos de demostración; dotación ficticia",
  cerrarSesion: "Cerrar sesión",
  roles: {
    ADMIN: "Administración",
    SUPERVISION: "Supervisión",
    FUNCIONARIO: "Funcionario",
  },
  menu: {
    principal: [
      { href: "/", etiqueta: "Inicio", icono: "inicio" },
      { href: "/funcionarios", etiqueta: "Funcionarios", icono: "funcionarios" },
      { href: "/carrera", etiqueta: "Carrera", icono: "carrera" },
      { href: "/capacitaciones", etiqueta: "Capacitaciones", icono: "capacitaciones" },
      { href: "/calificaciones", etiqueta: "Calificaciones", icono: "calificaciones" },
      { href: "/reportes", etiqueta: "Reportes", icono: "reportes" },
      { href: "/alertas", etiqueta: "Alertas", icono: "alertas" },
      { href: "/documentos", etiqueta: "Documentos", icono: "documentos" },
      { href: "/parametros", etiqueta: "Parámetros", icono: "parametros" },
      { href: "/auditoria", etiqueta: "Auditoría", icono: "auditoria" },
      { href: "/respaldos", etiqueta: "Respaldos", icono: "respaldos" },
    ],
    administracion: [
      { href: "/importar", etiqueta: "Importar", icono: "importar" },
      { href: "/exportacion-integral", etiqueta: "Exportación integral", icono: "exportacion" },
      { href: "/usuarios", etiqueta: "Usuarios", icono: "usuarios" },
    ],
  },
  /** Rutas que puede ver SUPERVISION (lee, no edita): doc 05 */
  rutasSupervision: ["/", "/funcionarios", "/capacitaciones", "/reportes", "/alertas", "/documentos", "/auditoria"],
} as const;

export const textosInicio = {
  titulo: "Inicio",
  dotacion: "Dotación activa",
  porEstablecimiento: "Por establecimiento",
  porCategoria: "Por categoría",
  bieniosProximos: "Bienios próximos a cumplirse",
  en30: "30 días",
  en60: "60 días",
  en90: "90 días",
  cumplenAscenso: "Cumplen requisitos de ascenso",
  alertasActivas: "Alertas activas",
  verAlertas: "Ver alertas",
  verFuncionarios: "Ver funcionarios",
  funcionarios: "funcionarios",
  sinAlertas: "Sin alertas activas",
} as const;
