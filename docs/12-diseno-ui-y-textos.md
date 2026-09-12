# 12 — Diseño de interfaz y textos

## Para quién y para qué

- **Quién**: la Encargada de Carrera Funcionaria y su equipo (uso diario, PC), la Jefatura del Departamento (consulta, PC y tablet), 250 funcionarios de salud (portal, mayoritariamente celular), y una comisión evaluadora que entrará sin instrucción previa.
- **Qué hace la interfaz**: mostrar números que deben ser correctos y fáciles de comprobar (bienios, puntajes, niveles), permitir registrar hechos administrativos (capacitación, reconocimiento, decreto) sin errores, y producir reportes.
- **Tono**: institucional y sereno. Es una herramienta de gestión de personas en salud pública, no un producto de consumo. Nada debe parecer "startup".

## Base técnica (verificada en septiembre de 2026)

- **shadcn/ui sobre Base UI**. Desde julio de 2026 shadcn/ui usa Base UI como librería por defecto para proyectos nuevos; Radix sigue soportado. Los componentes se copian al repositorio (`src/components/ui`), no son una dependencia opaca, y traen accesibilidad resuelta (foco, teclado, lectores de pantalla) en diálogos, selects, tabs y menús, que es lo más difícil de hacer bien a mano. Los blocks de sidebar, login y dashboard existen para ambas librerías.
- **Tailwind CSS 4** para todo el estilo. Sin CSS a mano salvo la hoja de impresión de reportes.
- **TanStack Table 9** (headless) para todas las tablas, con el ejemplo oficial para shadcn/Base UI como punto de partida. Sorting, filtros, paginación y visibilidad de columnas sin escribir la lógica.
- **react-hook-form + @hookform/resolvers + Zod** para formularios; envío por Server Actions. React Hook Form sigue siendo el estándar por defecto en 2026, con soporte de Zod 4 vía Standard Schema.
- **lucide-react** para íconos (viene con shadcn).
- **next/font** con la tipografía descargada en build y servida desde el propio servidor: cero peticiones a terceros en ejecución.
- **sonner** para notificaciones (toast), incluido en shadcn.

Esto corrige el doc 02, que decía "sin librerías de componentes": lo que se evita son frameworks pesados de UI; shadcn es código propio con primitivas accesibles, y es lo que permite calidad senior sin reinventar un combobox.

## Sistema visual

### Color

| Nombre | Hex | Uso |
|---|---|---|
| Fondo | `#F6F8F7` | Fondo de aplicación; blanco frío con un toque verde, no crema |
| Superficie | `#FFFFFF` | Tarjetas, tablas, formularios |
| Tinta | `#22303A` | Texto principal; azul pizarra oscuro, no negro tintado |
| Tinta secundaria | `#5B6B75` | Texto de apoyo, etiquetas de campo |
| Institucional | `#0F5C6B` | Acción principal, enlaces, nivel actual, encabezados de sección |
| Institucional suave | `#D9E9EC` | Fondos de selección, filas activas, chips |
| Alerta | `#B9690E` | Alertas pendientes, bienio próximo |
| Correcto | `#2E7D4F` | Reconocido, aprobado, respaldo OK |
| Error | `#B23A3A` | Validaciones, fallos, no aprobado |
| Línea | `#DCE3E1` | Bordes de tabla y separadores |

Reglas: un solo color de acción (institucional). Los semánticos (alerta, correcto, error) solo en estados, nunca como decoración. Contraste mínimo 4,5:1 en texto; todas las combinaciones de la tabla lo cumplen sobre fondo y superficie.

### Tipografía

Una sola familia: **IBM Plex Sans**, con `font-variant-numeric: tabular-nums` activado globalmente. Razón: los puntajes, fechas y RUT se leen en columnas; las cifras tabulares alinean sin esfuerzo. Plex tiene personalidad propia sin ser llamativa y rinde bien en pantallas pequeñas.

Escala (rem): 0,8125 (notas y celdas densas) · 0,9375 (cuerpo y tablas) · 1 (formularios) · 1,125 (títulos de tarjeta) · 1,375 (título de página) · 1,75 (cifra destacada en la ficha). Pesos: 400 cuerpo, 500 etiquetas y títulos de tarjeta, 600 títulos de página y cifras. Interlineado 1,5 en cuerpo, 1,25 en cifras.

Nada en mayúsculas sostenidas. Nada de etiquetas "eyebrow" sobre los títulos. Los títulos dicen lo que hay debajo, en sentence case: "Bienios reconocidos", no "BIENIOS".

### Espaciado y forma

- Rejilla de 4 px. Padding de tarjeta 20 px; de celda 10 × 12 px; entre secciones 32 px.
- Un solo radio: 6 px. Sin sombras; la jerarquía se hace con bordes de una línea (`Línea`) y fondo `Superficie` sobre `Fondo`.
- Ancho máximo de contenido 1280 px en escritorio; el portal del funcionario, 640 px.

### El elemento memorable: el riel de carrera

En la cabecera de cada ficha y en el portal del funcionario, un riel horizontal con los 15 niveles como marcas, el nivel actual resaltado en institucional, el siguiente nivel marcado, y debajo en cifra grande: "Le faltan 11 puntos · estimado marzo 2028". Es la única pieza con tratamiento visual propio; todo lo demás es tablas y formularios sobrios. Es exactamente lo que la Encargada mira primero y lo que un funcionario quiere ver en su celular.

```
Nivel 15 ····●···●···●···●···●···◉───○···●···●···●···●···●···●···● Nivel 1
                          actual 9   siguiente 8
                     129 puntos · faltan 11 · estimado marzo 2028
```

Motion: solo al cambiar de nivel en pantalla (el marcador se desplaza, 300 ms). Nada más se anima por sí solo; `prefers-reduced-motion` desactiva incluso eso.

## Layout

### Escritorio (≥ 1024 px)

```
┌──────────┬──────────────────────────────────────────────┐
│ Logo DAS │ Título de página                 Usuario ▾   │
│          ├──────────────────────────────────────────────┤
│ Inicio   │                                              │
│ Funcion. │   Contenido (máx. 1280 px, alineado izq.)    │
│ Carrera  │                                              │
│ Capacit. │   Tablas a ancho completo, formularios       │
│ Calific. │   en dos columnas, fichas con pestañas       │
│ Reportes │                                              │
│ Alertas  │                                              │
│ Docum.   │                                              │
│ Parám.   │                                              │
│ Auditor. │                                              │
│ Respald. │                                              │
└──────────┴──────────────────────────────────────────────┘
```

Sidebar de shadcn (block `sidebar-07` o similar), colapsable a íconos. Los nombres del menú son los de las bases, en ese orden.

### Tablet (768–1023 px)

Sidebar colapsada a íconos con etiqueta al pasar; contenido a una columna; formularios a una columna; tablas con columnas secundarias ocultas por defecto (TanStack `columnVisibility`) y un botón "Columnas" para mostrarlas.

### Celular (< 768 px)

Barra superior con título y botón de menú que abre un `Sheet` lateral con la misma navegación. **Las tablas principales se convierten en listas de tarjetas**: una tarjeta por fila con los tres o cuatro datos clave y un toque para abrir la ficha. Sin scroll horizontal en listados; el scroll horizontal queda solo para reportes tabulares, con indicador visible. Botones de acción a ancho completo al pie. Objetivos táctiles de mínimo 44 px.

El **portal del funcionario** es móvil primero: una columna, el riel de carrera arriba, y debajo secciones apilables (capacitaciones, bienios, calificaciones, documentos) con acordeón.

## Componentes base (todos desde shadcn, adaptados una vez)

| Componente | Uso | Notas |
|---|---|---|
| `DataTable` | Todos los listados | TanStack Table + shadcn table; búsqueda, filtros por columna, paginación, exportar; variante tarjeta en móvil |
| `FichaHeader` | Cabecera de funcionario | Nombre, RUT, categoría, establecimiento, estado + riel de carrera |
| `Tabs` | Pestañas de la ficha | Scroll horizontal de pestañas en móvil |
| `Form` + `FormField` | Todos los formularios | Etiqueta arriba, ayuda debajo, error en rojo con ícono, foco visible |
| `Dialog` / `Sheet` | Registrar capacitación, reconocer bienio, cambio de nivel | Dialog en escritorio, Sheet desde abajo en móvil |
| `Combobox` | Selección de funcionario, establecimiento | Búsqueda por RUT o nombre |
| `DatePicker` | Fechas | Escritura manual permitida (dd/mm/aaaa); calendario opcional |
| `Badge` | Estado, categoría, nivel | Colores semánticos solo para estado |
| `AlertaCard` | Alertas | Ícono, tipo, funcionario, fecha del hito, acciones atender/descartar |
| `EstadoVacio` | Listas sin datos | Un texto que dice qué hacer y un botón; nunca una pantalla en blanco |
| `Toast` (sonner) | Confirmaciones | "Capacitación registrada", "Bienio reconocido" |
| `Skeleton` | Carga | Solo en tablas y fichas; nunca spinners a pantalla completa |

## Estados obligatorios en cada pantalla

1. **Con datos** (el normal).
2. **Vacío**: qué significa y qué hacer ("Aún no hay capacitaciones registradas. Registrar la primera").
3. **Cargando**: skeleton con la forma del contenido.
4. **Error**: qué pasó y cómo seguir ("No se pudo generar el reporte. Reintentar"). Sin disculpas, sin vaguedad.
5. **Sin permiso**: mensaje claro, no un redireccionamiento mudo.

## Accesibilidad (nivel de calidad, no opcional)

- Foco visible en todo elemento interactivo (anillo institucional de 2 px).
- Etiquetas asociadas a cada campo; errores anunciados con `aria-describedby`.
- Contraste AA en texto y en estados.
- Navegación completa por teclado en tablas, tabs, diálogos y menús (viene con Base UI).
- `lang="es-CL"`, títulos de página únicos, encabezados jerárquicos.
- Se verifica con axe en las pruebas E2E (doc 16).

## Textos: reglas y glosario

**Reglas**: sentence case; verbos en infinitivo en botones ("Registrar capacitación", "Reconocer bienio", "Exportar a Excel"); el mismo verbo en el botón y en la confirmación ("Reconocer" → "Bienio reconocido"); fechas siempre `dd/mm/aaaa`; RUT siempre `12.345.678-9`; puntajes con un decimal cuando corresponda y "puntos" explícito en cifras destacadas; nunca jerga técnica ("registro", "entidad", "ID") en pantalla.

**Glosario** (usar estas palabras y no otras):

| Término | Significado en la interfaz |
|---|---|
| Funcionario | Persona de la dotación APS |
| Categoría | A a F según la Ley 19.378 |
| Nivel | Posición en la carrera (15 ingreso, 1 máximo) |
| Bienio | Dos años de experiencia reconocida |
| Fecha cumplido / Fecha reconocido | Cuando se completa el bienio / cuando el decreto lo reconoce |
| Capacitación | Actividad de perfeccionamiento con horas y puntaje |
| Excedente | Puntaje de capacitación sobre el tope, que pasa al período siguiente |
| Reconocimiento de estudios | Títulos, diplomados, postítulos y postgrados con puntaje o beneficio |
| Puntaje acumulado | Experiencia + capacitación + estudios |
| Puntaje faltante | Lo que falta para el siguiente nivel |
| Proyección | Fecha estimada de cambio de nivel |
| Calificación | Proceso anual de evaluación de desempeño |
| Lista | Resultado de la calificación según reglamento |
| Asignación de mérito | Beneficio asociado al resultado de la calificación |
| Decreto | Acto administrativo que reconoce un bienio, un nivel o un estudio |
| Reglamento comunal | Fuente de los parámetros de carrera |
| Alerta | Aviso automático de un hito pendiente o próximo |
| Bitácora | Registro de auditoría |

**Mensajes de error**, tres ejemplos que fijan el estilo:
- "El RUT no es válido. Revisa el dígito verificador."
- "La fecha de término no puede ser anterior a la de inicio."
- "No se pudo guardar. Reintenta; si persiste, avisa al administrador."

## Lo que se decidió no hacer

- Sin modo oscuro: no aporta a este público y duplica el trabajo de verificación de contraste.
- Sin dashboards de gráficos: la pauta no los pide; un contador bien puesto vale más que un gráfico decorativo.
- Sin animaciones de entrada, sin gradientes, sin tarjetas idénticas en cuadrícula, sin íconos decorativos en cada título.
