# Sistema de Gestión de Carrera Funcionaria APS (Ley 19.378) — Documentación base

Documentación para construir la plataforma que se ofertará y demostrará en la licitación **3019-20-LE26**
del Departamento de Salud de Lota, y que después sirve como producto para cualquier Departamento de
Salud municipal del país (todos operan bajo la misma ley).

Toda exigencia citada viene de las Bases Administrativas (BA) y Bases Técnicas (BT) del Decreto D.A.S.
N°01080/2026. Donde la ley o el reglamento comunal fijan valores numéricos, este documento **no los
inventa**: los declara parámetros configurables y señala qué hay que confirmar con el reglamento de Lota
(pedido en el foro, respuesta el 16/09).

| Doc | Contenido |
|---|---|
| `01-alcance-y-requisitos.md` | Mapa de cada exigencia de las bases a un requisito del sistema; qué es admisibilidad y qué es puntaje |
| `02-arquitectura.md` | Stack, estructura del proyecto, hosting, dominio, TLS, respaldos, ambientes |
| `03-modelo-de-datos.md` | Entidades, campos, relaciones, auditoría, parametrización con vigencia |
| `04-motor-de-carrera.md` | Reglas de negocio: categorías, niveles, bienios, capacitación, excedentes, estudios, puntaje, proyección, alertas, cálculo histórico |
| `05-modulos-y-pantallas.md` | Cada módulo: pantallas, acciones, perfiles que acceden |
| `06-reportes-y-exportacion.md` | Los 9 reportes, filtros, histórico a fecha, XLSX/CSV/PDF, exportación integral |
| `07-seguridad-auditoria-respaldos.md` | Autenticación, perfiles, bitácora, respaldos acreditables, protección de datos |
| `08-importacion-y-datos-demo.md` | Importador desde Excel (migración) y el dataset ficticio que la demo necesita |
| `09-plan-de-construccion.md` | Orden de construcción por puntos, checklist de admisibilidad y de los 15 subcriterios, entrega a la comisión |
| `10-stack-y-librerias.md` | Stack decidido con verificación a septiembre de 2026, alternativas descartadas, package.json y docker-compose de partida |
| `11-objetivo-de-la-demo.md` | Resumen ejecutivo de la demo: reglas, quién evalúa, los 15 subcriterios, dataset y credenciales |
| `12-diseno-ui-y-textos.md` | Sistema visual, layout por dispositivo, componentes (shadcn sobre Base UI), estados, accesibilidad, glosario y textos |
| `13-flujos-de-usuario.md` | Dieciséis flujos paso a paso con validaciones, auditoría y alertas |
| `14-parametros-demo-y-ejemplos.md` | Reglas de demostración con vigencias y cuatro casos resueltos cifra por cifra |
| `15-convenciones-de-codigo.md` | Idioma, capas, validación, auditoría obligatoria, errores, estilo, calidad automática, git |
| `16-plan-de-pruebas-y-calidad.md` | Unitarias del motor, componentes, E2E en tres viewports con axe, recorrido manual, CI, congelamiento |
| `17-runbook-y-entrega.md` | Servidor, despliegue, respaldos, monitoreo, incidentes, correo y guía para la comisión, manual de usuario |
| `18-respuestas-foro.md` | Transcripción del foro (21/09) y qué cambia: sin migración histórica, carga inicial con saldo de apertura, 320 funcionarios, demo fuera de Chile permitida, todas las funcionalidades operativas |

## Principios que gobiernan el diseño

1. **Lo que se declara en el Anexo N°3 se verifica en la demo.** La comisión entra sola. Cada función tiene que encontrarse sin ayuda y funcionar a la primera.
2. **Los valores normativos son parámetros con vigencia.** Puntos por bienio, tablas de capacitación, umbrales de nivel, topes anuales: nunca en código. Cada parámetro tiene fecha desde/hasta, porque los reportes históricos deben recalcular con la regla vigente en esa fecha (BT 5, subcriterio 10).
3. **Todo cambio deja rastro.** Usuario, fecha y hora, acción, valor anterior y nuevo (BT 4.9, subcriterio 14).
4. **Los datos son del municipio y se pueden llevar.** Exportación integral en un clic: base de datos, diccionario de datos, Excel por funcionario (BT 6, subcriterio 12).
5. **Multi-comuna desde el día uno.** Lota es la primera; el modelo no asume una sola institución.
