# 04 — Motor de carrera

Funciones puras en `src/lib/motor`. Entrada: un funcionario con su historial (experiencias,
capacitaciones, estudios, niveles, calificaciones) y las reglas vigentes a una fecha. Salida: el estado de
carrera a esa fecha. Sin base de datos, sin efectos secundarios. Todo lo que aquí dice "según regla" es un
parámetro de `ReglaCarrera` (doc 03); los valores concretos se cargan del reglamento comunal.

## Marco legal que fija la estructura

- **Categorías A a F** (Ley 19.378, art. 5): A médicos, odontólogos, químico-farmacéuticos y bioquímicos; B otros profesionales; C técnicos de nivel superior; D técnicos de salud; E administrativos; F auxiliares.
- **Quince niveles por categoría** (art. 37). El nivel de ingreso es el 15 y el máximo es el 1. **Confirmar la dirección de la numeración con el reglamento comunal antes de fijarla en la interfaz**; el motor la trata como parámetro (`nivelIngreso`, `nivelMaximo`, `direccion`).
- **La carrera se estructura sobre experiencia y capacitación** (art. 38): el puntaje acumulado de ambas determina el nivel según umbrales que fija el reglamento comunal.
- **Calificación anual** con listas y efecto en la asignación de mérito. Factores, subfactores y escalas: reglamento comunal.

## 0. Saldo de apertura (doc 18, respuesta 4)

Con la carga inicial cada funcionario trae una `Apertura` (doc 03): fecha de los saldos (la víspera de la puesta en marcha), nivel vigente y
puntaje vigente, desglosado en experiencia y capacitación si el Departamento lo entrega o total si no. El motor
la trata como base:
- `puntajeTotal = apertura.puntajeTotal + lo acumulado desde apertura.fecha`. Con desglose, cada componente suma
  sobre su parte; sin desglose, el saldo se muestra como "saldo de apertura (sin desglose)".
- Bienios: el ancla es `fechaUltimoBienio` y `bieniosReconocidos` numera los siguientes; el próximo bienio se
  proyecta desde ahí. Sin esa fecha se usa la fecha de ingreso. Los bienios registrados con fecha anterior a la
  apertura se consideran incluidos en el saldo y no se suman de nuevo.
- Capacitación: los períodos se calculan desde el de la apertura; `excedentePendiente` entra como arrastre en
  el primer cierre de período. Las actividades anteriores a la apertura no se puntúan de nuevo.
- Nivel: el `NivelHistorico` vigente nace de la apertura (motivo `APERTURA`, `fechaDesde` de la planilla).
- Situación a una fecha anterior a `apertura.fecha`: sin información.

En la demo la puesta en marcha ficticia es el 01/01/2025 y las cifras del doc 14 se mantienen: el saldo de
apertura de cada caso es su situación al 31/12/2024 (ejemplo 1: 105 puntos, nivel 10).

## 1. Bienios (subcriterio 4)

**Regla:** cada dos años de experiencia reconocida completan un bienio. La experiencia incluye la propia y la reconocida de otros servicios o centros de salud (BT 4.2).

```
calcularBienios(experiencias, fechaCorte, reglas) → Bienio[]
```

Algoritmo:
1. Unir los períodos de `Experiencia` (propia + reconocida), ordenados, sin traslapes (si dos períodos se traslapan, se cuenta una sola vez).
2. Acumular días de servicio hasta `fechaCorte`. Si el reglamento prorratea por jornada parcial, aplicar el factor `jornadaHoras / jornadaCompleta` (parámetro `PRORRATEO_JORNADA`, por defecto no).
3. Cada 730 días acumulados (parámetro `DIAS_BIENIO`, 730 por defecto; algunas comunas usan años calendario exactos: confirmar) genera un bienio con `fechaCumplido` = fecha en que se completó.
4. Puntaje de cada bienio = regla `PUNTOS_BIENIO` vigente a `fechaCumplido`, por categoría si el reglamento diferencia.
5. `fechaReconocido` y `decretoNumero` no los calcula el motor: los registra el administrador cuando el municipio dicta el acto.

Salida por funcionario: lista de bienios (cumplidos y reconocidos), **fecha del próximo bienio** (para la alerta) y puntaje total por experiencia.

Casos de prueba mínimos:
- Ingreso hace 2 años exactos hoy → 1 bienio cumplido hoy.
- Ingreso hace 3 años y 11 meses → 1 bienio, próximo en 1 mes.
- Dos períodos con brecha de 6 meses (renuncia y reingreso) → la brecha no cuenta.
- Experiencia reconocida de otro Servicio de Salud anterior al ingreso → se suma desde su `reconocidaEl`, no antes (el reconocimiento tiene fecha).

## 2. Capacitación (subcriterio 5)

**Regla:** cada actividad aprobada otorga puntos según la tabla `TABLA_CAPACITACION` vigente a su fecha de término. Existe un **tope por período** (`TOPE_CAPACITACION_ANUAL`). Lo que excede el tope se **arrastra** al período siguiente según `ARRASTRE_EXCEDENTE` (BT 4.3 lo exige expresamente).

Estructura sugerida de `TABLA_CAPACITACION.parametros`:
```json
{
  "tramosHoras": [
    { "desde": 8,  "hasta": 19,  "puntos": 1 },
    { "desde": 20, "hasta": 39,  "puntos": 2 },
    { "desde": 40, "hasta": 79,  "puntos": 3 },
    { "desde": 80, "hasta": null,"puntos": 4 }
  ],
  "factorPorEvaluacion": { "conNota": 1.0, "sinNota": 0.5 },
  "requiereAprobacion": true
}
```
Los números son ilustrativos. El reglamento comunal de Lota define los reales.

```
calcularCapacitacion(capacitaciones, excedentesPrevios, periodo, reglas) →
  { puntajeCalculado, puntajeAplicado, excedenteGenerado, detallePorActividad }
```

Algoritmo por período:
1. Sumar `puntajeCalculado` de cada actividad aprobada con término en el período, más el excedente arrastrado de períodos anteriores (si la regla lo permite y dentro de su vigencia máxima).
2. `puntajeAplicado = min(suma, tope)`.
3. `excedenteGenerado = suma − puntajeAplicado`, imputado al período siguiente (o repartido según regla).
4. Capacitaciones "en otras comunas" (BT 4.3) se tratan igual, con la marca `esOtraComuna` para reportes.

Casos de prueba:
- Tres cursos que suman 12 puntos con tope 10 → aplicado 10, excedente 2 al período siguiente.
- Período siguiente con 9 puntos propios + 2 de excedente = 11 → aplicado 10, excedente 1.
- Curso no aprobado → 0 puntos, aparece en el historial.
- Regla cambia de tope entre 2024 y 2025 → cada período usa su tope.

## 3. Reconocimiento de estudios (BT 4.4)

Títulos, diplomados, postítulos y postgrados. Según reglamento pueden dar puntos (`PUNTAJE_ESTUDIOS`), un beneficio no puntuable, o ambos. El motor suma los puntos si existen; el beneficio es un atributo informativo. Aplica típicamente a categorías A y B; el parámetro `categoria` de la regla lo acota.

## 4. Puntaje total y nivel (subcriterio 6)

```
calcularNivel(funcionario, fechaCorte, reglas) →
  { puntajeExperiencia, puntajeCapacitacion, puntajeEstudios, puntajeTotal, nivelActual, nivelCalculado, cumpleAscenso }
```

- `puntajeTotal = experiencia + capacitación (acumulada, aplicada) + estudios`.
- `UMBRAL_NIVEL` por categoría: tabla `{ nivel: puntajeMinimo }`. El **nivel calculado** es el más alto cuyo umbral se alcanza.
- `nivelActual` es el vigente en `NivelHistorico` (el reconocido por decreto). Si `nivelCalculado` supera a `nivelActual`, `cumpleAscenso = true`: genera alerta `NIVEL_ALCANZADO` y aparece en el reporte "cambios de nivel".
- El cambio efectivo lo registra el administrador (decreto, fecha). El motor propone; el acto administrativo dispone.

## 5. Proyección de cambio de nivel (subcriterio 7)

```
proyectarAscenso(funcionario, fechaCorte, reglas) →
  { nivelSiguiente, puntajeFaltante, fechaEstimada, supuestos }
```

- `puntajeFaltante = umbral(nivelSiguiente) − puntajeTotal`.
- `fechaEstimada`: suponiendo que sigue acumulando bienios al ritmo actual (un bienio cada 730 días con sus puntos) y capacitación al promedio de sus últimos N períodos (parámetro, por defecto 3), la fecha en que el acumulado cruza el umbral. Si la capacitación promedio es 0, proyectar solo con bienios y decirlo en `supuestos`.
- Mostrar siempre los supuestos en pantalla: "Proyección con X puntos por bienio y Y puntos de capacitación por año".

## 6. Alertas (subcriterios 8 y 13)

Generadas por el worker cada noche y al editar un funcionario. Tipos y regla:

| Tipo | Se genera cuando |
|---|---|
| `BIENIO_PROXIMO` | Próximo bienio dentro de `DIAS_AVISO_BIENIO` (parámetro, 60 por defecto) |
| `BIENIO_PENDIENTE_RECONOCER` | Bienio cumplido sin `fechaReconocido` hace más de N días |
| `NIVEL_ALCANZADO` | `cumpleAscenso = true` y nivel vigente no actualizado |
| `NIVEL_PROXIMO` | `puntajeFaltante ≤` umbral de aviso (parámetro) |
| `CAPACITACION_POR_VENCER_PERIODO` | Faltan menos de N días para el cierre del período y el funcionario está bajo el tope (informativa) |
| `CALIFICACION_PENDIENTE` | Proceso abierto sin calificación registrada |
| `DOCUMENTO_FALTANTE` | Bienio, capacitación o estudio sin documento de respaldo |

Cada alerta es idempotente (misma clave funcionario+tipo+hito no se duplica) y pasa a ATENDIDA cuando el hecho se registra (por ejemplo, al reconocer el bienio).

## 7. Cálculo a fecha (subcriterio 10, reportes históricos)

```
snapshot(funcionario, fecha, reglasVigentesA(fecha)) → EstadoCarrera
```

Es la misma función de cálculo con `fechaCorte = fecha` y las reglas vigentes **en esa fecha**, ignorando experiencias, capacitaciones, estudios y niveles posteriores. Así "situación al 31/12/2024" reproduce lo que el sistema habría mostrado ese día. No se almacenan snapshots: se recalculan, y por eso el motor debe ser determinista y rápido.

## 8. Calificaciones (BT 4.6)

El motor no evalúa: registra. Por proceso, cada funcionario tiene notas por factor y subfactor (ponderadas según `FactorCalificacion.ponderacion`), un puntaje final y una lista. La regla `CALIFICACION` define escala, ponderaciones por defecto y cómo la lista incide en la asignación de mérito (por ejemplo, un porcentaje superior por categoría). El reporte "nómina con asignación de mérito" (BT 4.7) sale de aquí.

## 9. Pruebas

`tests/motor/` con casos de valores conocidos, uno por regla y por borde:
- Bienios con brechas, traslapes y reconocimiento de otros servicios.
- Capacitación con tope, excedente en cadena de tres períodos, cambio de tabla entre períodos.
- Nivel: exactamente en el umbral, un punto bajo, cambio de categoría.
- Proyección con y sin capacitación.
- Snapshot a fecha anterior a un ascenso: debe mostrar el nivel viejo.

Estos tests son la prueba de que la Encargada de Carrera Funcionaria va a encontrar los números que espera.
