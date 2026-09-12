# 05 — Módulos y pantallas

Perfiles: **ADMIN** (Encargada de Carrera Funcionaria y su equipo), **SUPERVISION** (Jefatura, consulta
institucional: ve todo, no edita), **FUNCIONARIO** (portal: ve solo lo suyo). En cada módulo se indica quién
accede.

Convención de diseño: la comisión debe encontrar cada subcriterio sin ayuda. La navegación principal usa
los nombres de las bases: Funcionarios, Carrera, Capacitaciones, Calificaciones, Reportes, Alertas,
Documentos, Parámetros, Auditoría, Respaldos.

## 1. Inicio (dashboard) — ADMIN, SUPERVISION

- Contadores: dotación activa por establecimiento y categoría; bienios próximos a cumplirse (30/60/90 días); funcionarios que cumplen requisitos de ascenso; alertas activas por tipo.
- Acceso directo a "Alertas" y a los reportes más usados.
- Objetivo: que en 10 segundos la comisión vea que hay alertas automáticas y cálculo vivo.

## 2. Funcionarios — ADMIN (edita), SUPERVISION (lee)

**Listado**: búsqueda por RUT o nombre; filtros por establecimiento, categoría, nivel, tipo de contrato, estado. Columnas: RUT, nombre, categoría, nivel, establecimiento, bienios, puntaje total, próxima alerta. Exportar listado (XLSX/CSV/PDF).

**Ficha** (BT 4.1), con pestañas:
- *Datos*: personales, categoría, tipo de contrato, establecimiento, fecha de ingreso, cargo, jornada, estado.
- *Experiencia y bienios*: períodos de experiencia (propia y reconocida), bienios cumplidos con fecha, reconocidos con decreto, **próximo bienio con fecha**, puntaje de experiencia. Botón "Reconocer bienio" (decreto, fecha).
- *Capacitaciones*: tabla con puntaje calculado, aplicado y excedente por período; totales; botón "Registrar capacitación".
- *Estudios*: títulos y postgrados con puntaje o beneficio.
- *Nivel y proyección*: nivel vigente, puntaje total desglosado, nivel calculado, indicador "cumple requisitos para ascenso", puntaje faltante, fecha estimada y supuestos. Botón "Registrar cambio de nivel" (decreto).
- *Calificaciones*: historial por proceso, lista, notas de mérito/demérito.
- *Documentos*: adjuntos por tipo, descarga, quién subió y cuándo.
- *Historial*: auditoría filtrada a este funcionario (BT 4.1 "historial de modificaciones").
- *Alertas*: las activas de este funcionario.

Acciones de alta, edición y baja (con motivo y fecha de egreso; nunca borrado físico).

## 3. Carrera — ADMIN

Vista transversal del motor:
- **Bienios por reconocer**: todos los cumplidos sin decreto, con acción masiva de reconocimiento (mismo decreto para varios).
- **Cumplen requisitos de ascenso** (BT 4.5): lista con nivel actual, nivel calculado, puntaje, desde cuándo.
- **Proyecciones**: dotación ordenada por puntaje faltante.
- **Recalcular**: fuerza el recálculo completo (normalmente no hace falta; sirve para la demo).

## 4. Capacitaciones — ADMIN (edita), SUPERVISION (lee)

- Registro de actividad: nombre, institución, tipo, horas, fechas, evaluación, aprobación, otra comuna, certificado adjunto. El puntaje se muestra calculado al guardar según la tabla vigente.
- Vista por período: cada funcionario con calculado, aplicado, excedente, y el excedente que arrastra.
- Carga masiva desde Excel (doc 08).

## 5. Estudios — ADMIN

Registro de títulos, diplomados, postítulos, postgrados con documento y fecha de reconocimiento. Puntaje o beneficio según regla.

## 6. Calificaciones — ADMIN

- **Procesos**: crear proceso (período, comisión, factores y subfactores con ponderación), abrir, cerrar.
- **Calificar**: por funcionario, notas por subfactor, puntaje final calculado, lista, acta adjunta, notas de mérito/demérito.
- **Resultados**: tabla por proceso con filtros; exportación.

## 7. Documentos — ADMIN, SUPERVISION (lee)

Repositorio por funcionario y por tipo (certificados, títulos, resoluciones, decretos, actas). Subida con tipo, descarga, control de acceso por rol. Documentos institucionales (reglamento comunal, decretos de nivel masivos) en una carpeta aparte.

## 8. Reportes — ADMIN, SUPERVISION

Ver doc 06. Cada reporte con los tres filtros (funcionario, establecimiento, dotación completa), selector "a fecha" y botones XLSX, CSV, PDF. Panel de alertas accesible desde aquí (subcriterio 13).

## 9. Alertas — ADMIN, SUPERVISION

Lista de alertas activas por tipo, funcionario, fecha del hito. Acciones: atender (con nota), descartar. Configuración de días de aviso en Parámetros. Es el módulo del subcriterio 8; la misma vista, embebida en Reportes, cubre el 13.

## 10. Parámetros — ADMIN

- **Reglas de carrera** por tipo, categoría y vigencia (doc 03, `ReglaCarrera`): puntos por bienio, tabla de capacitación, tope anual, arrastre, puntaje de estudios, umbrales de nivel, calificación.
- Ver la regla vigente hoy y el historial. Crear nueva versión con "vigente desde"; la anterior se cierra automáticamente.
- Cada regla con campo "fuente" (artículo del reglamento comunal).
- Establecimientos, tipos de documento, días de aviso de alertas.
- Es la evidencia del BT 5 ("parametrizar según reglamento comunal", "definir períodos de vigencia").

## 11. Auditoría — ADMIN, SUPERVISION

Bitácora completa (BT 4.9, subcriterio 14): filtros por fecha, usuario, entidad, acción, funcionario. Cada registro muestra **valor anterior y nuevo** por campo. Exportable.

## 12. Respaldos — ADMIN

Historial de respaldos (fecha, tipo, tamaño, destino, resultado, hash), política de respaldo publicada en pantalla, botón "Ejecutar respaldo ahora", último respaldo verificado por restauración. Es lo que acredita el subcriterio 15.

## 13. Importar — ADMIN

Asistente de importación desde Excel (doc 08): nómina, experiencia, capacitaciones, estudios, niveles, calificaciones. Validación previa con reporte de errores, vista previa, confirmación, todo auditado como `IMPORTAR`.

## 14. Exportación integral — ADMIN

Un botón que genera y entrega en ZIP: `pg_dump` completo, diccionario de datos (generado desde el esquema: tablas, columnas, tipos, descripciones), y un Excel por funcionario con toda su carrera, más el consolidado. Es el subcriterio 12 y la obligación del BT 6 al término del contrato. Que exista y funcione en la demo vale 100 puntos; prometerlo en un anexo vale 0.

## 15. Portal del funcionario — FUNCIONARIO (BT 10)

Ruta separada, login individual. Muestra solo lo propio: nivel actual, puntaje acumulado y desglose, puntaje faltante para el siguiente nivel con proyección, historial de capacitaciones, bienios reconocidos y próximo, resultados de calificaciones, documentos asociados (descarga). Sin edición. Diseño pensado para celular.

## 16. Usuarios y accesos — ADMIN

Crear usuarios por rol, asociar usuario a funcionario para el portal, reinicio de contraseña, desactivación. Vista de registro de accesos (BT 3.2).

## 17. API de lectura — ADMIN (llaves)

Endpoints de solo lectura con token, documentados (OpenAPI): funcionarios, carrera, capacitaciones, calificaciones. Cubre BT 12 ("permitir mecanismos de integración... mediante servicios web") sin construir integraciones concretas.
