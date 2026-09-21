# 18 — Respuestas del foro de preguntas (licitación 3019-20-LE26)

Transcripción fiel del foro de Mercado Público, generado el 21/09/2026 a las 18:25 (archivo `Foro_PreguntasRespuestas_21-09-2026_18-25.xls`).
Las preguntas 1 a 8 son las que dejó abierto el doc 01; las respuestas se publicaron el 21/09, no el 16/09 previsto en el doc 09.

## Qué cambia para el proyecto (lectura del equipo, no parte del foro)

- **No hay migración histórica** (P4, P13, P22): el Departamento entrega una planilla con el grado y el puntaje vigente de cada funcionario; el sistema parte de ese saldo y administra la carrera hacia adelante. El importador de historia del doc 08 se reemplaza por una carga inicial de nómina y saldos; el motor necesita un saldo inicial por funcionario.
- **Reglamento comunal no se entrega** (P3): la parametrización se hace en la implementación con antecedentes del Departamento. La demo mantiene la parametrización de demostración del doc 14, declarada como tal.
- **Dotación y establecimientos reales** (P6): CESFAM Juan Cartes Arias, CESFAM Sergio Lagos Olave, CECOSF de Colcura y Departamento de Salud de Lota; unos 320 funcionarios, todos en el sistema.
- **Demo con datos ficticios cargados por el oferente** (P2), credenciales después de ofertar y antes del inicio de la evaluación; **todas las funcionalidades mínimas deben estar operativas en la demo** (P12).
- **Hosting**: un datacenter en Chile cumple; si es de un tercero, debe individualizarse en la oferta y requiere autorización escrita previa del Departamento; la adjudicación no la reemplaza (P8, P15). **Para la demo se acepta alojar fuera de Chile** con el compromiso de mover los datos a Chile al adjudicar (P9).
- **Experiencia** (P1, P7, P10): no es causal de inadmisibilidad; se evalúa con 0 puntos si no hay; el Anexo N°4 es obligatorio igual; cuentan implementaciones en instituciones públicas o privadas.
- **Plazo de implementación** (P5, P24): 10 días corridos desde la aceptación de la orden de compra, capacitación y manuales incluidos.
- **Interoperabilidad** (P14): no hay sistema con el cual integrarse; basta capacidad de API, servicios web o exportación.
- **Actualizaciones sin costo** (P16, P21): cualquier modificación derivada de cambios normativos de la Ley 19.378.
- **Propiedad intelectual** (P20): el proveedor conserva el software (modalidad SaaS); los datos son del Municipio y se entregan íntegros al término.
- **Pago** (P23): 24 cuotas mensuales desde la puesta en marcha con recepción conforme. **Presupuesto** (P19): el del certificado de disponibilidad presupuestaria, $10.600.000 IVA incluido.

## Preguntas y respuestas

### 1 · 12-09-2026 13:35:45

**Pregunta.** El punto 17 de las bases técnicas señala que el proveedor deberá acreditar experiencia en implementación de sistemas de gestión en instituciones públicas o municipalidades", sin asociarle puntaje. En contraste, el criterio "experiencia del proveedor"(10%) de las bases administrativas contempla el tramo "ninguna: 0 puntos", y el punto 3.4 de las bases técnicas, que enumera las causales de inadmisibilidad técnica, no incluye experiencia. Se solicita confirmar que la acreditación de experiencia del punto 17 se evalúa exclusivamente a través del criterio C, y que una oferta que no acredite experiencia previa es admisible y se evalúa con 0 puntos en dicho criterio, sin ser inadmisible.

**Respuesta.** Estimado oferente, se aclara que la experiencia del proveedor será considerada y evaluada conforme al criterio C.- “Experiencia del Proveedor”, establecido en las Bases Administrativas, cuya pauta contempla expresamente el tramo “Ninguna: 0 puntos”.
Por lo tanto, la falta de experiencia previa, por sí sola, no constituye causal de inadmisibilidad de la oferta. El oferente que no cuente con experiencia podrá ser evaluado con 0 puntos en dicho criterio.

### 2 · 12-09-2026 13:39:30

**Pregunta.** Respecto del acceso a la plataforma de demostración, se solicita aclarar: (a) si la plataforma debe presentarse con datos ficticios cargados por el oferente para permitir la verificación de las funcionalidades, o sí la Comisión cargará sus propios datos de prueba y (b) si el envío de las credenciales al correo licitacion.cf@daslota.cl debe efectuarse antes de la fecha de cierre de recepción de ofertas o si puede realizarse hasta el inicio del periodo de evaluación.

**Respuesta.** a) La plataforma de demostración deberá ser presentada por el oferente con datos ficticios o de prueba previamente cargados, en cantidad y condiciones suficientes para permitir a la Comisión de Evaluación verificar y operar las funcionalidades ofertadas. La Comisión no realizará la carga de datos para habilitar la demostración.
b) Los antecedentes de acceso deberán ser enviados al correo licitacion.cf@daslota.cl una vez efectuada la oferta en el portal de Mercado Público y, a más tardar, antes del inicio del período de evaluación, debiendo la plataforma y sus accesos permanecer habilitados durante todo dicho período, conforme a lo establecido en las Bases Técnicas.

### 3 · 12-09-2026 15:28:18

**Pregunta.** Considerando que el numeral 5 de las Bases Técnicas exige parametrizar las reglas de carrera funcionaria según el reglamento comunal, se solicita poner a disposición de los oferentes el reglamento de carrera funcionaria vigente del Departamento de Salud de Lota, incluyendo las tablas de puntaje por capacitación y reconocimiento de estudios, o en su defecto indicar si la parametrización se realizará durante la implementación con antecedentes que entregará el Departamento.

**Respuesta.** La parametrización se realizará durante la implementación con los antecedentes que entregue el Departamento de Salud de Lota.

### 4 · 12-09-2026 15:28:25

**Pregunta.** Respecto de la carga inicial de datos del numeral 8 y la migración de información histórica del numeral 15 de las Bases Técnicas, se solicita precisar si la información de la dotación (nómina, bienios reconocidos, capacitaciones, reconocimiento de estudios y calificaciones) se encuentra actualmente en planillas o en algún sistema en uso, en qué formato será entregada al adjudicatario, el período histórico que deberá migrarse, y si dicha carga se considera dentro del plazo de implementación para efectos del criterio D y del plazo máximo del numeral 8.

**Respuesta.** Se entregará al proveedor una planilla con el grado y puntaje vigente de cada funcionario, información que deberá ser cargada inicialmente en el sistema. No se requerirá la carga de puntajes ni antecedentes históricos.
A partir de la fecha de puesta en marcha, el sistema deberá permitir administrar y mantener actualizada la carrera funcionaria de cada funcionario, registrando los movimientos, modificaciones y nuevos antecedentes que correspondan en adelante.

### 5 · 12-09-2026 15:28:31

**Pregunta.** El numeral 8 de las Bases Técnicas fija un plazo máximo de 10 días corridos "desde la firma del contrato", mientras que el numeral 16 de las Bases Administrativas señala que el contrato se hace efectivo con la aceptación de la orden de compra y que el contrato escrito se suscribe dentro de 20 días hábiles. Se solicita precisar desde cuál de esos hitos se contará el plazo de implementación, y aclarar cómo se concilia dicho plazo máximo con los tramos de 11 a 20 días corridos contemplados en el criterio D de evaluación.

**Respuesta.** Se aclara que el plazo máximo de implementación de 10 días corridos se contará desde la aceptación de la Orden de Compra por parte del proveedor, considerando que, conforme al numeral 16 de las Bases Administrativas, el servicio se hace efectivo con dicha aceptación.
La posterior suscripción del contrato escrito dentro del plazo establecido en las Bases Administrativas no modifica el inicio del cómputo del plazo de implementación.

### 6 · 12-09-2026 15:28:38

**Pregunta.** Se solicita indicar el número de establecimientos de salud de la comuna que operarán en el sistema, el número estimado de usuarios con perfil administrador y de supervisión, y si el portal del funcionario del numeral 10 debe habilitarse para la totalidad de la dotación desde la puesta en marcha o de forma gradual.

**Respuesta.** Los centros de salud son los siguientes: CESFAM Juan Cartes Arias, Cesfam Sergio Lagos Olave, Cecosf de Colcura y Departamento de Salud de Lota. Sumando un total aproximado de 320 funcionario aproximadamente. Los cuales deben ser ingresados en el sistema en su totalidad.

### 7 · 12-09-2026 15:28:45

**Pregunta.** Atendido que el numeral 3.4 de las Bases Técnicas enumera taxativamente las causales de inadmisibilidad técnica y no incluye la experiencia, y que el criterio C de las Bases Administrativas asigna 0 puntos al tramo "ninguna", se solicita confirmar que el numeral 17 de las Bases Técnicas no constituye un requisito de admisibilidad, y que una oferta que presente el Anexo N°4 sin experiencia acreditada será admitida y evaluada con 0 puntos en dicho criterio.

**Respuesta.** Se aclara que la experiencia del proveedor será considerada y evaluada conforme al criterio C.- “Experiencia del Proveedor”, establecido en las Bases Administrativas, cuya pauta contempla expresamente el tramo “Ninguna: 0 puntos”.
Por lo tanto, la falta de experiencia previa, por sí sola, no constituye causal de inadmisibilidad de la oferta. El oferente que no cuente con experiencia podrá ser evaluado con 0 puntos en dicho criterio.
Sin perjuicio de lo anterior, el Anexo N°4 “Experiencia del Proveedor” corresponde a un antecedente obligatorio de la oferta, por lo que deberá ser presentado conforme a lo establecido en las Bases. Asimismo, la experiencia declarada deberá acreditarse en la forma indicada en las mismas.

### 8 · 12-09-2026 15:28:52

**Pregunta.** Respecto del punto 24 letra c) de las Bases Administrativas, se solicita confirmar que el alojamiento de la plataforma y de los datos en un datacenter ubicado en territorio nacional, operado por un proveedor de infraestructura chileno individualizado en la oferta técnica, cumple con la exigencia de residencia de los datos, y que la autorización escrita para el uso de dicho proveedor podrá entenderse otorgada con la adjudicación, sin requerir un trámite posterior.

**Respuesta.** Se aclara que el alojamiento de la plataforma y de los datos en un datacenter ubicado dentro del territorio nacional cumple con la exigencia de residencia de los datos establecida en las Bases.
No obstante, cuando dicho alojamiento corresponda a servidores de un tercero, este deberá ser individualizado en la oferta técnica y su utilización deberá contar con la autorización previa y por escrito del Departamento de Salud, conforme a lo establecido en el numeral 24, letra c), de las Bases Administrativas.
Por lo anterior, la adjudicación no se entenderá por sí sola como autorización escrita para el uso de un tercero no autorizado previamente.

### 9 · 13-09-2026 20:08:53

**Pregunta.** En el 24C dice que no se deben almacenar los datos fuera del territorio nacional... para los efectos de la demo, se puede presentar la aplicacion almacenando fuera del pais, con el compromiso de que al ser adjudicado, las bases de datos estarán en Chile?

**Respuesta.** si

### 10 · 14-09-2026 18:50:46

**Pregunta.** Para efectos del criterio “Experiencia del Proveedor”, se solicita aclarar si podrán considerarse implementaciones de plataformas o sistemas de gestión realizadas para entidades privadas, organizaciones del sector salud u otras instituciones, o si únicamente serán consideradas experiencias ejecutadas para instituciones públicas o municipalidades.

**Respuesta.** Conforme a lo establecido en el numeral 17 de las Bases Técnicas, para efectos del criterio “Experiencia del Proveedor” se considerarán únicamente experiencias en la implementación de sistemas de gestión iguales o equivalentes, en instituciones públicas o privadas.

### 11 · 14-09-2026 18:51:02

**Pregunta.** Se solicita confirmar si la solución ofertada puede corresponder a un sistema desarrollado y/o parametrizado específicamente para los requerimientos del Departamento de Salud de Lota, siempre que al momento de presentación de la oferta exista una plataforma DEMO funcional, operable y correspondiente a la solución efectivamente ofertada.

**Respuesta.** La solución ofertada podrá corresponder a un sistema desarrollado y/o parametrizado específicamente para los requerimientos del Departamento de Salud de Lota, siempre que, al momento de presentar la oferta, exista una plataforma DEMO funcional, operable y correspondiente a la solución efectivamente ofertada.
La plataforma deberá permitir a la Comisión de Evaluación verificar directamente las funcionalidades comprometidas, conforme a lo establecido en las Bases Técnicas.

### 12 · 14-09-2026 18:51:20

**Pregunta.** Considerando que las Bases Técnicas establecen funcionalidades mínimas obligatorias y que la pauta de evaluación contempla los niveles “cumple totalmente”, “cumple parcialmente” y “no cumple”, se solicita precisar cuáles funcionalidades deberán encontrarse necesariamente operativas en la plataforma DEMO para que la oferta sea admisible y cuáles podrán presentar cumplimiento parcial y ser completadas durante la etapa de implementación.

**Respuesta.** Las funcionalidades mínimas establecidas en las Bases Técnicas tienen carácter obligatorio y deberán encontrarse disponibles y operativas en la plataforma DEMO, de manera que la Comisión de Evaluación pueda verificarlas y operar directamente el sistema.
La evaluación de “cumple totalmente”, “cumple parcialmente” y “no cumple” se realizará conforme a la pauta de evaluación establecida en las Bases. El cumplimiento parcial no constituye una autorización para omitir funcionalidades mínimas obligatorias ni para postergar su implementación, salvo que las propias Bases contemplen expresamente dicha posibilidad.

### 13 · 14-09-2026 18:51:40

**Pregunta.** Complementando la consulta ya formulada respecto del formato y período histórico de la información a migrar, se solicita indicar, si se dispone de dicha información, el volumen estimado de registros y documentos asociados a la migración y si ésta comprenderá también antecedentes de exfuncionarios que ya no formen parte de la dotación aproximada de 250 funcionarios actualmente indicada en las Bases Técnicas.

**Respuesta.** No se contempla la migración de información histórica correspondiente a años anteriores.
Para la inicialización de la base de datos, el Departamento de Salud entregará al proveedor una planilla con la información vigente de los funcionarios, incluyendo sus grados y puntajes actuales a la fecha de implementación. El proveedor deberá realizar la carga de dicha información en el sistema.
Por lo tanto, la carga inicial comprenderá la información vigente de los funcionarios considerados a la fecha de puesta en marcha, y no se contempla la incorporación de antecedentes históricos de años anteriores ni de exfuncionarios que ya no formen parte de la dotación a dicha fecha.

### 14 · 14-09-2026 18:51:53

**Pregunta.** Respecto de la exigencia de interoperabilidad, se solicita indicar si actualmente existe algún sistema institucional con el cual la plataforma deberá integrarse efectivamente. En caso afirmativo, indicar sistema, información a intercambiar y mecanismos de interoperabilidad disponibles. En caso contrario, confirmar si será suficiente que la solución disponga de capacidad de integración mediante API, exportaciones u otros mecanismos equivalentes.

**Respuesta.** Se aclara que actualmente el Departamento de Salud no cuenta con un sistema institucional específico con el cual la solución deba integrarse.
No obstante, la plataforma ofertada deberá contar con capacidades de interoperabilidad que permitan una eventual integración futura con otros sistemas institucionales, mediante API, servicios web, exportación/importación de datos u otros mecanismos equivalentes disponibles en la solución.

### 15 · 14-09-2026 18:52:06

**Pregunta.** Respecto de la exigencia de residencia de datos, se solicita aclarar si podrá utilizarse infraestructura de un proveedor cloud internacional siempre que la región, datacenter y almacenamiento efectivo de los datos se encuentren físicamente ubicados en territorio chileno, o si se exige que el proveedor de infraestructura sea necesariamente una empresa chilena.

**Respuesta.** Se aclara que el alojamiento de la plataforma y de los datos en un datacenter ubicado dentro del territorio nacional cumple con la exigencia de residencia de los datos establecida en las Bases.
No obstante, cuando dicho alojamiento corresponda a servidores de un tercero, este deberá ser individualizado en la oferta técnica y su utilización deberá contar con la autorización previa y por escrito del Departamento de Salud, conforme a lo establecido en el numeral 24, letra c), de las Bases Administrativas.
Por lo anterior, la adjudicación no se entenderá por sí sola como autorización escrita para el uso de un tercero no autorizado previamente.

### 16 · 14-09-2026 18:52:20

**Pregunta.** Respecto de la obligación de realizar actualizaciones sin costo asociadas a modificaciones normativas de la Ley N.º 19.378, se solicita precisar si dicha obligación comprende exclusivamente ajustes a las funcionalidades, reglas y procesos incluidos en la solución contratada o si podría extenderse a nuevos módulos o funcionalidades no contemplados originalmente.

**Respuesta.** Debe implicar cualquier modificación que establezca algún cambio en la normativa vigente relacionada a la ley 19.378

### 17 · 14-09-2026 18:52:37

**Pregunta.** Se solicita confirmar si la contratación exigirá garantía de fiel cumplimiento. En caso afirmativo, indicar porcentaje o monto, vigencia e instrumentos admitidos.

**Respuesta.** Remítase a las Bases Administrativas

### 18 · 14-09-2026 18:52:49

**Pregunta.** Considerando que la ficha de Mercado Público señala que el contrato no contempla renovación, mientras las Bases Administrativas hacen referencia a la posibilidad de una renovación por hasta 12 meses, se solicita aclarar cuál condición resulta aplicable a esta contratación y, en caso de existir renovación, bajo qué condiciones económicas y contractuales se efectuaría.

**Respuesta.** Remítase a las Bases Administrativas

### 19 · 14-09-2026 18:53:02

**Pregunta.** Al revisar los antecedentes del proceso se observa que las Bases, el Certificado de Disponibilidad Presupuestaria N.º 337 y el Decreto aprobatorio hacen referencia a un presupuesto de $10.600.000 IVA incluido, mientras que la Solicitud de Compra N.º 357, de fecha 26 de agosto de 2026, señala un monto de $10.500.000 IVA incluido. Se solicita confirmar cuál es el presupuesto oficial disponible y aplicable para la presente contratación.

**Respuesta.** El certificado de disponibilidad presupuestaria indica el monto disponible para este proyecto.

### 20 · 14-09-2026 18:55:39

**Pregunta.** Las Bases Técnicas establecen que toda la información almacenada en el sistema será de propiedad exclusiva de la I. Municipalidad de Lota – Departamento de Salud, pero no se especifica el régimen de propiedad intelectual de la solución informática. Se solicita confirmar si el proveedor conservará la propiedad intelectual del software, código fuente, componentes reutilizables, frameworks y know-how de la solución, otorgando al Departamento el correspondiente derecho de uso durante la vigencia contractual, o si se exige la cesión total o parcial de la propiedad intelectual y/o la entrega del código fuente al término del contrato.

**Respuesta.** El proveedor conservará la propiedad intelectual, derechos de autor, código fuente, frameworks y know-how de la solución informática prestada en modalidad SaaS (Software as a Service). Por su parte, se reitera que toda la información, registros, datos ingresados o generados por el uso del sistema son de propiedad exclusiva de la I. Municipalidad de Lota – Departamento de Salud. Por ello, al término o resolución del contrato, el proveedor no mantendrá propiedad alguna sobre los datos y deberá garantizar su entrega integral al Municipio en los formatos estipulados (Excel/Base de datos completa) conforme a las Bases Técnicas, procediendo con la eliminación y confidencialidad absoluta de dichos registros en sus servidores.

### 21 · 14-09-2026 18:56:19

**Pregunta.** Respecto del numeral 7 de las Bases Técnicas, que contempla mantención correctiva y evolutiva del sistema durante la vigencia contractual, se solicita precisar el alcance de la expresión “mantención evolutiva”, indicando si ésta comprende ajustes, mejoras y perfeccionamientos de las funcionalidades originalmente contratadas, o si podría incluir el desarrollo de nuevos módulos, funcionalidades o requerimientos no contemplados en las Bases. En este último caso, se solicita indicar cómo se determinaría su alcance y eventual tratamiento económico.

**Respuesta.** Debe implicar cualquier modificación que establezca algún cambio en la normativa vigente relacionada a la ley 19.378

### 22 · 14-09-2026 18:56:38

**Pregunta.** Respecto de la migración de información histórica, se solicita precisar la responsabilidad de las partes respecto de la calidad de los datos de origen. En particular, indicar si el Departamento entregará al adjudicatario la información previamente validada y depurada, o si corresponderá al proveedor realizar adicionalmente procesos de limpieza, homologación, deduplicación y corrección de registros incompletos o inconsistentes. Asimismo, se solicita señalar quién deberá validar finalmente la información migrada antes de su incorporación definitiva al sistema.

**Respuesta.** No se contempla la migración de información histórica correspondiente a años anteriores.
Para la inicialización de la base de datos, el Departamento de Salud entregará al proveedor una planilla con la información vigente de los funcionarios, incluyendo sus grados y puntajes actuales a la fecha de implementación. El proveedor deberá realizar la carga de dicha información en el sistema.
Por lo tanto, la carga inicial comprenderá la información vigente de los funcionarios considerados a la fecha de puesta en marcha, y no se contempla la incorporación de antecedentes históricos de años anteriores ni de exfuncionarios que ya no formen parte de la dotación a dicha fecha.

### 23 · 14-09-2026 18:57:39

**Pregunta.** Considerando que la oferta económica corresponde al valor total del servicio por 24 meses y que las Bases Administrativas establecen pago por mes vencido, se solicita confirmar si el monto adjudicado deberá facturarse en 24 cuotas mensuales iguales, o si se contempla una estructura distinta de facturación. Asimismo, se solicita precisar desde qué hito podrá emitirse la primera factura mensual, especialmente considerando la etapa inicial de implementación y puesta en marcha.

**Respuesta.** El monto adjudicado deberá facturarse en 24 cuotas mensuales. El inicio del servicio se considera desde la fecha de puesta en marcha y recepción conforme del sistema ofertado

### 24 · 14-09-2026 18:58:16

**Pregunta.** Considerando que el numeral 8 de las Bases Técnicas incluye dentro de la implementación la capacitación a usuarios administradores y establece que el sistema deberá encontrarse completamente operativo en un plazo máximo de 10 días corridos, se solicita confirmar si la capacitación inicial y entrega de manuales y material de apoyo deberán encontrarse íntegramente realizadas dentro de dicho plazo de 10 días, o si podrán ejecutarse posteriormente conforme a una programación acordada con el Departamento.

**Respuesta.** Por favor referirse al numeral 8 de las bases.
