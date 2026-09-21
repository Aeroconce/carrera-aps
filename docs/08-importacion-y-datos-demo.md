# 08 — Importación y datos de demostración

## Carga inicial desde la planilla del Departamento (doc 18, respuestas 4, 13 y 22)

No hay migración histórica. El Departamento entrega una planilla con la situación vigente de cada funcionario;
el sistema parte de ese saldo y, desde la puesta en marcha, registra los movimientos hacia adelante. Este es
el importador de la demo y de la implementación, y lo que hace posible el plazo de 10 días.

**Plantilla `carga-inicial.xlsx`** (descargable desde Importar, con hoja de instrucciones), una fila por funcionario:

| Columna | Obligatoria | Uso |
|---|---|---|
| RUT | sí | identificación; dígito verificador validado |
| Nombres, Apellidos | sí | ficha |
| Categoría (A a F) | sí | ficha y reglas por categoría |
| Establecimiento | sí | debe existir en Parámetros |
| Tipo de contrato | sí | titular, plazo fijo, reemplazo |
| Fecha de ingreso | sí | ficha; ancla de bienios si falta la fecha del último bienio |
| Grado (nivel) vigente | sí | nivel de apertura |
| Fecha desde la que rige el grado | sí | el historial de niveles no nace vacío |
| Puntaje vigente de experiencia | si el Departamento lo tiene | saldo de apertura desglosado |
| Puntaje vigente de capacitación | si el Departamento lo tiene | saldo de apertura desglosado |
| Puntaje vigente total | sí | saldo de apertura; sin desglose se declara "sin desglose" |
| Fecha del último bienio reconocido | sí | ancla para proyectar el siguiente bienio |
| N° de bienios reconocidos | recomendable | numeración de los bienios siguientes |
| Excedente de capacitación pendiente del período anterior | si existe | entra como arrastre en el primer cierre de período |
| Jornada (horas), cargo, correo | opcionales | ficha y portal |

**Qué crea la carga** por fila, en una sola transacción auditada como `APERTURA`: el `Funcionario`, su
`Apertura` (movimiento de apertura con fecha, saldos y fuente; doc 03), el `NivelHistorico` vigente con motivo
`APERTURA` y la `fechaDesde` de la planilla, y el `ExcedenteCapacitacion` pendiente si viene. El motor suma el
saldo de apertura como base antes de todo lo que acumule después (doc 04 §0). La bitácora muestra desde el
día uno de dónde salió cada punto.

**Flujo**: subir archivo → validación (RUT válido, fechas coherentes, categoría y establecimiento válidos,
grado dentro del rango de la regla NIVELES, duplicados) → informe de errores por fila y columna → vista previa
→ confirmar → carga transaccional → recálculo del motor y regeneración de alertas.

Las plantillas de historia (experiencia, bienios, capacitaciones, estudios, niveles, calificaciones) quedan
fuera del alcance: la respuesta 13 descarta la migración de antecedentes históricos.

## Dataset de la demo

La comisión va a probar con lo que encuentre. Una demo vacía o con tres registros puntúa como una que no existe. El dataset tiene que hacer visible cada subcriterio sin que nadie lo explique.

**Institución**: "Departamento de Salud, I. Municipalidad de Lota" con sus cuatro establecimientos reales
(respuesta 6 del foro): CESFAM Juan Cartes Arias, CESFAM Sergio Lagos Olave, CECOSF de Colcura y Departamento
de Salud de Lota. Los establecimientos son instituciones públicas, no datos personales, y la respuesta 11 avala
una solución hecha para Lota. **Ningún funcionario real**: nombres y RUT generados (dígito verificador válido).
Nota visible en el pie de toda la demo: "Datos de demostración; dotación ficticia".

**Dotación**: 320 funcionarios ficticios (respuesta 6), cargados por la planilla de carga inicial con puesta en
marcha ficticia el 01/01/2025, más los movimientos posteriores a esa fecha que hacen visibles los casos.

Distribución:
- Categoría A: 32 · B: 77 · C: 70 · D: 58 · E: 45 · F: 38.
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

Script `prisma/seed/demo.ts`, determinista (semilla fija) para que la demo se pueda recrear idéntica. Usa la
carga inicial (apertura) para los 320 funcionarios y registra los movimientos posteriores al 01/01/2025 con las
mismas acciones de la aplicación, para que todo quede auditado como en producción. Al terminar, ejecuta el
motor completo y genera las alertas.
