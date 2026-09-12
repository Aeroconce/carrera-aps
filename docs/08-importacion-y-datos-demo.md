# 08 — Importación y datos de demostración

## Importador desde Excel (BT 15, BT 8, plazo de 10 días)

La migración desde planillas es obligatoria y es lo que hace posible implementar en 10 días. El importador
es también la herramienta para cargar el dataset de la demo.

**Plantillas** (descargables desde el módulo Importar, con hoja de instrucciones y ejemplos):

| Plantilla | Columnas mínimas |
|---|---|
| `funcionarios.xlsx` | RUT, nombres, apellidos, categoría, tipo de contrato, fecha de ingreso, establecimiento, cargo, jornada, email |
| `experiencia.xlsx` | RUT, institución, es propia (S/N), desde, hasta, jornada, fecha de reconocimiento |
| `bienios_reconocidos.xlsx` | RUT, número de bienio, fecha cumplido, fecha reconocido, decreto |
| `capacitaciones.xlsx` | RUT, nombre, institución, tipo, horas, inicio, término, nota, aprobado (S/N), otra comuna (S/N), período |
| `estudios.xlsx` | RUT, tipo, nombre, institución, fecha obtención, fecha reconocimiento |
| `niveles.xlsx` | RUT, nivel, desde, hasta, decreto, fecha decreto, motivo |
| `calificaciones.xlsx` | RUT, período, puntaje final, lista, observaciones |

**Flujo**: subir archivo → validación (RUT válido, fechas coherentes, categoría válida, funcionario existente para las tablas hijas, duplicados) → informe de errores por fila → vista previa → confirmar → carga transaccional → registro en auditoría con conteo → recálculo del motor y regeneración de alertas.

**Decisión de diseño**: los bienios históricos ya reconocidos se importan como datos (con su decreto) y el motor solo calcula hacia adelante desde el último reconocido. Así una migración desde planillas con años de historia no obliga a reconstruir reconocimientos antiguos que quizá no cuadren con la regla actual.

## Dataset de la demo

La comisión va a probar con lo que encuentre. Una demo vacía o con tres registros puntúa como una que no existe. El dataset tiene que hacer visible cada subcriterio sin que nadie lo explique.

**Institución**: "Departamento de Salud Municipal, Comuna de Demostración". Sin datos reales de Lota ni de ninguna persona real.

**Establecimientos** (4): CESFAM Norte, CESFAM Sur, Posta Rural, Dirección DAS.

**Dotación**: 250 funcionarios ficticios (nombres y RUT generados, RUT con dígito verificador válido para que las validaciones pasen).

Distribución:
- Categoría A: 25 · B: 60 · C: 55 · D: 45 · E: 35 · F: 30.
- Titulares 70 %, plazo fijo 22 %, reemplazo 8 %.
- Fechas de ingreso entre 1998 y 2026, con densidad en 2010–2022, para producir entre 0 y 13 bienios.

**Casos que deben existir** (y cómo encontrarlos: nombres marcados con un sufijo en el cargo, por ejemplo "Caso 1"):

| Caso | Qué muestra | Subcriterio |
|---|---|---|
| 5 funcionarios con bienio que se cumple en los próximos 30 días | Alerta `BIENIO_PROXIMO` y fecha exacta en ficha | 4, 8 |
| 5 con bienio cumplido y sin reconocer hace 40 días | Alerta pendiente y acción "Reconocer" | 4, 8 |
| 3 con experiencia reconocida de otro Servicio de Salud | Suma de experiencia externa | 4 |
| 10 con capacitación sobre el tope anual en 2025 | Excedente arrastrado a 2026, visible en tabla | 5 |
| 2 con cadena de excedentes en tres períodos | Arrastre en cadena | 5 |
| 5 con curso no aprobado | Aparece con 0 puntos | 5 |
| 8 en categorías A y B con diplomado o magíster | Puntaje o beneficio por estudios | (admisibilidad 4.4) |
| 5 a menos de 10 puntos del siguiente nivel | Proyección con fecha y supuestos, alerta `NIVEL_PROXIMO` | 6, 7, 8 |
| 3 que ya cumplen requisitos de ascenso sin decreto | Alerta `NIVEL_ALCANZADO`, aparecen en "Cumplen requisitos" | 6, 8 |
| 6 con cambio de nivel en 2024 y 2025 con decreto | Reporte "cambios de nivel"; snapshot al 2023 muestra nivel anterior | 6, 10 |
| 2 procesos de calificación cerrados (2024, 2025) con actas | Historial, listas, mérito | (4.6), 9 |
| 12 con notas de mérito o demérito | Se ven en calificaciones | (4.6) |
| 40 con documentos adjuntos (certificados, títulos, decretos como PDF ficticios) | Gestión documental | (4.8) |
| 5 inactivos con fecha de egreso | Estado, no aparecen en nómina activa | (4.1) |
| Historial de auditoría con 300+ registros de distintos usuarios y fechas, con valor anterior y nuevo | Bitácora poblada | 14 |
| 30 registros de respaldo diarios, el último marcado "verificado por restauración" | Pantalla de respaldos | 15 |
| Reglas con dos vigencias (2020–2024 y 2025–) con tope y tabla distintos | Snapshot a 2024 calcula distinto que hoy | 10, (BT 5) |

**Usuarios de demo**:
- `admin.demo` (ADMIN)
- `supervision.demo` (SUPERVISION)
- `funcionario.demo` (FUNCIONARIO, asociado a un funcionario con carrera interesante: 6 bienios, excedente, cerca del ascenso)

Contraseñas generadas, distintas, entregadas por correo a `licitacion.cf@daslota.cl` junto con la oferta.

## Generación

Script `prisma/seed/demo.ts`, determinista (semilla fija) para que la demo se pueda recrear idéntica. Usa
el importador (no inserta directo) para que la carga quede auditada como lo estaría en producción. Al
terminar, ejecuta el motor completo y genera las alertas.
