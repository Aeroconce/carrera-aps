# 13 — Flujos de usuario

Cada flujo describe lo que la comisión (o un usuario real) va a hacer, pantalla por pantalla, con
validaciones, lo que se audita y lo que cambia en alertas. Los textos de botones y mensajes son los
definitivos (doc 12).

## F1 — Entrar al sistema

1. `/login`: correo y contraseña. Enlace "¿Olvidaste tu contraseña?" (el administrador la reinicia; en la demo el enlace informa eso).
2. Tres intentos fallidos consecutivos muestran "Demasiados intentos. Espera 15 minutos" (rate limiting de Better Auth).
3. Primer ingreso con `debeCambiarPassword`: pantalla obligatoria de cambio antes de cualquier otra ruta.
4. Según rol: ADMIN y SUPERVISION van a Inicio; FUNCIONARIO va a `/mi-carrera`.
5. Se registra en `Acceso` (éxito o fallo, IP, agente).

## F2 — Buscar y abrir un funcionario

1. Funcionarios → buscador (RUT con o sin puntos, o nombre) → resultados al escribir, sin botón.
2. Filtros: establecimiento, categoría, nivel, tipo de contrato, estado.
3. Clic en la fila (o toque en la tarjeta en móvil) abre la ficha en `/funcionarios/[id]`.
4. La ficha abre en la pestaña Datos; la cabecera muestra el riel de carrera siempre.

## F3 — Registrar una capacitación y ver su efecto (subcriterio 5)

1. Ficha → pestaña Capacitaciones → "Registrar capacitación".
2. Diálogo: nombre, institución, tipo, horas, inicio, término, nota (opcional), aprobada (sí/no), realizada en otra comuna (sí/no), certificado (archivo, opcional pero genera alerta si falta), período (se propone según fecha de término, editable).
3. Al escribir las horas y marcar aprobada, el diálogo muestra en vivo "Puntaje según tabla vigente al término: 3 puntos".
4. Validaciones: horas > 0; término ≥ inicio; período coherente con la fecha de término; sin duplicado exacto (mismo nombre, institución y fechas).
5. "Registrar" → toast "Capacitación registrada" → la tabla de capacitaciones muestra la fila nueva con calculado, aplicado y excedente del período recalculados; el total de capacitación del funcionario y el riel se actualizan.
6. Auditoría: `CREAR Capacitacion` con todos los campos; si el período supera el tope, `ExcedenteCapacitacion` creado y auditado.
7. Alertas: si no adjuntó certificado → `DOCUMENTO_FALTANTE`.

## F4 — Reconocer un bienio (subcriterio 4)

1. Carrera → "Bienios por reconocer": lista de bienios cumplidos sin decreto, o desde la ficha → pestaña Experiencia y bienios → fila con estado "Cumplido, sin reconocer" → "Reconocer".
2. Diálogo: número de decreto, fecha del decreto, documento (opcional). Muestra el bienio (número, fecha cumplido, puntaje).
3. Validación: fecha del decreto ≥ fecha cumplido.
4. "Reconocer" → toast "Bienio reconocido" → estado pasa a "Reconocido", alerta `BIENIO_PENDIENTE_RECONOCER` pasa a ATENDIDA.
5. Auditoría: `RECONOCER Bienio` con decreto.
6. Acción masiva: seleccionar varios en "Bienios por reconocer" y aplicar el mismo decreto.

## F5 — Registrar un cambio de nivel (subcriterio 6)

1. Carrera → "Cumplen requisitos de ascenso" muestra funcionarios con `cumpleAscenso`. O desde la ficha → pestaña Nivel y proyección → indicador "Cumple requisitos para nivel 8" → "Registrar cambio de nivel".
2. Diálogo: nivel nuevo (propuesto = nivel calculado, editable con advertencia si difiere), fecha desde, decreto, documento.
3. Validaciones: fecha desde ≥ fecha del último cambio; nivel dentro de 1 a 15.
4. "Registrar" → toast "Nivel actualizado" → `NivelHistorico` cierra el anterior y abre el nuevo; riel se mueve; alerta `NIVEL_ALCANZADO` atendida.
5. Auditoría: `RECONOCER NivelHistorico`.

## F6 — Ver la proyección (subcriterio 7)

1. Ficha → pestaña Nivel y proyección.
2. Se muestra: nivel actual, puntaje acumulado desglosado (experiencia, capacitación, estudios), nivel calculado, puntaje faltante para el siguiente, fecha estimada y los supuestos usados.
3. Enlace "¿Cómo se calcula?" abre un panel con la explicación en una frase por regla y la fuente (reglamento).

## F7 — Consultar alertas (subcriterios 8 y 13)

1. Alertas (menú) o Reportes → "Alertas": lista con filtros por tipo, establecimiento, fecha del hito.
2. Cada alerta: ícono por tipo, funcionario (enlace), mensaje, fecha del hito, acciones "Atender" (con nota) y "Descartar" (con motivo).
3. Contador de alertas activas en el menú y en Inicio.
4. Configuración de días de aviso en Parámetros.

## F8 — Generar un reporte a fecha y exportarlo (subcriterios 9, 10, 11)

1. Reportes → elegir reporte (los nueve del doc 06).
2. Alcance: un funcionario (combobox), un establecimiento, o toda la dotación.
3. "Situación al": selector de fecha, por defecto hoy. Al cambiarla, el reporte recalcula con reglas vigentes a esa fecha y el encabezado dice "Situación al 31/12/2024".
4. Vista en pantalla con totales.
5. Botones "Excel", "CSV", "PDF": descarga inmediata (menos de 5 segundos para la dotación completa). El nombre del archivo incluye el reporte y la fecha.
6. Auditoría: `EXPORTAR` con reporte, alcance, fecha y formato.

## F9 — Ejecutar la exportación integral (subcriterio 12)

1. Exportación integral (menú) → explicación de qué contiene → "Generar exportación".
2. Se ejecuta en segundo plano; barra de progreso por etapa (base de datos, diccionario, Excel por funcionario, adjuntos, consolidado).
3. Al terminar: "Exportación lista" con botón de descarga del ZIP, tamaño, hash y fecha. Historial de exportaciones anteriores.
4. Auditoría: `EXPORTAR` integral.

## F10 — Revisar la bitácora (subcriterio 14)

1. Auditoría (menú): tabla con fecha, usuario, entidad, acción, funcionario afectado.
2. Filtros por fecha, usuario, entidad, acción, funcionario.
3. Clic en una fila abre el detalle: campos cambiados con valor anterior y nuevo, lado a lado.
4. Desde la ficha → pestaña Historial: la misma tabla filtrada a ese funcionario.

## F11 — Ver los respaldos (subcriterio 15)

1. Respaldos (menú): tabla de respaldos (fecha, tipo, tamaño, destino, resultado), el último verificado por restauración destacado, y la política publicada en texto.
2. "Ejecutar respaldo ahora" → confirma → aparece la fila nueva al terminar.

## F12 — Cambiar un parámetro del reglamento (BT 5)

1. Parámetros → Reglas de carrera → tipo (por ejemplo "Tope anual de capacitación").
2. Se muestra la regla vigente hoy y el historial.
3. "Nueva versión": valores, "vigente desde" (fecha futura o hoy), fuente. Al guardar, la anterior se cierra el día anterior.
4. Advertencia clara: "Los cálculos desde esa fecha usarán la nueva regla; los reportes anteriores no cambian."
5. Auditoría: `CAMBIO_REGLA` con antes y después.

## F13 — Importar desde Excel (BT 15)

1. Importar → elegir tipo (funcionarios, experiencia, capacitaciones…) → descargar plantilla → subir archivo.
2. Validación: tabla de errores por fila y columna; si hay errores, no se importa nada.
3. Vista previa de las primeras 50 filas y conteo total → "Importar".
4. Resultado: creados, actualizados, omitidos. Auditoría `IMPORTAR` con conteo y nombre del archivo.
5. Recalculo del motor y regeneración de alertas al terminar.

## F14 — Portal del funcionario (BT 10)

1. Login con usuario FUNCIONARIO → `/mi-carrera`.
2. Arriba: riel de carrera con nivel, puntaje acumulado, puntaje faltante y proyección.
3. Secciones: Mis bienios (reconocidos y próximo), Mis capacitaciones (con puntaje y excedente), Mis estudios, Mis calificaciones, Mis documentos (descarga).
4. Sin botones de edición. Intentar una URL de otro funcionario devuelve "Sin permiso".

## F15 — Registrar una calificación (BT 4.6)

1. Calificaciones → proceso abierto → "Calificar" en la fila del funcionario.
2. Formulario con factores y subfactores y sus ponderaciones; puntaje final calculado en vivo; lista según regla; acta adjunta; notas de mérito/demérito.
3. "Guardar calificación" → historial del funcionario actualizado; alerta `CALIFICACION_PENDIENTE` atendida.

## F16 — Salir y volver a entrar (para la comisión)

Cerrar sesión desde el menú de usuario; volver a entrar con otro rol para comprobar permisos. La sesión expira a los 30 minutos de inactividad con aviso previo de un minuto.
