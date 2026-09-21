# 01 — Alcance y requisitos

## Contexto del negocio

La Ley 19.378 (Estatuto de Atención Primaria de Salud Municipal) establece una carrera funcionaria para el
personal de los consultorios y postas municipales. Cada funcionario pertenece a una **categoría** (A a F,
según profesión o función) y ocupa un **nivel** dentro de ella. Progresa acumulando **puntaje** por
**experiencia** (bienios) y **capacitación**, conforme a un **reglamento comunal** que fija las tablas.
Además hay un proceso anual de **calificación** que incide en la asignación de mérito.

Hoy Lota lleva esto en planillas (BT 1: "reduciendo el uso de planillas manuales y minimizando errores de
cálculo"). El sistema reemplaza esas planillas con cálculo automático, alertas, reportes y un portal donde
cada funcionario ve su propia situación.

## Dos niveles de exigencia

### A. Admisibilidad: si falta, la oferta no se evalúa (BT 3.4, BA 8)

| Exigencia | Fuente | Requisito del sistema |
|---|---|---|
| Plataforma de demostración funcional, operable por la comisión | BA 6b, BA 11, BT 11 | Ambiente en producción con usuario y clave, disponible toda la evaluación |
| Funcionalidades mínimas del numeral 4 | BT 3.4, BT 4 | Todos los módulos de 4.1 a 4.9 operativos |
| Entrega de información en Excel al término | BT 3.4, BT 6 | Exportación integral: BD + diccionario + Excel por funcionario |
| Actualizaciones sin costo por cambios normativos | BT 3.4, BT 7 | Compromiso contractual; técnicamente, parámetros con vigencia |
| Portal del funcionario | BT 10, BT 11 | Módulo de autoconsulta con login individual |
| Parametrización por reglamento comunal con vigencias | BT 5 | Motor de reglas versionado por fecha |
| Perfiles: administrador, consulta, supervisión | BT 2, BT 3.2 | Control de acceso por rol |
| HTTPS, respaldo periódico, protección de accesos | BT 6 | TLS válido, respaldos automatizados, bloqueo de intentos |
| Exportación XLSX, CSV y PDF sin restricción | BT 13 | En todos los reportes |
| Migración desde planillas | BT 15 | Importador Excel |
| Disponibilidad 99% anual | BT 3.3 | Hosting con SLA, monitoreo |
| Datos en Chile, proveedor autorizado | BA 24c | Hosting en datacenter nacional declarado en la oferta |

### B. Puntaje: 15 subcriterios, 100/50/0, promedio × 0,40 (BA 11)

| # | Subcriterio | Para 100 | Módulo |
|---|---|---|---|
| 1 | Sistema 100% web | Sin plugins ni instalación | Arquitectura |
| 2 | Multiplataforma | PC, tablet y móvil | UI responsive |
| 3 | Acceso seguro | HTTPS acreditado | Infraestructura |
| 4 | Cálculo automático de bienios | Con fechas y alertas | Motor de carrera |
| 5 | Capacitaciones con puntaje | Automático y gestiona excedentes | Motor de carrera |
| 6 | Gestión de niveles | Nivel actual y progresión automática | Motor de carrera |
| 7 | Proyección de cambio de nivel | Puntaje faltante y proyección | Motor de carrera |
| 8 | Alertas automáticas | Bienios, niveles u otros hitos | Alertas |
| 9 | Generación de reportes | Por funcionario, establecimiento y global | Reportes |
| 10 | Reportes históricos | A fechas anteriores | Reportes + motor |
| 11 | Exportación a Excel | Completa | Reportes |
| 12 | Entrega al término | BD + Excel completo por funcionario | Exportación integral |
| 13 | Alertas automáticas (reportes) | Igual que 8, visible desde reportes | Alertas |
| 14 | Auditoría de cambios | Usuario, fecha, acción, detalle | Auditoría |
| 15 | Respaldo de información | Periódico y acreditado | Respaldos |

Cada subcriterio en 50 cuesta 1,33 puntos de la nota final; en 0, 2,67. Los subcriterios 4 a 7 dependen de
que el cálculo cuadre con la ley y el reglamento: son los que probará la Encargada de Carrera Funcionaria.

## Fuera de alcance para la demo

- Integración con otros sistemas (BT 12: "en caso de ser necesario", ninguna exigida). Basta exponer una API de lectura documentada.
- Remuneraciones: el sistema no calcula sueldos; entrega los datos de carrera que el sistema de remuneraciones necesita.
- Firma electrónica de decretos: se registra el decreto (número, fecha, PDF adjunto), no se firma dentro del sistema.

## Lo que respondió el foro (21/09, doc 18)

- El reglamento comunal **no se entrega** con la licitación (respuesta 3): la parametrización se hace en la
  implementación con antecedentes del Departamento. La demo usa la parametrización de demostración del doc 14
  y lo declara en pantalla y en el Anexo N°3.
- No hay migración histórica (respuestas 4, 13, 22): el sistema parte del grado y puntaje vigentes de cada
  funcionario (doc 08, carga inicial).
- Cuatro establecimientos y unos 320 funcionarios (respuesta 6).
- Interoperabilidad: basta la capacidad (respuesta 14). Experiencia: no es causal de inadmisibilidad
  (respuestas 1, 7 y 10).

Los supuestos sobre puntos por bienio, tablas de capacitación, arrastre, estudios, umbrales y calificación
siguen siendo parámetros con vigencia; sus valores reales se cargan en la implementación.
