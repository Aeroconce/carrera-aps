# 07 — Seguridad, auditoría y respaldos

## Autenticación y perfiles (BT 3.2, BT 2)

- Usuario y contraseña. Contraseñas con Argon2id, mínimo 10 caracteres, cambio obligatorio en primer ingreso.
- Tres roles: ADMIN, SUPERVISION, FUNCIONARIO. Los permisos se verifican en el servidor en cada acción, no solo en la interfaz.
- El rol FUNCIONARIO solo accede a `/mi-carrera` y solo a su propio `funcionarioId`.
- Sesión con cookie httpOnly, SameSite=Lax, expiración por inactividad (parámetro, 30 minutos por defecto), cierre de sesión.
- Límite de intentos de login (5 en 15 minutos) y bloqueo temporal con registro.
- **Registro de accesos** (`Acceso`): cada intento, exitoso o no, con email, IP, user agent, fecha. Vista para ADMIN y SUPERVISION.

## Auditoría de cambios (BT 4.9, subcriterio 14)

El subcriterio exige "registro completo (usuario, fecha, acción, detalle)". Diseño:

- Toda escritura pasa por una capa `audit(accion, entidad, antes, despues)` dentro de la misma transacción. Si la auditoría falla, la escritura falla.
- `antes` y `despues` guardan solo los campos que cambiaron, con valor anterior y nuevo. Para creación, `antes = null`; para eliminación lógica, `despues = { estado: "INACTIVO" }`.
- Acciones: CREAR, EDITAR, ELIMINAR, RECONOCER (bienio, nivel, estudio), CALIFICAR, IMPORTAR, EXPORTAR, LOGIN, CAMBIO_REGLA.
- Vista de auditoría filtrable por fecha, usuario, entidad, funcionario y acción; y la pestaña "Historial" de cada ficha muestra su subconjunto.
- Los registros de auditoría son inmutables: sin edición ni borrado desde la aplicación.

## Respaldos (BT 6, BT 14, subcriterio 15)

Para puntuar 100 el respaldo tiene que estar **acreditado**, no solo existir.

**Política** (documento de una página, publicado en el módulo Respaldos y adjunto a la oferta):
- Base de datos: `pg_dump` diario a las 03:00, comprimido y cifrado (age o GPG), retención 30 días locales; copia semanal a almacenamiento separado en Chile, retención 12 meses.
- Archivos adjuntos: sincronización diaria al mismo destino.
- Verificación: restauración de prueba mensual en ambiente aislado, con registro.
- Tiempo objetivo de recuperación: 4 horas; pérdida máxima de datos: 24 horas (definir según SLA de hosting).

**Evidencia en el sistema**: tabla `Respaldo` alimentada por el script de respaldo (fecha, tipo, tamaño, destino, hash, resultado, duración) y pantalla que la muestra, con el último respaldo verificado por restauración.

**Evidencia externa**: ficha de servicio de V2Networks con su política de respaldo del Cloud Server, si la tienen, y los certificados del datacenter (TIA-942, SOC 3).

## Protección de datos personales (BA 24)

Los datos de carrera son personales y algunos sensibles (calificaciones, situación laboral). Obligaciones que el sistema debe soportar:

- **Residencia en Chile** (BA 24c): hosting declarado y autorizado; ningún servicio externo procesa datos de funcionarios (sin analítica de terceros, sin correo transaccional extranjero con datos personales en el cuerpo).
- **Encargado del tratamiento** (BA 24b): controles de acceso, cifrado en tránsito, respaldo periódico. Todo lo anterior.
- **Notificación de incidentes en 24 horas** (BA 24d): procedimiento escrito, contacto del Departamento registrado en Parámetros.
- **Entrega y eliminación al término** (BA 24f): exportación integral + procedimiento de borrado seguro con certificado.
- **Confidencialidad 3 años post contrato** (BA 24e): cláusula en los contratos del equipo y de cualquier subcontratista.

## Cabeceras y transporte

- TLS 1.2+ con certificado válido; HSTS.
- CSP restrictiva (solo origen propio), X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy.
- Sin recursos de terceros en tiempo de ejecución.

## Lo que la comisión va a verificar en la demo

- Candado del navegador y certificado válido en el dominio (subcriterio 3).
- Que no pida instalar nada (subcriterio 1).
- Que un usuario FUNCIONARIO no vea a otros (BT 10).
- La pantalla de auditoría con valores anterior y nuevo (subcriterio 14).
- La pantalla de respaldos con historial y política (subcriterio 15).
