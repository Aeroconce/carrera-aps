# 19 — Guía de la demostración para la comisión (una página)

Licitación 3019-20-LE26 · Departamento de Salud, I. Municipalidad de Lota · Sistema de Gestión de Carrera Funcionaria APS (Ley 19.378).

**URL:** https://demo-carrera.aeroconce.cl · Disponible las 24 horas durante toda la evaluación. Contacto técnico: (completar nombre y teléfono).

**Cuentas** (las contraseñas van en el correo; cada cuenta abre con la contraseña ya activa):

| Perfil | Usuario | Qué puede hacer |
|---|---|---|
| Administración | `admin.demo@carrera-aps.local` | Todo: fichas, carrera, reportes, parámetros, auditoría, respaldos, importación, exportación integral, usuarios |
| Supervisión | `supervision.demo@carrera-aps.local` | Consulta de funcionarios, capacitaciones, reportes, alertas, documentos y auditoría; sin edición |
| Funcionario | `funcionario.demo@carrera-aps.local` | Solo su portal (María Ignacia Pérez Soto): nivel, puntaje, bienios, capacitaciones, calificaciones y documentos |

Datos de demostración: 320 funcionarios ficticios en los cuatro establecimientos reales del Departamento (CESFAM Juan Cartes Arias, CESFAM Sergio Lagos Olave, CECOSF de Colcura y Departamento de Salud de Lota), con puesta en marcha ficticia el 01/01/2025 y saldos de apertura al 31/12/2024. Los parámetros cargados son de demostración; en producción se configura el reglamento comunal vigente.

## Dónde ver cada subcriterio de la pauta

| # | Subcriterio | Dónde | Qué verá |
|---|---|---|---|
| 1 | Sistema 100% web | Cualquier navegador actual | Sin instalación ni complementos |
| 2 | Acceso multiplataforma | La misma URL en PC, tablet y celular | Listados como tarjetas y formularios a una columna en celular; portal del funcionario pensado para el teléfono |
| 3 | Acceso seguro | Candado del navegador | Certificado TLS válido y HTTPS obligatorio; sesión de 30 minutos; 5 intentos de ingreso por 15 minutos |
| 4 | Cálculo automático de bienios | Funcionarios → María Ignacia Pérez Soto → Experiencia y bienios | Bienio 6 reconocido con decreto 145; próximo bienio 01/03/2028. Carrera → Bienios por reconocer: Carmen Riquelme (bienio 10 sin decreto) y reconocimiento masivo |
| 5 | Capacitaciones con puntaje | Misma ficha → Capacitaciones | 2025: calculado 11, aplicado 10, excedente 1 arrastrado a 2026. Capacitaciones → Por período: toda la dotación |
| 6 | Gestión de niveles | Misma ficha → Nivel y proyección; Carrera → Cumplen requisitos de ascenso | Nivel vigente 9 con 129 puntos. Pedro Lagos: cumple nivel 10 con nivel vigente 12; "Registrar cambio de nivel" con decreto |
| 7 | Proyección de cambio de nivel | Riel de la ficha y Carrera → Proyecciones | "129 puntos · faltan 11 · estimado marzo de 2028" con los supuestos |
| 8 | Alertas automáticas | Alertas (menú) y contador en el menú | Bienios próximos y sin reconocer, niveles alcanzados y próximos, calificaciones pendientes, documentos faltantes; atender con nota o descartar |
| 9 | Generación de reportes | Reportes | Los nueve reportes de las bases; cada uno por funcionario, por establecimiento o dotación completa |
| 10 | Reportes históricos | Reportes → Resumen de carrera → "Situación al" 31/12/2024 | María Pérez en nivel 10 con 105 puntos, calculado con las reglas vigentes a esa fecha |
| 11 | Exportación a Excel | Botones Excel, CSV y PDF en cada reporte | Descarga inmediata, completa, con tipos conservados y hoja "Parámetros" |
| 12 | Entrega al término del contrato | Exportación integral → Generar exportación | ZIP con volcado de la base, diccionario de datos, un Excel por funcionario, el consolidado, los documentos y el README con hashes |
| 13 | Alertas en reportes | Reportes → Panel de alertas | Las mismas alertas, filtrables y exportables |
| 14 | Auditoría de cambios | Auditoría; ficha → Historial | Usuario, fecha, acción y detalle con valor anterior y nuevo por campo; filtros; exportación; registro de accesos |
| 15 | Respaldo de información | Respaldos | Historial diario con tamaño, destino y hash; último verificado por restauración; política publicada; "Ejecutar respaldo ahora" |

Funcionalidades mínimas adicionales: Parámetros (reglas con vigencia desde/hasta, BT 5) · Importar (planilla de carga inicial con validación) · Documentos (repositorio por funcionario y tipo) · Calificaciones (procesos, puntaje, lista y anotaciones) · Usuarios (cuentas por perfil, registro de accesos).
