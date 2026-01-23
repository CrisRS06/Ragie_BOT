-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR_CONTRATISTA', 'OPERADOR_BODEGA', 'FISCALIZADOR_EXTERNO', 'AUDITOR');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'TRANSFERENCIA', 'AJUSTE_INVENTARIO', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "TipoCorte" AS ENUM ('MENSUAL_AUTOMATICO', 'BAJO_DEMANDA', 'COMPRA_SEGUN_DEMANDA');

-- CreateEnum
CREATE TYPE "TipoInforme" AS ENUM ('MENSUAL_INVENTARIO', 'QUINCENAL_MOVIMIENTOS', 'VENCIMIENTOS', 'EXISTENCIAS', 'AUDITORIA');

-- CreateEnum
CREATE TYPE "EstadoInforme" AS ENUM ('GENERANDO', 'COMPLETADO', 'FALLIDO', 'ENVIADO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('VENCIMIENTO_PROXIMO', 'VENCIMIENTO_VENCIDO', 'STOCK_MINIMO', 'INFORME_NO_GENERADO', 'CORTE_PENDIENTE', 'EXCEPCION_PEPS');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('PENDIENTE', 'NOTIFICADA', 'RESUELTA', 'IGNORADA');

-- CreateEnum
CREATE TYPE "EstadoDocumentoRecepcion" AS ENUM ('BORRADOR', 'PROCESADO', 'ANULADO_PARCIAL', 'ANULADO_TOTAL');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "ultimoAcceso" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_receptoras" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "responsable" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_receptoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "contacto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articulos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "descripcionSIGAF" TEXT NOT NULL,
    "codigoSIGAF" TEXT,
    "codigoBarras" TEXT,
    "marca" TEXT,
    "ivaPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.13,
    "observaciones" TEXT,
    "codigoPANI" TEXT,
    "codigoSICOP" TEXT,
    "codigoSICOPL" TEXT,
    "categoria" TEXT,
    "precio" DOUBLE PRECISION,
    "costoReferencia" DOUBLE PRECISION,
    "unidadMedida" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "requiereVencimiento" BOOLEAN NOT NULL DEFAULT true,
    "stockMinimo" DOUBLE PRECISION,
    "stockMaximo" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "articuloId" TEXT NOT NULL,
    "cantidadInicial" DOUBLE PRECISION NOT NULL,
    "cantidadDisponible" DOUBLE PRECISION NOT NULL,
    "fechaIngresoTs" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "numeroLote" TEXT,
    "proveedor" TEXT,
    "costoUnitario" DOUBLE PRECISION,
    "ubicacion" TEXT,
    "subtotalSinIva" DOUBLE PRECISION,
    "montoIva" DOUBLE PRECISION,
    "totalConIva" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "agotado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "articuloId" TEXT NOT NULL,
    "loteId" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "unidadReceptoraId" TEXT,
    "motivo" TEXT,
    "documentoReferencia" TEXT,
    "documentosAdjuntos" TEXT[],
    "observaciones" TEXT,
    "costoUnitarioPEPS" DOUBLE PRECISION,
    "subtotalSinIva" DOUBLE PRECISION,
    "montoIva" DOUBLE PRECISION,
    "totalConIva" DOUBLE PRECISION,
    "usuarioId" TEXT NOT NULL,
    "receptorNombre" TEXT,
    "receptorCedula" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "anuladoEn" TIMESTAMP(3),
    "anuladoPorId" TEXT,
    "hashDocumento" TEXT,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoCorte" NOT NULL,
    "periodoInicio" TIMESTAMP(3),
    "periodoFin" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solicitadoPorId" TEXT NOT NULL,
    "motivo" TEXT,
    "hashSnapshot" TEXT NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "totalArticulos" INTEGER,
    "totalLotes" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cortes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes_detalle" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "articuloId" TEXT NOT NULL,
    "articuloSku" TEXT NOT NULL,
    "articuloNombre" TEXT NOT NULL,
    "articuloDescripcionSIGAF" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "ubicacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cortes_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoInforme" NOT NULL,
    "estado" "EstadoInforme" NOT NULL DEFAULT 'GENERANDO',
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "archivoPDF" TEXT,
    "archivoCSV" TEXT,
    "archivoExcel" TEXT,
    "hashDocumento" TEXT,
    "timestampFirma" TIMESTAMP(3),
    "enviadoFiscalizador" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvio" TIMESTAMP(3),
    "acuseRecibo" TEXT,
    "totalRegistros" INTEGER,
    "generadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "informes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashActual" TEXT NOT NULL,
    "hashAnterior" TEXT,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'PENDIENTE',
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "articuloId" TEXT,
    "loteId" TEXT,
    "informeId" TEXT,
    "severidad" TEXT NOT NULL DEFAULT 'MEDIA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificadoEn" TIMESTAMP(3),
    "resueltoEn" TIMESTAMP(3),

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'STRING',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_recepcion" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "proveedorId" TEXT,
    "documentoExterno" TEXT,
    "fechaDocumento" TIMESTAMP(3),
    "subtotalSinIva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montoIva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConIva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" "EstadoDocumentoRecepcion" NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "motivoAnulacion" TEXT,
    "anuladoEn" TIMESTAMP(3),
    "anuladoPorId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "documentos_recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_recepcion" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "articuloId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "numeroLoteProveedor" TEXT,
    "ubicacion" TEXT,
    "subtotalSinIva" DOUBLE PRECISION,
    "montoIva" DOUBLE PRECISION,
    "totalConIva" DOUBLE PRECISION,
    "loteId" TEXT,
    "movimientoId" TEXT,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,

    CONSTRAINT "detalles_recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_key" ON "sesiones"("token");

-- CreateIndex
CREATE INDEX "sesiones_usuarioId_idx" ON "sesiones"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_receptoras_codigo_key" ON "unidades_receptoras"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_codigo_key" ON "proveedores"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "articulos_sku_key" ON "articulos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "articulos_codigoBarras_key" ON "articulos"("codigoBarras");

-- CreateIndex
CREATE INDEX "articulos_descripcionSIGAF_idx" ON "articulos"("descripcionSIGAF");

-- CreateIndex
CREATE INDEX "articulos_codigoBarras_idx" ON "articulos"("codigoBarras");

-- CreateIndex
CREATE INDEX "lotes_articuloId_fechaIngresoTs_idx" ON "lotes"("articuloId", "fechaIngresoTs");

-- CreateIndex
CREATE INDEX "lotes_fechaVencimiento_idx" ON "lotes"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "movimientos_articuloId_timestamp_idx" ON "movimientos"("articuloId", "timestamp");

-- CreateIndex
CREATE INDEX "movimientos_tipo_timestamp_idx" ON "movimientos"("tipo", "timestamp");

-- CreateIndex
CREATE INDEX "movimientos_timestamp_idx" ON "movimientos"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "cortes_hashSnapshot_key" ON "cortes"("hashSnapshot");

-- CreateIndex
CREATE INDEX "cortes_timestamp_idx" ON "cortes"("timestamp");

-- CreateIndex
CREATE INDEX "cortes_tipo_timestamp_idx" ON "cortes"("tipo", "timestamp");

-- CreateIndex
CREATE INDEX "cortes_detalle_corteId_idx" ON "cortes_detalle"("corteId");

-- CreateIndex
CREATE INDEX "informes_tipo_periodoInicio_idx" ON "informes"("tipo", "periodoInicio");

-- CreateIndex
CREATE INDEX "informes_creadoEn_idx" ON "informes"("creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "bitacora_hashActual_key" ON "bitacora"("hashActual");

-- CreateIndex
CREATE INDEX "bitacora_timestamp_idx" ON "bitacora"("timestamp");

-- CreateIndex
CREATE INDEX "bitacora_usuarioId_timestamp_idx" ON "bitacora"("usuarioId", "timestamp");

-- CreateIndex
CREATE INDEX "bitacora_entidad_entidadId_idx" ON "bitacora"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "alertas_estado_creadoEn_idx" ON "alertas"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "alertas_tipo_estado_idx" ON "alertas"("tipo", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_clave_key" ON "configuracion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_recepcion_numero_key" ON "documentos_recepcion"("numero");

-- CreateIndex
CREATE INDEX "documentos_recepcion_numero_idx" ON "documentos_recepcion"("numero");

-- CreateIndex
CREATE INDEX "documentos_recepcion_estado_idx" ON "documentos_recepcion"("estado");

-- CreateIndex
CREATE INDEX "documentos_recepcion_timestamp_idx" ON "documentos_recepcion"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_recepcion_loteId_key" ON "detalles_recepcion"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_recepcion_movimientoId_key" ON "detalles_recepcion"("movimientoId");

-- CreateIndex
CREATE INDEX "detalles_recepcion_documentoId_idx" ON "detalles_recepcion"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_recepcion_documentoId_numeroLinea_key" ON "detalles_recepcion"("documentoId", "numeroLinea");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "articulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "articulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_unidadReceptoraId_fkey" FOREIGN KEY ("unidadReceptoraId") REFERENCES "unidades_receptoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes" ADD CONSTRAINT "cortes_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_detalle" ADD CONSTRAINT "cortes_detalle_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "cortes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_detalle" ADD CONSTRAINT "cortes_detalle_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_recepcion" ADD CONSTRAINT "documentos_recepcion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_recepcion" ADD CONSTRAINT "documentos_recepcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos_recepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "articulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
