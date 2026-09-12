# 09 — Plan de construcción y checklist

Fecha de cierre: **viernes 25 de septiembre, 16:00**. Credenciales de la demo se envían después de subir
la oferta. Respuestas del foro: 16/09 a las 20:00 (reglamento comunal, carga inicial, plazo, admisibilidad
de experiencia, hosting).

## Orden de construcción, por dependencia y por puntos

### Fase 1 — Cimientos
- Proyecto, Prisma, esquema completo (doc 03), migraciones.
- Autenticación, tres roles, registro de accesos, capa de auditoría transaccional.
- Institución, establecimientos, ficha de funcionario (alta, edición, baja lógica).
- Módulo Parámetros con `ReglaCarrera` versionada y `reglasVigentes(fecha)`.
- Docker Compose, Caddy con TLS, despliegue en el servidor de V2Networks, dominio.

Salida: se puede entrar con HTTPS, crear funcionarios y ver auditoría. Subcriterios 1, 2, 3, 14 en camino.

### Fase 2 — Motor de carrera (doc 04)
- `bienios.ts`, `capacitacion.ts`, `estudios.ts`, `niveles.ts`, `proyeccion.ts`, `snapshot.ts` con tests.
- Pestañas de carrera en la ficha: experiencia y bienios, capacitaciones, estudios, nivel y proyección.
- Reconocimiento de bienio y cambio de nivel con decreto.
- Módulo Carrera transversal (por reconocer, cumplen ascenso, proyecciones).

Salida: subcriterios 4, 5, 6, 7. Es la fase que más tiempo toma cuadrar y la que más pesa.

### Fase 3 — Alertas, reportes, exportación (docs 04 §6, 06)
- Worker de alertas y módulo Alertas; panel embebido en Reportes.
- Los nueve reportes con tres alcances, selector a fecha, XLSX/CSV/PDF.
- Exportación integral (dump + diccionario + Excel por funcionario + adjuntos).
- Módulo Respaldos con script de respaldo alimentando la tabla y política publicada.

Salida: subcriterios 8, 9, 10, 11, 12, 13, 15.

### Fase 4 — Completar admisibilidad
- Calificaciones: procesos, factores, calificar, resultados, mérito.
- Documentos: repositorio y adjuntos en ficha.
- Portal del funcionario.
- API de lectura documentada.
- Importador desde Excel con plantillas.

### Fase 5 — Demo
- Seed determinista con los casos del doc 08.
- Recorrido completo por la pauta con los tres usuarios, en PC, tablet y celular.
- Prueba de restauración de respaldo; marcar el último respaldo como verificado.
- Monitoreo externo de disponibilidad activo.
- Congelar la versión. Guía de una página para la comisión.
- Anexo N°3 redactado con "dónde se ve" para cada subcriterio (doc 01 §B).

## Checklist de admisibilidad (todo o nada)

- [ ] Acceso a la demo funcional con enlace, usuario y contraseña, enviado a `licitacion.cf@daslota.cl` tras subir la oferta.
- [ ] La demo permanece disponible durante toda la evaluación; monitoreo activo.
- [ ] Es el mismo sistema y el mismo hosting declarados en la oferta.
- [ ] Ficha de funcionario completa (4.1), experiencia y bienios (4.2), capacitaciones (4.3), estudios (4.4), niveles (4.5), calificaciones (4.6), nueve reportes (4.7), documental (4.8), auditoría (4.9).
- [ ] Parametrización con vigencias (5). Seguridad: HTTPS, perfiles, respaldo, protección de accesos (6).
- [ ] Portal del funcionario (10).
- [ ] Exportación XLSX, CSV y PDF sin restricciones (13). Exportación integral al término (6).
- [ ] Capacidad de integración vía API documentada (12). Importador desde planillas (15).
- [ ] Aceptación de actualizaciones normativas sin costo, declarada en la oferta (3.4).
- [ ] Hosting en Chile, proveedor individualizado en la oferta (BA 24c).
- [ ] Formularios 1, 2 (una versión), 3, 4 (una versión), 5 y Anexos 1 a 5 presentados. El Anexo N°4 se presenta aunque no haya experiencia.

## Checklist de los 15 subcriterios (cada uno a 100)

- [ ] 1 · Abre en navegador limpio sin instalar nada.
- [ ] 2 · Se usa completo en PC, tablet y celular.
- [ ] 3 · Candado válido; HSTS.
- [ ] 4 · Bienios con fecha cumplida, reconocida, próximo bienio y alerta.
- [ ] 5 · Puntaje de capacitación automático con excedente visible y arrastrado.
- [ ] 6 · Nivel vigente, nivel calculado, "cumple ascenso".
- [ ] 7 · Puntaje faltante, fecha estimada, supuestos.
- [ ] 8 · Módulo Alertas con bienios, niveles y otros hitos.
- [ ] 9 · Nueve reportes con filtro por funcionario, establecimiento y global.
- [ ] 10 · Selector "situación al" que recalcula con reglas vigentes a esa fecha.
- [ ] 11 · Botón Excel en cada reporte, exportación completa.
- [ ] 12 · Exportación integral ejecutable y descargable en la demo.
- [ ] 13 · Alertas accesibles desde Reportes.
- [ ] 14 · Auditoría con usuario, fecha, acción, valor anterior y nuevo.
- [ ] 15 · Pantalla de respaldos con historial, política y último restaurado; evidencia del hosting.

## Entrega a la comisión

Correo a `licitacion.cf@daslota.cl` desde el dominio de Aeroconce, después de subir la oferta:
- URL, tres cuentas (ADMIN, SUPERVISION, FUNCIONARIO) con contraseñas.
- Guía de una página: "dónde ver cada subcriterio", en el orden de la pauta, con la ruta de menú.
- Contacto técnico y compromiso de disponibilidad durante la evaluación.

## Después de las respuestas del 16

- Si entregan el reglamento comunal: cargar las reglas reales con su fuente, regenerar seed, revisar tests con valores reales.
- Si aclaran el inicio del plazo de 10 días: ajustar el Anexo N°5 y el plan de implementación.
- Si confirman que el punto 17 no es admisibilidad: Anexo N°4 con leyenda "sin experiencia previa en este rubro". Si dicen que sí lo es: se detiene la oferta y el sistema queda como producto para la siguiente.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Cálculo no cuadra con el reglamento comunal | Parámetros con vigencia; tests con casos conocidos; si no llega el reglamento, declarar "parametrización de demostración" en el Anexo N°3 |
| Demo caída durante la evaluación | Monitoreo, hosting con SLA, sin dependencias externas, versión congelada |
| La comisión no encuentra una función | Guía de una página; nombres de menú iguales a las bases; alertas visibles en dos módulos |
| Servidor de V2Networks no llega a tiempo | Desplegar en cualquier datacenter chileno alternativo; lo que importa es residencia y que sea el declarado en la oferta |
| Datos de demo con RUT o nombres reales | Generador ficticio; revisión antes de enviar credenciales |
