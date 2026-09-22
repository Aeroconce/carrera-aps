// Textos del módulo Exportación integral (doc 05 §14, doc 06, subcriterio 12, BT 6).

export const textosExportacion = {
  titulo: "Exportación integral",
  intro: "Entrega completa de los datos de la institución en un solo archivo ZIP, la que exige la Base Técnica 6 al término del contrato. Se genera en línea al pulsar el botón y queda registrada en la auditoría.",
  contenido: {
    titulo: "Qué contiene",
    items: [
      "bd/dump.sql.gz: volcado completo de la base de datos PostgreSQL (pg_dump), comprimido.",
      "bd/diccionario-de-datos.xlsx: tablas, columnas, tipos, obligatoriedad, relaciones y enumeraciones, generado desde el esquema.",
      "funcionarios/<rut>.xlsx: un libro por funcionario con Datos, Experiencia, Bienios, Capacitaciones, Estudios, Niveles, Calificaciones y Documentos.",
      "consolidado.xlsx: los nueve reportes de las bases a la fecha de exportación.",
      "documentos/<rut>/: los archivos adjuntos, en carpetas por RUT.",
      "README.txt: fecha, versión del sistema, quién la generó y el hash SHA-256 de cada archivo.",
    ],
  },
  generar: "Generar exportación",
  nota: "Con la dotación de demostración tarda menos de un minuto; el archivo se descarga al terminar.",
  historial: "Exportaciones anteriores",
  columnas: { fecha: "Fecha", usuario: "Usuario", archivos: "Archivos", tamano: "Tamaño", hash: "SHA-256" },
  sinHistorial: "Aún no se ha generado ninguna exportación integral.",
} as const;
