# 11 — Objetivo de la demo (resumen ejecutivo)

Fuente: Bases Administrativas (numerales 6, 8, 11) y Bases Técnicas (numerales 2 a 17) del Decreto D.A.S. N°01080/2026.
Corrección respecto de lo dicho antes en el chat: la pauta técnica tiene **15 subcriterios**, no 17.

## 1. Qué es la demo para la comisión

No es una presentación. Es un **ambiente del sistema ofertado, en producción, con usuario y clave**, que la comisión opera sola durante todo el período de evaluación (cierre 25/09 → adjudicación estimada 01/10, puede extenderse). Reglas exactas de las bases:

- Se envían enlace, usuario y contraseña a `licitacion.cf@daslota.cl` **después de subir la oferta** al portal (BT 11).
- Debe permanecer accesible durante toda la evaluación (BT 11).
- Debe ser "el sistema o solución efectivamente ofertada" (BA 11, BT 11): misma aplicación, mismo hosting declarado.
- No valen videos, PowerPoint, capturas, folletos ni documentos (BA 11).
- **Falta de acceso, imposibilidad de ingresar o material no interactivo = inadmisibilidad** (BA 8, BT 3.4, BT 11).
- Ante diferencia entre lo declarado en el Anexo N°3 y lo verificado en la demo, **vale lo verificado** (BA 11).

## 2. Quién la va a operar

La comisión (BA 9): Jefa del Departamento de Salud, profesional de Adquisiciones, **Encargada de Carrera Funcionaria** y **Encargado de Informática** (David Fernández Torres, quien originó la solicitud de compra).

- La Encargada de Carrera Funcionaria va a probar los cálculos con casos que conoce de memoria: un funcionario con 7 bienios, uno al borde del cambio de nivel, una capacitación con excedente. Si el cálculo no cuadra con la Ley 19.378 y el reglamento comunal, el subcriterio vale 0 o 50.
- El Encargado de Informática va a mirar HTTPS, que no pida instalar nada, cómo se ve en el celular, la auditoría y el respaldo.

## 3. Los dos niveles de exigencia

### 3.1 Admisibilidad (todo o nada)

BT 3.4 declara inadmisible la oferta que no cumpla:
- Entrega de información en Excel al término del contrato.
- **Funcionalidades mínimas exigidas** (todo el numeral 4, más 5, 6, 10, 12, 13, 14).
- Aceptación de actualizaciones sin costo por cambios normativos.
- Acceso a plataforma de demostración funcional.
- Permitir la verificación de las funcionalidades mediante la demo.

BT 11 enumera lo que la comisión verificará en la demo: gestión de funcionarios, experiencia y bienios, capacitaciones, reconocimiento de estudios, niveles, calificaciones, reportes, gestión documental, auditoría y **portal del funcionario**. Todo eso tiene que existir y operar.

### 3.2 Puntaje (40% de la nota, promedio simple de 15 subcriterios)

Cada subcriterio: 100 / 50 / 0. Nota técnica = promedio × 0,40. Un subcriterio en 50 cuesta 1,33 puntos de la nota final; en 0, 2,67.

| # | Subcriterio | 100 puntos exige | Cómo se demuestra |
|---|---|---|---|
| 1 | Sistema 100% web | Navegador estándar, sin plugins ni instalación | Abrir en Chrome/Edge/Firefox limpio |
| 2 | Acceso multiplataforma | PC, tablet y móvil | Responsive real; probar en celular |
| 3 | Acceso seguro | HTTPS acreditado | Certificado TLS válido en el dominio; nota en Anexo N°3 |
| 4 | Cálculo automático de bienios | Automático, con fechas y alertas | Ficha muestra bienios, fecha de reconocimiento de cada uno y fecha del próximo; alerta visible |
| 5 | Capacitaciones con puntaje | Puntaje automático **y gestión de excedentes** | Cargar curso → puntaje según tabla → excedente arrastrado al período siguiente |
| 6 | Gestión de niveles | Nivel actual + progresión automática | Nivel calculado desde puntaje total; cambio de nivel al cumplir umbral |
| 7 | Proyección de cambio de nivel | Puntaje faltante + proyección de ascenso | "Le faltan X puntos; con Y bienios llegará el dd/mm/aaaa" |
| 8 | Alertas automáticas (funcionalidades) | Bienios, niveles u otros hitos | Panel de alertas + indicador en ficha |
| 9 | Generación de reportes | Por funcionario, por establecimiento y global | Los 9 reportes de BT 4.7, con los tres filtros |
| 10 | Reportes históricos | A fechas anteriores | Selector "situación al dd/mm/aaaa" que recalcula |
| 11 | Exportación a Excel | Completa, sin restricciones | Botón Excel en cada reporte; también CSV y PDF (BT 13) |
| 12 | Entrega al término del contrato | BBDD + informes completos en Excel por funcionario | Función "Exportación integral": dump de BD + diccionario de datos + Excel por funcionario (BT 6) |
| 13 | Alertas automáticas (reportes) | Igual que #8 | Las mismas alertas accesibles desde la sección de reportes |
| 14 | Auditoría de cambios | Usuario, fecha, acción, **detalle** (valor anterior y nuevo) | Bitácora consultable y filtrable |
| 15 | Respaldo de información | Respaldo periódico **acreditado** | Pantalla con historial de respaldos + política escrita + evidencia del proveedor de hosting |

"Alertas automáticas" aparece dos veces en la pauta (#8 y #13). Suma dos veces. Que las alertas sean visibles tanto en el módulo de carrera como en el de reportes.

## 4. Funcionalidades mínimas que deben existir (admisibilidad)

De BT 4, 5, 6, 10, 12, 13, 14, 15, 16. Lo que no está en la pauta de puntaje igual es obligatorio.

**Gestión de funcionarios (4.1):** ficha con datos personales, categoría (A a F), nivel (1 a 15), fecha de ingreso, historial laboral, documentos asociados, historial de modificaciones. Tipos: titular, plazo fijo, reemplazo (BT 2). Varios establecimientos.

**Experiencia y bienios (4.2):** registro de experiencia, cálculo automático de bienios, fechas de reconocimiento, alertas, histórico de bienios reconocidos, experiencia en otros centros o servicios de salud.

**Capacitaciones (4.3):** registro de cursos, puntaje según reglamento, puntaje acumulado automático, arrastre de excedentes entre períodos, certificados adjuntos, capacitaciones en otras comunas.

**Reconocimiento de estudios (4.4):** títulos, diplomados, postítulos, postgrados; puntaje o beneficio asociado; respaldo documental.

**Niveles (4.5):** nivel actual, progresión, quiénes cumplen requisitos para cambio, puntaje faltante, alertas de reconocimiento.

**Calificaciones (4.6):** procesos de calificación, factores y subfactores, comisiones evaluadoras, actas o certificados, historial por funcionario, notas de mérito o demérito.

**Reportes (4.7):** nómina, resumen de carrera, experiencia y bienios, historial de capacitaciones, cambios de nivel, resultados de calificaciones, proyección de cambios de nivel, históricos a fecha, nómina con asignación de mérito. Cada uno por funcionario, por establecimiento y por dotación completa.

**Gestión documental (4.8):** documentos por funcionario, certificados, resoluciones, acceso controlado.

**Auditoría (4.9):** cambios, usuario, fecha y hora, datos modificados.

**Parametrización (5):** reglas según reglamento comunal, modificables ante cambios normativos, con **períodos de vigencia** de cada regla (una tabla de puntajes rige desde/hasta).

**Seguridad (6):** HTTPS, perfiles, respaldo periódico, protección de accesos. Entrega al término: copia completa de BD, diccionario de datos y relación de tablas, informes Excel por funcionario.

**Portal del funcionario (10):** cada funcionario entra y ve nivel, puntaje acumulado, puntaje faltante, capacitaciones, bienios, calificaciones y sus documentos.

**Perfiles (BT 2, 3.2):** administrador, funcionario de consulta, supervisión o consulta institucional. Autenticación usuario/contraseña, registro de accesos.

**Integración (12):** "en caso de ser necesario", vía API o exportación. No hay ninguna exigida. Basta declarar la capacidad.

**Exportación (13):** XLSX, CSV y PDF, sin restricciones.

**Migración (15):** desde planillas o sistemas actuales. Implica un importador desde Excel para nómina, bienios, capacitaciones y calificaciones. Es también lo que hace viable el plazo de 10 días.

## 5. Modelo de dominio mínimo (Ley 19.378)

Lo que la estructura del sistema tiene que representar. Los **valores** (puntos por bienio, tablas de capacitación, umbrales de nivel) son del reglamento comunal y deben ser parámetros con vigencia, nunca constantes en el código.

- **Categorías A a F** (según profesión/función), cada una con **15 niveles**.
- **Puntaje de carrera** = puntos por experiencia (bienios) + puntos por capacitación (+ reconocimiento de estudios donde aplique). El nivel se determina por umbrales de puntaje acumulado por categoría.
- **Bienio** = cada dos años de experiencia reconocida (en la comuna y en otros servicios de salud acreditados). Cada bienio tiene fecha de reconocimiento y genera puntos.
- **Capacitación** = cursos con horas y puntaje según tabla; existe un tope anual y el **excedente se arrastra** al período siguiente.
- **Calificación** = proceso anual con factores y subfactores, comisión, acta, y notas de mérito/demérito que pueden afectar puntaje o asignación de mérito.
- **Reglas con vigencia**: cada parámetro tiene fecha desde/hasta, para que los reportes históricos recalculen con la regla vigente en esa fecha.

## 6. Datos de prueba para la demo

- **Dotación ficticia de ~250 funcionarios** repartidos en 3 o 4 establecimientos con nombres genéricos (CESFAM 1, CESFAM 2, Posta, DAS). Nombres y RUT inventados: ni un dato real.
- Distribución por categoría A a F y por tipo (titular, plazo fijo, reemplazo).
- Fechas de ingreso variadas para producir entre 0 y 12 bienios; al menos 5 casos con bienio próximo a cumplirse (alerta visible) y 5 con bienio recién reconocido.
- Capacitaciones cargadas con puntajes y **al menos 10 casos con excedente arrastrado**.
- Reconocimiento de estudios en categorías A y B.
- Al menos 5 funcionarios a menos de 10 puntos del cambio de nivel (proyección y alerta), y 3 que ya cumplieron (cambio pendiente de reconocer).
- Dos procesos de calificación históricos con actas adjuntas y algunas notas de mérito.
- Documentos adjuntos en varias fichas (PDF ficticios).
- Historial de auditoría poblado: ediciones con valor anterior y nuevo, hechas por distintos usuarios.
- Historial de respaldos visible con fechas y tamaños.
- Reglas parametrizadas con dos períodos de vigencia distintos, para que "situación al 31/12/2024" dé un resultado distinto a hoy.

## 7. Credenciales a enviar

Tres cuentas, para que la comisión pruebe los tres perfiles sin pedir nada:

| Perfil | Ve |
|---|---|
| Administrador | Todo, incluida parametrización, auditoría, respaldos, exportación integral |
| Supervisión / consulta institucional | Reportes y fichas, sin editar |
| Funcionario | Solo su portal (BT 10) |

Enviar además una guía de una página: URL, las tres cuentas, y "dónde ver cada subcriterio" en el orden de la pauta. Reduce el riesgo de que la comisión no encuentre algo que sí existe.

## 8. Requisitos operativos de la demo

- **Hosting**: el mismo declarado en la oferta (V2Networks, datacenter Ascenty SCL01, Santiago). Dominio propio con TLS válido.
- Disponible sin interrupción desde el envío de credenciales hasta la adjudicación. Monitoreo de uptime propio.
- Sin dependencias externas que puedan caerse (CDN, servicios de terceros no contratados).
- Rendimiento aceptable con 250 registros y reportes globales.
- Versión congelada: no desplegar cambios mientras la comisión evalúa.
- Página de estado o mensaje claro si algo falla, con contacto.

## 9. Orden de construcción sugerido, por puntos

1. Base: autenticación, perfiles, ficha de funcionario, establecimientos, categorías y niveles, parametrización con vigencia. Sin esto no hay nada.
2. Motor de carrera: bienios, capacitaciones con excedentes, reconocimiento de estudios, cálculo de puntaje y nivel, proyección. Son los subcriterios 4 a 7 y el corazón de lo que probará la Encargada de Carrera Funcionaria.
3. Alertas (cuentan dos veces) y auditoría con valor anterior/nuevo.
4. Reportes: los 9 de BT 4.7, con filtros por funcionario/establecimiento/global, histórico a fecha, exportación XLSX/CSV/PDF.
5. Portal del funcionario.
6. Calificaciones y gestión documental.
7. Exportación integral (BD + diccionario + Excel por funcionario) y pantalla de respaldos.
8. Importador desde Excel (migración) y carga de datos de prueba.
9. Guía de una página para la comisión.

## 10. Anexo N°3

El Anexo N°3 es texto libre por subcriterio. Escribir en cada casilla exactamente qué hace el sistema y **dónde se ve en la demo** ("Módulo Carrera > Ficha > pestaña Bienios"). La comisión compara lo declarado con lo verificado; que lo declarado sea una guía, no una promesa.
