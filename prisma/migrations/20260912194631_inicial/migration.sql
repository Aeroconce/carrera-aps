-- CreateEnum
CREATE TYPE "TipoEstablecimiento" AS ENUM ('CESFAM', 'CECOSF', 'POSTA', 'SAR', 'SAPU', 'DIRECCION', 'OTRO');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('TITULAR', 'PLAZO_FIJO', 'REEMPLAZO');

-- CreateEnum
CREATE TYPE "EstadoFuncionario" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoCapacitacion" AS ENUM ('CURSO', 'DIPLOMADO', 'SEMINARIO', 'PASANTIA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoEstudio" AS ENUM ('TITULO', 'DIPLOMADO', 'POSTITULO', 'MAGISTER', 'DOCTORADO');

-- CreateEnum
CREATE TYPE "MotivoNivel" AS ENUM ('INGRESO', 'ASCENSO', 'HOMOLOGACION', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoProceso" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoNota" AS ENUM ('MERITO', 'DEMERITO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CERTIFICADO_CAPACITACION', 'TITULO', 'RESOLUCION', 'DECRETO', 'ACTA', 'CONTRATO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoRegla" AS ENUM ('PUNTOS_BIENIO', 'DIAS_BIENIO', 'PRORRATEO_JORNADA', 'TABLA_CAPACITACION', 'TOPE_CAPACITACION_ANUAL', 'ARRASTRE_EXCEDENTE', 'PUNTAJE_ESTUDIOS', 'UMBRAL_NIVEL', 'NIVELES', 'PERIODO', 'CALIFICACION', 'ALERTAS');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('BIENIO_PROXIMO', 'BIENIO_PENDIENTE_RECONOCER', 'NIVEL_ALCANZADO', 'NIVEL_PROXIMO', 'CAPACITACION_POR_VENCER_PERIODO', 'CALIFICACION_PENDIENTE', 'DOCUMENTO_FALTANTE');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('ACTIVA', 'ATENDIDA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'EDITAR', 'ELIMINAR', 'RECONOCER', 'CALIFICAR', 'IMPORTAR', 'EXPORTAR', 'LOGIN', 'CAMBIO_REGLA');

-- CreateTable
CREATE TABLE "Institucion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Establecimiento" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEstablecimiento" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" DATE,
    "email" TEXT,
    "categoria" "Categoria" NOT NULL,
    "tipoContrato" "TipoContrato" NOT NULL,
    "fechaIngreso" DATE NOT NULL,
    "establecimientoId" TEXT NOT NULL,
    "cargo" TEXT,
    "jornadaHoras" INTEGER,
    "estado" "EstadoFuncionario" NOT NULL DEFAULT 'ACTIVO',
    "fechaEgreso" DATE,
    "motivoEgreso" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiencia" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "institucion" TEXT NOT NULL,
    "esPropia" BOOLEAN NOT NULL,
    "fechaDesde" DATE NOT NULL,
    "fechaHasta" DATE,
    "jornadaHoras" INTEGER,
    "documentoId" TEXT,
    "reconocidaEl" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bienio" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaCumplido" DATE NOT NULL,
    "fechaReconocido" DATE,
    "decretoNumero" TEXT,
    "decretoFecha" DATE,
    "documentoId" TEXT,
    "puntaje" DECIMAL(8,2) NOT NULL,
    "reglaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bienio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capacitacion" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "institucionDicta" TEXT NOT NULL,
    "tipo" "TipoCapacitacion" NOT NULL,
    "horas" INTEGER NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaTermino" DATE NOT NULL,
    "notaOEvaluacion" DECIMAL(4,2),
    "aprobado" BOOLEAN NOT NULL,
    "esOtraComuna" BOOLEAN NOT NULL DEFAULT false,
    "documentoId" TEXT,
    "periodo" INTEGER NOT NULL,
    "puntajeCalculado" DECIMAL(8,2) NOT NULL,
    "puntajeAplicado" DECIMAL(8,2) NOT NULL,
    "reglaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcedenteCapacitacion" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "periodoOrigen" INTEGER NOT NULL,
    "periodoDestino" INTEGER NOT NULL,
    "puntaje" DECIMAL(8,2) NOT NULL,
    "caducadoEl" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExcedenteCapacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estudio" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "tipo" "TipoEstudio" NOT NULL,
    "nombre" TEXT NOT NULL,
    "institucion" TEXT NOT NULL,
    "fechaObtencion" DATE NOT NULL,
    "documentoId" TEXT,
    "puntaje" DECIMAL(8,2),
    "beneficio" TEXT,
    "reconocidoEl" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NivelHistorico" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "fechaDesde" DATE NOT NULL,
    "fechaHasta" DATE,
    "puntajeAlCambio" DECIMAL(8,2) NOT NULL,
    "decretoNumero" TEXT,
    "decretoFecha" DATE,
    "documentoId" TEXT,
    "motivo" "MotivoNivel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NivelHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoCalificacion" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodoDesde" DATE NOT NULL,
    "periodoHasta" DATE NOT NULL,
    "estado" "EstadoProceso" NOT NULL DEFAULT 'ABIERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcesoCalificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactorCalificacion" (
    "id" TEXT NOT NULL,
    "procesoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "padreId" TEXT,
    "ponderacion" DECIMAL(5,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactorCalificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalificacionFuncionario" (
    "id" TEXT NOT NULL,
    "procesoId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "puntajes" JSONB NOT NULL,
    "puntajeFinal" DECIMAL(6,2) NOT NULL,
    "lista" TEXT,
    "actaDocumentoId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalificacionFuncionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaMerito" (
    "id" TEXT NOT NULL,
    "calificacionId" TEXT NOT NULL,
    "tipo" "TipoNota" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "documentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotaMerito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComisionCalificacion" (
    "id" TEXT NOT NULL,
    "procesoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComisionCalificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "tipo" "TipoDocumento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "subidoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaCarrera" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "tipo" "TipoRegla" NOT NULL,
    "categoria" "Categoria",
    "vigenteDesde" DATE NOT NULL,
    "vigenteHasta" DATE,
    "parametros" JSONB NOT NULL,
    "fuente" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglaCarrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "fechaHito" DATE NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'ACTIVA',
    "generadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendidaPorId" TEXT,
    "atendidaEl" TIMESTAMP(3),
    "resolucionNota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "institucionId" TEXT,
    "funcionarioId" TEXT,
    "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acceso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "email" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "detalle" TEXT,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respaldo" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "tamano" BIGINT NOT NULL,
    "hash" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "duracionSeg" INTEGER NOT NULL,
    "verificadoEl" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Respaldo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_rut_key" ON "Institucion"("rut");

-- CreateIndex
CREATE INDEX "Establecimiento_institucionId_idx" ON "Establecimiento"("institucionId");

-- CreateIndex
CREATE INDEX "Funcionario_institucionId_estado_idx" ON "Funcionario"("institucionId", "estado");

-- CreateIndex
CREATE INDEX "Funcionario_establecimientoId_idx" ON "Funcionario"("establecimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_institucionId_rut_key" ON "Funcionario"("institucionId", "rut");

-- CreateIndex
CREATE INDEX "Experiencia_funcionarioId_fechaDesde_idx" ON "Experiencia"("funcionarioId", "fechaDesde");

-- CreateIndex
CREATE INDEX "Bienio_fechaReconocido_idx" ON "Bienio"("fechaReconocido");

-- CreateIndex
CREATE UNIQUE INDEX "Bienio_funcionarioId_numero_key" ON "Bienio"("funcionarioId", "numero");

-- CreateIndex
CREATE INDEX "Capacitacion_funcionarioId_periodo_idx" ON "Capacitacion"("funcionarioId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "ExcedenteCapacitacion_funcionarioId_periodoOrigen_periodoDe_key" ON "ExcedenteCapacitacion"("funcionarioId", "periodoOrigen", "periodoDestino");

-- CreateIndex
CREATE INDEX "Estudio_funcionarioId_idx" ON "Estudio"("funcionarioId");

-- CreateIndex
CREATE INDEX "NivelHistorico_funcionarioId_fechaDesde_idx" ON "NivelHistorico"("funcionarioId", "fechaDesde");

-- CreateIndex
CREATE INDEX "ProcesoCalificacion_institucionId_periodoDesde_idx" ON "ProcesoCalificacion"("institucionId", "periodoDesde");

-- CreateIndex
CREATE INDEX "FactorCalificacion_procesoId_idx" ON "FactorCalificacion"("procesoId");

-- CreateIndex
CREATE UNIQUE INDEX "CalificacionFuncionario_procesoId_funcionarioId_key" ON "CalificacionFuncionario"("procesoId", "funcionarioId");

-- CreateIndex
CREATE INDEX "NotaMerito_calificacionId_idx" ON "NotaMerito"("calificacionId");

-- CreateIndex
CREATE INDEX "ComisionCalificacion_procesoId_idx" ON "ComisionCalificacion"("procesoId");

-- CreateIndex
CREATE INDEX "Documento_funcionarioId_idx" ON "Documento"("funcionarioId");

-- CreateIndex
CREATE INDEX "Documento_institucionId_tipo_idx" ON "Documento"("institucionId", "tipo");

-- CreateIndex
CREATE INDEX "ReglaCarrera_institucionId_tipo_vigenteDesde_idx" ON "ReglaCarrera"("institucionId", "tipo", "vigenteDesde");

-- CreateIndex
CREATE INDEX "Alerta_estado_tipo_idx" ON "Alerta"("estado", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Alerta_funcionarioId_tipo_fechaHito_key" ON "Alerta"("funcionarioId", "tipo", "fechaHito");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_funcionarioId_key" ON "user"("funcionarioId");

-- CreateIndex
CREATE INDEX "user_institucionId_idx" ON "user"("institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "Acceso_email_fecha_idx" ON "Acceso"("email", "fecha");

-- CreateIndex
CREATE INDEX "Acceso_fecha_idx" ON "Acceso"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_entidadId_idx" ON "Auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_fecha_idx" ON "Auditoria"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "Auditoria"("fecha");

-- CreateIndex
CREATE INDEX "Respaldo_fecha_idx" ON "Respaldo"("fecha");

-- AddForeignKey
ALTER TABLE "Establecimiento" ADD CONSTRAINT "Establecimiento_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiencia" ADD CONSTRAINT "Experiencia_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiencia" ADD CONSTRAINT "Experiencia_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bienio" ADD CONSTRAINT "Bienio_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bienio" ADD CONSTRAINT "Bienio_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bienio" ADD CONSTRAINT "Bienio_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "ReglaCarrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capacitacion" ADD CONSTRAINT "Capacitacion_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capacitacion" ADD CONSTRAINT "Capacitacion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capacitacion" ADD CONSTRAINT "Capacitacion_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "ReglaCarrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcedenteCapacitacion" ADD CONSTRAINT "ExcedenteCapacitacion_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudio" ADD CONSTRAINT "Estudio_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudio" ADD CONSTRAINT "Estudio_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NivelHistorico" ADD CONSTRAINT "NivelHistorico_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NivelHistorico" ADD CONSTRAINT "NivelHistorico_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoCalificacion" ADD CONSTRAINT "ProcesoCalificacion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorCalificacion" ADD CONSTRAINT "FactorCalificacion_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "ProcesoCalificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactorCalificacion" ADD CONSTRAINT "FactorCalificacion_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "FactorCalificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionFuncionario" ADD CONSTRAINT "CalificacionFuncionario_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "ProcesoCalificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionFuncionario" ADD CONSTRAINT "CalificacionFuncionario_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionFuncionario" ADD CONSTRAINT "CalificacionFuncionario_actaDocumentoId_fkey" FOREIGN KEY ("actaDocumentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaMerito" ADD CONSTRAINT "NotaMerito_calificacionId_fkey" FOREIGN KEY ("calificacionId") REFERENCES "CalificacionFuncionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaMerito" ADD CONSTRAINT "NotaMerito_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComisionCalificacion" ADD CONSTRAINT "ComisionCalificacion_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "ProcesoCalificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCarrera" ADD CONSTRAINT "ReglaCarrera_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCarrera" ADD CONSTRAINT "ReglaCarrera_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_atendidaPorId_fkey" FOREIGN KEY ("atendidaPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceso" ADD CONSTRAINT "Acceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
