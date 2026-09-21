-- CreateTable
CREATE TABLE "AccesoUsuario" (
    "id" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccesoUsuario_usuarioId_idx" ON "AccesoUsuario"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "AccesoUsuario_usuarioId_modulo_key" ON "AccesoUsuario"("usuarioId", "modulo");

-- AddForeignKey
ALTER TABLE "AccesoUsuario" ADD CONSTRAINT "AccesoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
