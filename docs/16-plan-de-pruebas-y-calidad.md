# 16 — Plan de pruebas y control de calidad

Objetivo: que la comisión no encuentre un error en cinco días de uso libre. Eso no se logra "probando al
final": se logra con tres capas automáticas y un recorrido manual disciplinado antes de congelar.

## Capa 1 — Unitarias (Vitest 4)

**Motor de carrera** (`tests/motor/`): la capa más importante. Un test por regla y por borde, más los
cuatro ejemplos del doc 14 cifra por cifra.

- `bienios.test.ts`: dos años exactos; brecha por renuncia y reingreso; experiencia externa reconocida con fecha; ingreso el 29 de febrero; fecha de corte anterior al primer bienio.
- `capacitacion.test.ts`: cada tramo de horas; no aprobada = 0; tope; excedente simple; excedente en cadena de dos años; excedente que caduca al tercero; cambio de tope entre versiones de regla.
- `estudios.test.ts`: puntaje solo en A y B; beneficio informativo en C a F.
- `niveles.test.ts`: exactamente en el umbral; un punto bajo; nivel vigente distinto del calculado.
- `proyeccion.test.ts`: con y sin capacitación previa; supuestos en la salida.
- `snapshot.test.ts`: situación al 31/12/2024 del ejemplo 1 = 105 puntos, nivel 10.
- `ejemplos.test.ts`: los cuatro casos completos.

**Utilidades**: `rut.test.ts` (dígito K, RUT corto, ceros a la izquierda, formato), `fechas.test.ts` (zona horaria Chile, dd/mm/aaaa), `diffCampos.test.ts`.

**Server actions** (`tests/acciones/`): con base de datos de prueba (Postgres en Docker, `DATABASE_URL_TEST`): cada acción valida entradas inválidas (devuelve error con campo), escribe correctamente y **deja un registro de auditoría con antes y después**. Un test que falle si alguna acción escribe sin auditoría.

**Exportación**: generar el XLSX de la nómina y releerlo con ExcelJS: encabezados, tipos (fecha como fecha), conteo de filas. CSV: escapes de comas y comillas. PDF: que exista, tenga más de una página para la dotación completa y contenga el texto "Situación al".

Meta: cobertura ≥ 90 % en `src/lib/motor` y `src/lib/acciones`; el resto sin meta numérica.

## Capa 2 — Componentes (Vitest + Testing Library)

Solo los componentes con lógica propia: `RielCarrera` (posición del marcador según nivel), `DataTable` (filtro, orden, variante tarjeta en viewport móvil), `FormField` (muestra error asociado por `aria-describedby`). No se testean componentes de shadcn sin modificar.

## Capa 3 — End-to-end (Playwright)

Se prueba contra la aplicación completa con el seed de demo cargado. Entre 15 y 25 recorridos, no cientos: los flujos del doc 13, cada uno en **tres viewports**.

```ts
// playwright.config.ts
projects: [
  { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  { name: "tablet",     use: { ...devices["iPad (gen 7)"] } },
  { name: "celular",    use: { ...devices["iPhone 14"] } },
]
```

Recorridos mínimos (uno por flujo del doc 13): login con los tres roles y bloqueo por intentos; buscar y abrir ficha; registrar capacitación y verificar puntaje y excedente en pantalla; reconocer bienio; registrar cambio de nivel; leer proyección; atender alerta; generar reporte a fecha y descargar XLSX, CSV y PDF (verificar que el archivo se descarga y no está vacío); exportación integral; bitácora con antes y después; respaldos; cambiar parámetro con vigencia; importar Excel con error y sin error; portal del funcionario y prohibición de ver a otro; expiración de sesión.

Reglas de escritura:
- Localizadores por rol y etiqueta (`getByRole("button", { name: "Registrar capacitación" })`), `data-testid` solo donde no hay texto estable. Esto obliga a que la accesibilidad esté bien y hace los tests robustos a cambios de estilo.
- Sin `waitForTimeout`; aserciones web-first (`toBeVisible`, `toHaveText`).
- Cada test crea o usa datos del seed con identificadores conocidos ("Caso 1"); sin dependencia entre tests.
- Trazas y captura en fallo; `retries: 1` en CI.

**Accesibilidad automatizada**: `@axe-core/playwright` en cada página principal con etiquetas `wcag2a`, `wcag2aa`, `wcag21aa`; cero violaciones como criterio de paso. Cubre contraste, etiquetas, roles, `lang`, títulos.

**Visual**: capturas de referencia de las diez pantallas principales en los tres viewports (`toHaveScreenshot`), revisadas a mano una vez y usadas después para detectar regresiones de maquetación.

## Capa 4 — Recorrido manual antes de congelar

Con la versión candidata desplegada en el servidor real, tres personas, tres dispositivos físicos (un PC, una tablet o el modo tablet del navegador, un celular Android y uno iPhone si hay). Lista:

1. Entrar con cada uno de los tres usuarios de demo.
2. Recorrer la pauta de 15 subcriterios en el orden del doc 11, marcando "se encontró sin ayuda" y "funcionó a la primera".
3. Abrir cada uno de los nueve reportes en los tres alcances y a dos fechas; descargar los tres formatos y abrirlos (Excel real, lector de PDF real).
4. Ejecutar la exportación integral y abrir el ZIP.
5. Probar los errores: RUT inválido, fecha de término anterior a inicio, archivo Excel con columnas mal, URL de otro funcionario desde el portal.
6. Dejar la sesión abierta 31 minutos y comprobar la expiración.
7. Apagar y encender el contenedor `web`: la aplicación vuelve sola, la sesión se mantiene.
8. Restaurar el último respaldo en una base aparte y comparar conteos.
9. Revisar que ningún dato del seed sea real (nombres, RUT, correos).
10. Leer cada pantalla en el celular con el texto del sistema al 120 %.

Todo hallazgo se anota con pantalla, dispositivo y paso; se corrige, se vuelve a correr la suite automática, y se repite el punto afectado.

## Integración continua

GitHub Actions en cada PR: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest con Postgres como servicio), `pnpm build`, y Playwright en Chromium para los tres viewports contra un contenedor efímero con el seed. El PR no se fusiona con algo en rojo. El despliegue a la demo se hace solo desde `main` con etiqueta.

## Congelamiento

- Se etiqueta `demo-lota-2026-09-25`.
- A partir de ahí, en el servidor de la demo solo se despliegan correcciones de bloqueo (algo que impida operar), aprobadas por dos personas, con la suite completa en verde, y anotadas en un registro de cambios que se conserva por si la comisión pregunta.
- Nada de "mejoras" durante la evaluación.

## Lista de las 24 horas previas al envío de credenciales

- [ ] Suite automática completa en verde en `main` etiquetado.
- [ ] Recorrido manual completo sin hallazgos abiertos.
- [ ] Monitoreo externo activo y alerta probada (apagar `web` un minuto y recibir el aviso).
- [ ] Respaldo ejecutado y restaurado con éxito hoy; fila marcada "verificado".
- [ ] Certificado TLS válido con más de 30 días de vigencia; HSTS activo.
- [ ] Contraseñas de las tres cuentas de demo generadas y guardadas en el gestor del equipo.
- [ ] Guía de una página revisada contra la versión desplegada (capturas al día).
- [ ] Correo a `licitacion.cf@daslota.cl` redactado, con remitente del dominio de Aeroconce, listo para enviar tras subir la oferta.
