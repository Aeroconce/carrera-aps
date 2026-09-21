-- AlterEnum
ALTER TYPE "MotivoNivel" ADD VALUE 'APERTURA';

-- AlterEnum
ALTER TYPE "AccionAuditoria" ADD VALUE 'APERTURA';

-- CreateTable
CREATE TABLE "Apertura" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "nivel" INTEGER NOT NULL,
    "nivelDesde" DATE NOT NULL,
    "puntajeTotal" DECIMAL(8,2) NOT NULL,
    "puntajeExperiencia" DECIMAL(8,2),
    "puntajeCapacitacion" DECIMAL(8,2),
    "desglosado" BOOLEAN NOT NULL DEFAULT false,
    "fechaUltimoBienio" DATE,
    "bieniosReconocidos" INTEGER,
    "excedentePendiente" DECIMAL(8,2),
    "fuente" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apertura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Apertura_funcionarioId_key" ON "Apertura"("funcionarioId");

-- AddForeignKey
ALTER TABLE "Apertura" ADD CONSTRAINT "Apertura_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apertura" ADD CONSTRAINT "Apertura_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

