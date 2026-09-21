# 14 — Parámetros de demostración y ejemplos resueltos

Los valores de este documento son **de demostración**: internamente consistentes y plausibles, elegidos
para que la demo muestre cada subcriterio, pero **no son los de Lota**. Cuando llegue el reglamento
comunal (respuesta del foro, 16/09), se reemplazan en Parámetros sin tocar código, y estos ejemplos se
recalculan. En la interfaz y en el Anexo N°3 se declara: "Parametrización de demostración; en producción
se carga el reglamento comunal vigente".

## Supuesto estructural

Numeración de niveles: **15 es el nivel de ingreso y 1 el máximo** (a confirmar con el reglamento). El
motor lo trata como parámetro (`direccion = "descendente"`).

## Reglas de demostración, con vigencias

### Versión 1 — vigente del 01/01/2020 al 31/12/2024

| Tipo | Parámetros |
|---|---|
| `PUNTOS_BIENIO` | 10 puntos por bienio, todas las categorías |
| `DIAS_BIENIO` | Dos años calendario exactos (mismo día y mes, dos años después) |
| `TABLA_CAPACITACION` | Por horas de la actividad aprobada: 8–19 h: 1 · 20–39 h: 2 · 40–79 h: 3 · 80–159 h: 4 · 160–199 h: 6 · 200 h o más (diplomado): 8. Requiere aprobación. Sin nota: mismo puntaje |
| `TOPE_CAPACITACION_ANUAL` | **8 puntos** por año calendario |
| `ARRASTRE_EXCEDENTE` | Íntegro al año siguiente; un excedente puede arrastrarse hasta 2 años; luego caduca |
| `PUNTAJE_ESTUDIOS` | Solo categorías A y B: postítulo 5 · magíster 10 · doctorado 15. Categorías C a F: sin puntaje, beneficio informativo |
| `UMBRAL_NIVEL` | Todas las categorías: nivel 15 = 0 puntos; cada nivel superior exige 20 puntos más. Nivel n requiere (15 − n) × 20 |
| `PERIODO` | Año calendario (01/01 a 31/12) |
| `CALIFICACION` | Escala 1 a 7 por subfactor, ponderación por factor; puntaje final 1 a 7; Lista 1 (≥ 6,0), Lista 2 (≥ 5,0), Lista 3 (≥ 4,0), Lista 4 (< 4,0); asignación de mérito: Lista 1 |

### Versión 2 — vigente desde el 01/01/2025

Igual a la versión 1, salvo `TOPE_CAPACITACION_ANUAL` = **10 puntos**.

Este cambio de tope es deliberado: hace que "situación al 31/12/2024" calcule distinto que hoy y demuestra el subcriterio 10 y el BT 5.

### Umbrales resultantes

| Nivel | Puntos | Nivel | Puntos | Nivel | Puntos |
|---|---|---|---|---|---|
| 15 | 0 | 10 | 100 | 5 | 200 |
| 14 | 20 | 9 | 120 | 4 | 220 |
| 13 | 40 | 8 | 140 | 3 | 240 |
| 12 | 60 | 7 | 160 | 2 | 260 |
| 11 | 80 | 6 | 180 | 1 | 280 |

### Alertas

`DIAS_AVISO_BIENIO` = 60 · `DIAS_BIENIO_SIN_RECONOCER` = 30 · `PUNTOS_AVISO_NIVEL` = 15.

## Ejemplo 1 — María Pérez, categoría B, titular (el caso completo)

Ingreso 01/03/2014. Postítulo reconocido 2019. Fecha de cálculo: 25/09/2026.

**Bienios**: 01/03/2016, 01/03/2018, 01/03/2020, 01/03/2022, 01/03/2024, 01/03/2026 → **6 bienios = 60 puntos**. Próximo: 01/03/2028. Los cinco primeros reconocidos por decreto; el sexto (01/03/2026) reconocido por Decreto 145 del 20/03/2026.

**Capacitación** (aplicada 2015–2022, dato importado: 36 puntos). Desde 2023, detalle:

| Año | Actividades | Calculado | Arrastre recibido | Tope | Aplicado | Excedente generado |
|---|---|---|---|---|---|---|
| 2023 | 40 h (3) + 24 h (2) + 80 h (4) | 9 | 0 | 8 (v1) | 8 | 1 → 2024 |
| 2024 | 40 h (3) + 20 h (2) | 5 | 1 | 8 (v1) | 6 | 0 |
| 2025 | Diplomado 200 h (8) + 40 h (3) | 11 | 0 | 10 (v2) | 10 | 1 → 2026 |
| 2026 | 40 h (3) | 3 | 1 | 10 (v2) | 4 | 0 |

Total capacitación = 36 + 8 + 6 + 10 + 4 = **64 puntos**.

**Estudios**: postítulo = **5 puntos**.

**Puntaje acumulado** = 60 + 64 + 5 = **129**.

**Nivel calculado**: el mayor umbral ≤ 129 es 120 → **nivel 9**. Nivel vigente en `NivelHistorico`: 9 desde 01/03/2026 (Decreto 146). Cumple ascenso: no.

**Proyección**: siguiente nivel 8 requiere 140 → faltan **11 puntos**. Supuestos: 10 puntos por bienio; capacitación promedio de los últimos tres años aplicados (6 + 10 + 4) / 3 = 6,67 por año. Acumulado estimado: fin de 2027 ≈ 129 + 6,67 = 135,7 (< 140); 01/03/2028 bienio +10 = 145,7 ≥ 140 → **cambio de nivel estimado: marzo de 2028**. Alerta `NIVEL_PROXIMO` activa (faltan ≤ 15).

**Situación al 31/12/2024** (subcriterio 10): bienios 5 (50) · capacitación 36 + 8 + 6 = 50 · estudios 5 → **105 puntos → nivel 10**. La ficha histórica debe mostrar nivel 10, no 9, y el cambio a 9 aparece en el reporte "cambios de nivel" con fecha 01/03/2026.

Cuándo cruzó 120: fin de 2025 = 50 + 60 + 5 = 115; 01/03/2026 bienio +10 = 125 → alcanzó nivel 9 el 01/03/2026. Consistente con el decreto.

## Ejemplo 2 — Juan Soto, categoría E, plazo fijo (el caso simple)

Ingreso 15/11/2025. Una capacitación de 16 h aprobada en 2026.

- Bienios: 0. Próximo: 15/11/2027 (sin alerta: faltan más de 60 días).
- Capacitación: 16 h → 1 punto. Total 1.
- Estudios: categoría E, sin puntaje.
- Puntaje acumulado **1** → nivel 15. Faltan 19 para nivel 14. Proyección: 15/11/2027 (bienio) → 11 puntos; con 1 punto/año de capacitación cruza 20 en 2035. Se muestra con el supuesto explícito "capacitación estimada 1 punto por año".

## Ejemplo 3 — Carmen Riquelme, categoría A, titular (experiencia externa y bienio sin reconocer)

Ingreso a la comuna 01/06/2008. Experiencia reconocida del Servicio de Salud Concepción: 01/06/2005 a 31/05/2008, reconocida el 01/08/2008. Magíster reconocido 2015.

- Experiencia continua desde 01/06/2005. Bienios: 01/06/2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021, 2023, 2025 → **10 bienios = 100 puntos**. Próximo: 01/06/2027.
- El bienio del 01/06/2025 **no tiene decreto**: alerta `BIENIO_PENDIENTE_RECONOCER` activa (cumplido hace más de 30 días). Sus puntos cuentan igual en el cálculo (el hecho es objetivo; el decreto lo formaliza).
- Capacitación aplicada 2009–2026 (dato importado): **118 puntos**.
- Estudios: magíster = **10**.
- Puntaje acumulado = 100 + 118 + 10 = **228** → umbral 220 → **nivel 4**. Faltan **12** para nivel 3 (240). Alerta `NIVEL_PROXIMO` activa.

## Ejemplo 4 — Excedente que caduca (borde del arrastre)

Pedro Lagos, categoría C. 2021: 14 puntos calculados, tope 8 → aplicado 8, excedente 6 → 2022. 2022: 0 actividades → aplicado 6 (todo arrastre), excedente 0. Variante: si en 2022 hubiera tenido 8 propios, el arrastre de 6 no cabe (8 + 6 = 14 > 8), aplicado 8, excedente 6 → 2023 (segundo año de arrastre); si en 2023 tampoco cabe, caduca al cierre de 2023 y se registra como "excedente caducado" en el historial.

## Cómo se usan estos ejemplos

1. **Tests del motor** (`tests/motor/ejemplos.test.ts`): cada ejemplo es un caso con entrada y salida esperada, cifra por cifra.
2. **Seed**: los cuatro funcionarios existen en la demo con exactamente estos datos, marcados en el cargo con "Caso 1" a "Caso 4".
3. **Guía para la comisión**: los ejemplos 1 y 3 son el guion sugerido de verificación ("abra a María Pérez y compruebe…").
4. **Anexo N°3**: se cita el ejemplo 1 al describir los subcriterios 4 a 7.

## Notas de implementación (21/09)

- En el código (`src/lib/reglas/demo.ts`) la versión 1 rige desde el 01/01/2015 y no desde el 01/01/2020: el
  motor exige una regla vigente para cada hecho y los ejemplos tienen antecedentes desde 2015. El cambio de tope
  8 → 10 el 01/01/2025 se mantiene y es lo que demuestra el subcriterio 10.
- La demo tiene puesta en marcha ficticia el 01/01/2025 (doc 04 §0): el saldo de apertura de cada caso es su
  situación al 31/12/2024. Para María Pérez: 5 bienios (50), capacitación 50, estudios 5, total 105, nivel 10;
  después de la apertura entran el sexto bienio y las capacitaciones de 2025 y 2026, y el total llega a 129.
- Ejemplo 2: con el algoritmo del doc 04 §5 (bienios cada dos años más la capacitación promedio) Juan Soto
  cruza los 20 puntos el 15/11/2029 con su segundo bienio, no en 2035. El motor sigue el doc 04 y sus tests
  esperan 15/11/2029.
