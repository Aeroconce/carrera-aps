# 06 — Reportes y exportación

## Los nueve reportes exigidos (BT 4.7)

| # | Reporte | Contenido mínimo |
|---|---|---|
| 1 | Nómina de funcionarios | RUT, nombre, categoría, nivel, establecimiento, tipo de contrato, fecha de ingreso, estado |
| 2 | Resumen de carrera funcionaria | Por funcionario: nivel, puntaje total desglosado (experiencia, capacitación, estudios), bienios, nivel calculado, cumple ascenso |
| 3 | Experiencia y bienios reconocidos | Períodos de experiencia, bienios con fecha cumplida y reconocida, decreto, puntaje |
| 4 | Historial de capacitaciones | Actividades con horas, fechas, aprobación, puntaje calculado, aplicado, excedente, período |
| 5 | Cambios de nivel | Historial de niveles con fechas y decretos; y los pendientes (cumple requisitos, sin decreto) |
| 6 | Resultados de calificaciones | Por proceso: puntaje final, lista, notas de mérito/demérito |
| 7 | Proyección de cambios de nivel | Nivel siguiente, puntaje faltante, fecha estimada, supuestos |
| 8 | Reportes históricos a fechas determinadas | Cualquiera de los anteriores con selector "situación al dd/mm/aaaa" |
| 9 | Nómina con asignación de mérito | Funcionarios con asignación de mérito según el proceso de calificación, por categoría |

## Reglas comunes (subcriterios 9, 10, 11)

- **Tres alcances obligatorios** en cada reporte: un funcionario, un establecimiento, la dotación completa. Se implementa como un mismo filtro con tres modos, no como tres reportes.
- **Selector "a fecha"** en todos: usa `snapshot(funcionario, fecha, reglasVigentesA(fecha))` del motor. El encabezado del reporte indica "Situación al dd/mm/aaaa" y las reglas aplicadas.
- **Exportación** en cada reporte: XLSX, CSV y PDF (BT 13), sin límite de filas ni marca de agua ni restricción de uso. El XLSX conserva tipos (fechas como fechas, números como números) y trae una hoja "Parámetros" con los filtros y la fecha de corte.
- Filtros adicionales: categoría, nivel, tipo de contrato, estado.
- Vista en pantalla con paginación y totales; exportación siempre completa.

## Panel de alertas dentro de Reportes (subcriterio 13)

Un acceso "Alertas" en el índice de reportes que muestra la misma vista del módulo de alertas, filtrable y exportable. La pauta puntúa "alertas automáticas" dos veces; que se vean desde ambos módulos evita que la comisión marque 50 por no encontrarlas.

## Exportación integral (subcriterio 12, BT 6)

Módulo "Exportación integral", un botón, genera un ZIP con:

1. `bd/dump.sql.gz`: `pg_dump` completo de la base de la institución.
2. `bd/diccionario-de-datos.xlsx`: tablas, columnas, tipo, descripción, relaciones (generado desde el esquema Prisma con los comentarios `///`).
3. `funcionarios/<rut>.xlsx`: un libro por funcionario con hojas Datos, Experiencia, Bienios, Capacitaciones, Estudios, Niveles, Calificaciones, Documentos.
4. `consolidado.xlsx`: los nueve reportes a la fecha de exportación.
5. `documentos/`: los archivos adjuntos, en carpetas por RUT.
6. `README.txt`: fecha, versión del sistema, hash de cada archivo.

Se ejecuta en segundo plano, notifica al terminar, queda registrado en auditoría. En la demo debe poder ejecutarse y descargarse: es la diferencia entre 100 ("entrega BBDD + Excel completo") y 0 ("no lo garantiza").

## Formato

- PDF con encabezado institucional (nombre del Departamento, fecha, filtros, usuario que genera), paginado, apaisado para tablas anchas.
- XLSX con encabezados en negrita, anchos ajustados, filtros automáticos activados.
- Nombres de archivo predecibles: `nomina_2026-09-25.xlsx`, `carrera_12345678-9_al_2024-12-31.pdf`.
