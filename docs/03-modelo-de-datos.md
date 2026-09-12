# 03 — Modelo de datos

Notación Prisma simplificada. Todas las entidades llevan `id`, `createdAt`, `updatedAt`. Todo lo que el
usuario edita pasa por la capa de auditoría (doc 07).

## Estructura institucional

```prisma
model Institucion {            // multi-comuna desde el inicio
  id        String @id
  nombre    String             // "Departamento de Salud, I. Municipalidad de Lota"
  rut       String
  comuna    String
  establecimientos Establecimiento[]
}

model Establecimiento {
  id            String @id
  institucionId String
  nombre        String         // CESFAM, Posta, DAS
  tipo          TipoEstablecimiento
  activo        Boolean @default(true)
}
enum TipoEstablecimiento { CESFAM CECOSF POSTA SAR SAPU DIRECCION OTRO }
```

## Funcionario y su historia

```prisma
model Funcionario {
  id               String @id
  institucionId    String
  rut              String        // único por institución
  nombres          String
  apellidos        String
  fechaNacimiento  DateTime?
  email            String?
  categoria        Categoria     // A..F
  tipoContrato     TipoContrato  // TITULAR, PLAZO_FIJO, REEMPLAZO
  fechaIngreso     DateTime      // a la institución
  establecimientoId String
  cargo            String?
  jornadaHoras     Int?          // 44, 33, 22...
  estado           EstadoFuncionario @default(ACTIVO)
  fechaEgreso      DateTime?

  experiencias     Experiencia[]
  bienios          Bienio[]
  capacitaciones   Capacitacion[]
  estudios         Estudio[]
  niveles          NivelHistorico[]
  calificaciones   CalificacionFuncionario[]
  documentos       Documento[]
  usuario          Usuario?      // para el portal
}
enum Categoria { A B C D E F }
enum TipoContrato { TITULAR PLAZO_FIJO REEMPLAZO }
enum EstadoFuncionario { ACTIVO INACTIVO }
```

### Experiencia y bienios

```prisma
model Experiencia {             // períodos que cuentan para bienios
  id             String @id
  funcionarioId  String
  institucion    String        // "DAS Lota" o "Servicio de Salud Concepción", etc.
  esPropia       Boolean       // en esta institución o reconocida de otra (BT 4.2)
  fechaDesde     DateTime
  fechaHasta     DateTime?     // null = vigente
  jornadaHoras   Int?
  documentoId    String?       // certificado que la respalda
  reconocidaEl   DateTime?     // fecha del acto que la reconoce
}

model Bienio {                  // derivado, pero se persiste para historial y reconocimiento
  id             String @id
  funcionarioId  String
  numero         Int           // 1, 2, 3...
  fechaCumplido  DateTime      // cuando se completan los 2 años
  fechaReconocido DateTime?    // cuando el municipio lo reconoce (decreto)
  decretoNumero  String?
  puntaje        Decimal       // puntos otorgados según regla vigente a fechaCumplido
  reglaId        String        // referencia a la regla aplicada
}
```

### Capacitación y estudios

```prisma
model Capacitacion {
  id              String @id
  funcionarioId   String
  nombre          String
  institucionDicta String
  tipo            TipoCapacitacion   // CURSO, DIPLOMADO, SEMINARIO, PASANTIA, OTRO
  horas           Int
  fechaInicio     DateTime
  fechaTermino    DateTime
  notaOEvaluacion Decimal?
  aprobado        Boolean
  esOtraComuna    Boolean            // BT 4.3
  documentoId     String?
  periodo         Int                // año o período al que se imputa
  puntajeCalculado Decimal           // según tabla vigente
  puntajeAplicado  Decimal           // lo que entró en el período (resto = excedente)
  reglaId         String
}

model ExcedenteCapacitacion {       // arrastre entre períodos (BT 4.3, subcriterio 5)
  id             String @id
  funcionarioId  String
  periodoOrigen  Int
  periodoDestino Int
  puntaje        Decimal
}

model Estudio {                     // reconocimiento de estudios (BT 4.4)
  id             String @id
  funcionarioId  String
  tipo           TipoEstudio        // TITULO, DIPLOMADO, POSTITULO, MAGISTER, DOCTORADO
  nombre         String
  institucion    String
  fechaObtencion DateTime
  documentoId    String?
  puntaje        Decimal?           // si el reglamento lo puntúa
  beneficio      String?            // si otorga otro beneficio
  reconocidoEl   DateTime?
}
```

### Niveles

```prisma
model NivelHistorico {              // cada cambio de nivel queda registrado
  id             String @id
  funcionarioId  String
  nivel          Int                // 15 (ingreso) ... 1 (máximo)  ← confirmar con reglamento
  fechaDesde     DateTime
  fechaHasta     DateTime?
  puntajeAlCambio Decimal
  decretoNumero  String?
  decretoFecha   DateTime?
  motivo         MotivoNivel        // INGRESO, ASCENSO, HOMOLOGACION, AJUSTE
}
```

### Calificaciones

```prisma
model ProcesoCalificacion {
  id             String @id
  institucionId  String
  periodoDesde   DateTime
  periodoHasta   DateTime
  estado         EstadoProceso      // ABIERTO, CERRADO
  comision       ComisionCalificacion[]
}

model FactorCalificacion {          // factores y subfactores (BT 4.6)
  id        String @id
  procesoId String
  nombre    String
  padreId   String?                 // subfactor → factor
  ponderacion Decimal
}

model CalificacionFuncionario {
  id             String @id
  procesoId      String
  funcionarioId  String
  puntajes       Json               // { factorId: nota }
  puntajeFinal   Decimal
  lista          String?            // según reglamento
  actaDocumentoId String?
  notasMerito    NotaMerito[]
}

model NotaMerito {
  id            String @id
  calificacionId String
  tipo          TipoNota            // MERITO, DEMERITO
  descripcion   String
  fecha         DateTime
  documentoId   String?
}

model ComisionCalificacion {
  id        String @id
  procesoId String
  nombre    String
  rol       String
}
```

### Documentos

```prisma
model Documento {
  id             String @id
  funcionarioId  String?
  tipo           TipoDocumento      // CERTIFICADO_CAPACITACION, TITULO, RESOLUCION, DECRETO, ACTA, CONTRATO, OTRO
  nombre         String
  ruta           String             // almacenamiento local en el servidor, respaldado
  mime           String
  tamano         Int
  subidoPorId    String
  hash           String
}
```

## Parametrización con vigencia (BT 5)

Este es el núcleo que permite reportes históricos correctos y actualizaciones normativas sin tocar código.

```prisma
model ReglaCarrera {
  id            String @id
  institucionId String
  tipo          TipoRegla          // PUNTOS_BIENIO, TABLA_CAPACITACION, TOPE_CAPACITACION_ANUAL,
                                   // ARRASTRE_EXCEDENTE, PUNTAJE_ESTUDIOS, UMBRAL_NIVEL, CALIFICACION
  categoria     Categoria?         // null = todas
  vigenteDesde  DateTime
  vigenteHasta  DateTime?
  parametros    Json               // estructura según tipo, ver doc 04
  fuente        String             // "Reglamento comunal Decreto N°..., art. ..."
  creadoPorId   String
}
```

`reglas.ts` expone `reglasVigentes(institucionId, fecha)`: devuelve el conjunto aplicable a esa fecha.
El motor nunca consulta reglas por su cuenta; las recibe.

## Alertas

```prisma
model Alerta {
  id             String @id
  funcionarioId  String
  tipo           TipoAlerta         // BIENIO_PROXIMO, BIENIO_PENDIENTE_RECONOCER, NIVEL_ALCANZADO,
                                    // NIVEL_PROXIMO, CAPACITACION_POR_VENCER_PERIODO, CALIFICACION_PENDIENTE, DOCUMENTO_FALTANTE
  fechaHito      DateTime
  mensaje        String
  estado         EstadoAlerta       // ACTIVA, ATENDIDA, DESCARTADA
  generadaEl     DateTime
  atendidaPorId  String?
}
```

Se regeneran cada noche por el worker y en cada edición relevante del funcionario.

## Usuarios, auditoría y respaldos

> Con Better Auth (doc 10), la tabla `user` la genera la librería; `Usuario` de abajo se implementa como campos adicionales de ese `user` (`rol`, `institucionId`, `funcionarioId`, `debeCambiarPassword`). `Acceso`, `Auditoria` y `Respaldo` siguen siendo tablas propias.

```prisma
model Usuario {
  id             String @id
  institucionId  String
  email          String @unique
  nombre         String
  rol            Rol                // ADMIN, SUPERVISION, FUNCIONARIO
  funcionarioId  String? @unique    // solo rol FUNCIONARIO
  passwordHash   String
  debeCambiarPassword Boolean @default(true)
  activo         Boolean @default(true)
  accesos        Acceso[]
}
enum Rol { ADMIN SUPERVISION FUNCIONARIO }

model Acceso {                       // registro de accesos (BT 3.2)
  id        String @id
  usuarioId String?
  email     String
  exito     Boolean
  ip        String
  userAgent String
  fecha     DateTime
}

model Auditoria {                    // BT 4.9, subcriterio 14
  id         String @id
  usuarioId  String
  fecha      DateTime
  entidad    String                  // "Funcionario", "Capacitacion"...
  entidadId  String
  accion     AccionAuditoria         // CREAR, EDITAR, ELIMINAR, RECONOCER, IMPORTAR
  antes      Json?                   // valor anterior de los campos cambiados
  despues    Json?                   // valor nuevo
  detalle    String?
}

model Respaldo {                     // subcriterio 15
  id        String @id
  fecha     DateTime
  tipo      String                   // "bd", "archivos"
  destino   String
  tamano    BigInt
  hash      String
  resultado String                   // OK / ERROR
  duracionSeg Int
}
```

## Reglas de integridad que importan

- Un funcionario tiene exactamente un `NivelHistorico` con `fechaHasta = null` (el vigente).
- Un `Bienio` se genera solo desde el motor, nunca a mano; lo que se edita a mano es `fechaReconocido` y `decretoNumero`.
- `puntajeAplicado ≤ puntajeCalculado` en `Capacitacion`; la diferencia se materializa en `ExcedenteCapacitacion`.
- `ReglaCarrera` no se edita: se cierra (`vigenteHasta`) y se crea una nueva. Así el histórico nunca cambia.
- Toda operación de escritura crea un `Auditoria` en la misma transacción.
