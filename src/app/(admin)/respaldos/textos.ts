// Textos del módulo Respaldos (doc 05 §12, doc 07, doc 13 F11).

export const textosRespaldos = {
  titulo: "Respaldos",
  intro: "Historial de respaldos con su evidencia (fecha, tamaño, destino, hash y resultado), el último verificado por restauración y la política publicada.",
  ejecutar: "Ejecutar respaldo ahora",
  ejecutando: "Respaldando…",
  confirmar: {
    titulo: "Ejecutar respaldo ahora",
    texto: "Se hará un volcado completo de la base de datos, comprimido y, si hay clave configurada, cifrado. Al terminar aparece en la tabla con su hash.",
    aceptar: "Ejecutar",
    cancelar: "Cancelar",
  },
  exito: (tamano: string, segundos: number) => `Respaldo completado: ${tamano} en ${segundos} s`,
  error: "El respaldo terminó con error; revisa el registro.",
  ultimoVerificado: "Último respaldo verificado por restauración",
  ninguno: "Ningún respaldo verificado todavía",
  columnas: { fecha: "Fecha", tipo: "Tipo", tamano: "Tamaño", destino: "Destino", resultado: "Resultado", duracion: "Duración", hash: "SHA-256", verificado: "Verificado" },
  tipos: { bd: "Base de datos", archivos: "Archivos" } as Record<string, string>,
  vacio: "Aún no hay respaldos registrados.",
  verificar: "Marcar verificado",
  dialogoVerificar: { titulo: "Verificado por restauración de prueba", fecha: "Fecha de la restauración", ayuda: "Formato AAAA-MM-DD; vacío = ahora.", enviar: "Marcar", exito: "Respaldo marcado como verificado" },
  politica: {
    titulo: "Política de respaldos",
    puntos: [
      "Base de datos: pg_dump diario a las 03:00, comprimido y cifrado (age), retención 30 días locales; copia semanal a almacenamiento separado en Chile, retención 12 meses.",
      "Archivos adjuntos: sincronización diaria al mismo destino.",
      "Verificación: restauración de prueba mensual en ambiente aislado, con registro en este módulo.",
      "Tiempo objetivo de recuperación: 4 horas; pérdida máxima de datos: 24 horas.",
      "Cada respaldo queda registrado con fecha, tipo, tamaño, destino, hash SHA-256, resultado y duración.",
    ],
  },
} as const;
