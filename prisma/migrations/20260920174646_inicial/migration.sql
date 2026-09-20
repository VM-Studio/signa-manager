-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('DUENO', 'ADMINISTRACION', 'ARQUITECTA', 'JEFE_OBRA', 'CAPATAZ', 'PANOLERO', 'LOGISTICA', 'CHOFER', 'RRHH');

-- CreateEnum
CREATE TYPE "TipoObra" AS ENUM ('PROPIA', 'TERCEROS');

-- CreateEnum
CREATE TYPE "EstadoObra" AS ENUM ('PLANIFICADA', 'EN_CURSO', 'PAUSADA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "OrigenDato" AS ENUM ('MANUAL', 'SISTEMA_BASE');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "TipoMovimientoExterno" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "CategoriaCostoExterno" AS ENUM ('MATERIALES', 'SUBCONTRATOS', 'EQUIPOS_Y_ALQUILERES', 'HONORARIOS', 'IMPUESTOS_Y_TASAS', 'ESTRUCTURA', 'COBRO_CLIENTE', 'VENTA_UNIDAD', 'ALQUILER_TEMPORARIO', 'OTROS');

-- CreateEnum
CREATE TYPE "EstadoPedidoCompra" AS ENUM ('BORRADOR', 'PENDIENTE_APROBACION', 'APROBADO', 'COMPRADO', 'ENTREGADO_PARCIAL', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoSync" AS ENUM ('EN_CURSO', 'OK', 'ERROR');

-- CreateEnum
CREATE TYPE "TipoControlHerramienta" AS ENUM ('UNITARIO', 'CANTIDAD');

-- CreateEnum
CREATE TYPE "EstadoHerramienta" AS ENUM ('DISPONIBLE', 'EN_OBRA', 'EN_REPARACION', 'EXTRAVIADA', 'BAJA');

-- CreateEnum
CREATE TYPE "Condicion" AS ENUM ('BUENA', 'REGULAR', 'MALA');

-- CreateEnum
CREATE TYPE "TipoMovimientoHerramienta" AS ENUM ('ALTA', 'SALIDA_A_OBRA', 'DEVOLUCION', 'TRANSFERENCIA', 'ENVIO_A_REPARACION', 'RETORNO_DE_REPARACION', 'EXTRAVIO', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoMantenimiento" AS ENUM ('PREVENTIVO', 'CORRECTIVO');

-- CreateEnum
CREATE TYPE "EstadoSolicitudHerramienta" AS ENUM ('PENDIENTE', 'RESUELTA_CON_STOCK', 'DERIVADA_A_COMPRA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaLaboral" AS ENUM ('OFICIAL_ESPECIALIZADO', 'OFICIAL', 'MEDIO_OFICIAL', 'AYUDANTE', 'SERENO', 'CAPATAZ', 'CHOFER', 'ADMINISTRATIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDocumentoEmpleado" AS ENUM ('ALTA_ART', 'APTO_MEDICO', 'LIBRETA_FONDO_CESE', 'CURSO_SEGURIDAD', 'LICENCIA_CONDUCIR', 'SEGURO_VIDA', 'OTRO');

-- CreateEnum
CREATE TYPE "RubroSubcontratista" AS ENUM ('ELECTRICIDAD', 'PLOMERIA', 'GAS', 'PINTURA', 'YESERIA', 'HERRERIA', 'CARPINTERIA', 'DURLOCK', 'IMPERMEABILIZACION', 'EXCAVACION', 'HORMIGON', 'CLIMATIZACION', 'ASCENSORES', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDocumentoSubcontratista" AS ENUM ('ART_NOMINA', 'SEGURO_ACCIDENTES_PERSONALES', 'SEGURO_RESPONSABILIDAD_CIVIL', 'CONSTANCIA_ARCA', 'FORMULARIO_931', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoParte" AS ENUM ('BORRADOR', 'ENVIADO', 'APROBADO');

-- CreateEnum
CREATE TYPE "Clima" AS ENUM ('DESPEJADO', 'NUBLADO', 'LLUVIA', 'LLUVIA_CON_PARO', 'VIENTO_FUERTE');

-- CreateEnum
CREATE TYPE "Asistencia" AS ENUM ('PRESENTE', 'MEDIA_JORNADA', 'AUSENTE_CON_AVISO', 'AUSENTE_SIN_AVISO', 'LICENCIA', 'VACACIONES', 'FERIADO', 'SUSPENSION_POR_LLUVIA');

-- CreateEnum
CREATE TYPE "TipoNovedad" AS ENUM ('ADELANTO', 'VIATICO', 'PREMIO', 'DESCUENTO', 'REINTEGRO_GASTO');

-- CreateEnum
CREATE TYPE "EstadoQuincena" AS ENUM ('ABIERTA', 'CERRADA', 'ENVIADA_AL_ESTUDIO', 'PAGADA');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'ECHEQ', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoVehiculo" AS ENUM ('CAMION', 'CAMIONETA', 'UTILITARIO', 'AUTO', 'MAQUINA_VIAL', 'ACOPLADO');

-- CreateEnum
CREATE TYPE "Combustible" AS ENUM ('NAFTA', 'DIESEL', 'GNC', 'ELECTRICO');

-- CreateEnum
CREATE TYPE "EstadoVehiculo" AS ENUM ('DISPONIBLE', 'EN_VIAJE', 'EN_TALLER', 'FUERA_DE_SERVICIO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "TipoDocumentoVehiculo" AS ENUM ('SEGURO', 'VTV', 'PATENTE', 'RUTA', 'CEDULA', 'MATAFUEGO', 'HABILITACION_CARGA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoViaje" AS ENUM ('ENTREGA_MATERIALES', 'RETIRO_EN_PROVEEDOR', 'TRASLADO_HERRAMIENTAS', 'TRASLADO_PERSONAL', 'RETIRO_ESCOMBROS', 'TRAMITE', 'OTRO');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "EstadoSolicitudViaje" AS ENUM ('PENDIENTE', 'ASIGNADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoViaje" AS ENUM ('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoIncidenteVehiculo" AS ENUM ('MULTA', 'SINIESTRO', 'ROTURA', 'ROBO');

-- CreateEnum
CREATE TYPE "Severidad" AS ENUM ('INFO', 'AVISO', 'CRITICA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('ABIERTA', 'VISTA', 'RESUELTA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('APP', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PENDIENTE', 'ENVIADO', 'ERROR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "empleadoId" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadNegocio" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UnidadNegocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoObra" NOT NULL,
    "estado" "EstadoObra" NOT NULL DEFAULT 'EN_CURSO',
    "cliente" TEXT,
    "direccion" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "esInterior" BOOLEAN NOT NULL DEFAULT false,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "fechaInicio" TIMESTAMP(3),
    "fechaFinPrevista" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "presupuestoManoObra" DECIMAL(14,2),
    "presupuestoTotal" DECIMAL(14,2),
    "moneda" "Moneda" NOT NULL DEFAULT 'ARS',
    "origen" "OrigenDato" NOT NULL DEFAULT 'MANUAL',
    "idExterno" TEXT,
    "ultimaSync" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "unidadNegocioId" TEXT NOT NULL,
    "jefeObraId" TEXT,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposito" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "responsableId" TEXT,

    CONSTRAINT "Deposito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoExterno" (
    "id" TEXT NOT NULL,
    "idExterno" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "tipo" "TipoMovimientoExterno" NOT NULL,
    "categoria" "CategoriaCostoExterno" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "proveedor" TEXT,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'ARS',
    "tipoCambio" DECIMAL(10,2),
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraId" TEXT,

    CONSTRAINT "MovimientoExterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoCompraExterno" (
    "id" TEXT NOT NULL,
    "idExterno" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "numero" TEXT,
    "descripcion" TEXT NOT NULL,
    "solicitante" TEXT,
    "proveedor" TEXT,
    "estado" "EstadoPedidoCompra" NOT NULL,
    "monto" DECIMAL(14,2),
    "moneda" "Moneda" NOT NULL DEFAULT 'ARS',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL,
    "fechaNecesariaEnObra" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "importadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraId" TEXT NOT NULL,

    CONSTRAINT "PedidoCompraExterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroSync" (
    "id" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),
    "estado" "EstadoSync" NOT NULL DEFAULT 'EN_CURSO',
    "obras" INTEGER NOT NULL DEFAULT 0,
    "movimientos" INTEGER NOT NULL DEFAULT 0,
    "pedidos" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "RegistroSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaHerramienta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "CategoriaHerramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Herramienta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "nroSerie" TEXT,
    "tipoControl" "TipoControlHerramienta" NOT NULL DEFAULT 'UNITARIO',
    "estado" "EstadoHerramienta" NOT NULL DEFAULT 'DISPONIBLE',
    "condicion" "Condicion" NOT NULL DEFAULT 'BUENA',
    "fotoUrl" TEXT,
    "notas" TEXT,
    "fechaCompra" TIMESTAMP(3),
    "valorCompra" DECIMAL(14,2),
    "moneda" "Moneda" NOT NULL DEFAULT 'ARS',
    "proveedor" TEXT,
    "costoDiarioImputable" DECIMAL(12,2),
    "mantenimientoCadaDias" INTEGER,
    "proximoMantenimiento" TIMESTAMP(3),
    "depositoId" TEXT,
    "obraId" TEXT,
    "responsableActualId" TEXT,
    "fechaDevolucionPrevista" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "categoriaId" TEXT NOT NULL,

    CONSTRAINT "Herramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExistenciaHerramienta" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "herramientaId" TEXT NOT NULL,
    "depositoId" TEXT,
    "obraId" TEXT,

    CONSTRAINT "ExistenciaHerramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoHerramienta" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimientoHerramienta" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "condicion" "Condicion",
    "fechaDevolucionPrevista" TIMESTAMP(3),
    "observaciones" TEXT,
    "fotoUrl" TEXT,
    "herramientaId" TEXT NOT NULL,
    "origenDepositoId" TEXT,
    "origenObraId" TEXT,
    "destinoDepositoId" TEXT,
    "destinoObraId" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "recibidoPorId" TEXT,
    "solicitudId" TEXT,

    CONSTRAINT "MovimientoHerramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MantenimientoHerramienta" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMantenimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "proveedor" TEXT,
    "costo" DECIMAL(14,2),
    "proximaFecha" TIMESTAMP(3),
    "herramientaId" TEXT NOT NULL,

    CONSTRAINT "MantenimientoHerramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudHerramienta" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "fechaNecesaria" TIMESTAMP(3) NOT NULL,
    "prioridad" "Prioridad" NOT NULL DEFAULT 'NORMAL',
    "estado" "EstadoSolicitudHerramienta" NOT NULL DEFAULT 'PENDIENTE',
    "resolucionNota" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaEn" TIMESTAMP(3),
    "obraId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "solicitanteId" TEXT NOT NULL,
    "resueltaPorId" TEXT,

    CONSTRAINT "SolicitudHerramienta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "legajo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "cuil" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "localidad" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "fechaEgreso" TIMESTAMP(3),
    "categoria" "CategoriaLaboral" NOT NULL,
    "especialidad" TEXT,
    "valorHora" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fotoUrl" TEXT,
    "contactoEmergenciaNombre" TEXT,
    "contactoEmergenciaTelefono" TEXT,
    "talleRopa" TEXT,
    "talleCalzado" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialValorHora" (
    "id" TEXT NOT NULL,
    "valorHora" DECIMAL(12,2) NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "empleadoId" TEXT NOT NULL,

    CONSTRAINT "HistorialValorHora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoEmpleado" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDocumentoEmpleado" NOT NULL,
    "descripcion" TEXT,
    "emision" TIMESTAMP(3),
    "vencimiento" TIMESTAMP(3),
    "archivoUrl" TEXT,
    "empleadoId" TEXT NOT NULL,

    CONSTRAINT "DocumentoEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaEpp" (
    "id" TEXT NOT NULL,
    "elemento" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "fecha" TIMESTAMP(3) NOT NULL,
    "marca" TEXT,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "archivoUrl" TEXT,
    "empleadoId" TEXT NOT NULL,

    CONSTRAINT "EntregaEpp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcontratista" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "rubro" "RubroSubcontratista" NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subcontratista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoSubcontratista" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDocumentoSubcontratista" NOT NULL,
    "descripcion" TEXT,
    "vencimiento" TIMESTAMP(3),
    "archivoUrl" TEXT,
    "subcontratistaId" TEXT NOT NULL,

    CONSTRAINT "DocumentoSubcontratista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuadrilla" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "capatazId" TEXT,

    CONSTRAINT "Cuadrilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuadrillaMiembro" (
    "id" TEXT NOT NULL,
    "cuadrillaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,

    CONSTRAINT "CuadrillaMiembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionObra" (
    "id" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3),
    "tarea" TEXT,
    "obraId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "subcontratistaId" TEXT,
    "cuadrillaId" TEXT,

    CONSTRAINT "AsignacionObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParteDiario" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "clima" "Clima" NOT NULL DEFAULT 'DESPEJADO',
    "estado" "EstadoParte" NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "tareasDelDia" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEn" TIMESTAMP(3),
    "aprobadoEn" TIMESTAMP(3),
    "obraId" TEXT NOT NULL,
    "cargadoPorId" TEXT NOT NULL,
    "aprobadoPorId" TEXT,

    CONSTRAINT "ParteDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParteDiarioLinea" (
    "id" TEXT NOT NULL,
    "asistencia" "Asistencia" NOT NULL DEFAULT 'PRESENTE',
    "horasNormales" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "horasExtra50" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "horasExtra100" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tarea" TEXT,
    "valorHoraAplicado" DECIMAL(12,2),
    "costoCalculado" DECIMAL(14,2),
    "parteId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,

    CONSTRAINT "ParteDiarioLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParteSubcontratista" (
    "id" TEXT NOT NULL,
    "cantidadPersonas" INTEGER NOT NULL,
    "tarea" TEXT,
    "parteId" TEXT NOT NULL,
    "subcontratistaId" TEXT NOT NULL,

    CONSTRAINT "ParteSubcontratista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovedadPersonal" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNovedad" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "descripcion" TEXT,
    "comprobanteUrl" TEXT,
    "empleadoId" TEXT NOT NULL,
    "obraId" TEXT,
    "quincenaId" TEXT,

    CONSTRAINT "NovedadPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quincena" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "estado" "EstadoQuincena" NOT NULL DEFAULT 'ABIERTA',
    "cerradaEn" TIMESTAMP(3),
    "cerradaPorId" TEXT,

    CONSTRAINT "Quincena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuincenaLinea" (
    "id" TEXT NOT NULL,
    "diasTrabajados" INTEGER NOT NULL,
    "horasNormales" DECIMAL(7,2) NOT NULL,
    "horasExtra50" DECIMAL(7,2) NOT NULL,
    "horasExtra100" DECIMAL(7,2) NOT NULL,
    "ausencias" INTEGER NOT NULL DEFAULT 0,
    "costo" DECIMAL(14,2) NOT NULL,
    "quincenaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,

    CONSTRAINT "QuincenaLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoPersonal" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "medio" "MedioPago" NOT NULL,
    "concepto" TEXT,
    "comprobanteUrl" TEXT,
    "empleadoId" TEXT,
    "subcontratistaId" TEXT,
    "quincenaId" TEXT,

    CONSTRAINT "PagoPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "interno" TEXT,
    "tipo" "TipoVehiculo" NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "anio" INTEGER,
    "combustible" "Combustible" NOT NULL DEFAULT 'DIESEL',
    "capacidadCargaKg" INTEGER,
    "volumenM3" DECIMAL(6,2),
    "cantidadPasajeros" INTEGER,
    "kmActual" INTEGER NOT NULL DEFAULT 0,
    "horasActual" INTEGER,
    "estado" "EstadoVehiculo" NOT NULL DEFAULT 'DISPONIBLE',
    "tieneGps" BOOLEAN NOT NULL DEFAULT false,
    "costoKmEstimado" DECIMAL(10,2),
    "fotoUrl" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "choferHabitualId" TEXT,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoVehiculo" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDocumentoVehiculo" NOT NULL,
    "descripcion" TEXT,
    "vencimiento" TIMESTAMP(3),
    "costo" DECIMAL(14,2),
    "archivoUrl" TEXT,
    "vehiculoId" TEXT NOT NULL,

    CONSTRAINT "DocumentoVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudViaje" (
    "id" TEXT NOT NULL,
    "tipo" "TipoViaje" NOT NULL,
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "descripcionCarga" TEXT,
    "pesoEstimadoKg" INTEGER,
    "cantidadPersonas" INTEGER,
    "fechaHoraNecesaria" TIMESTAMP(3) NOT NULL,
    "prioridad" "Prioridad" NOT NULL DEFAULT 'NORMAL',
    "estado" "EstadoSolicitudViaje" NOT NULL DEFAULT 'PENDIENTE',
    "motivoRechazo" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,

    CONSTRAINT "SolicitudViaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viaje" (
    "id" TEXT NOT NULL,
    "tipo" "TipoViaje" NOT NULL,
    "estado" "EstadoViaje" NOT NULL DEFAULT 'PROGRAMADO',
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "descripcionCarga" TEXT,
    "pesoCargaKg" INTEGER,
    "salidaPrevista" TIMESTAMP(3) NOT NULL,
    "salidaReal" TIMESTAMP(3),
    "llegadaReal" TIMESTAMP(3),
    "kmSalida" INTEGER,
    "kmLlegada" INTEGER,
    "peajes" DECIMAL(12,2),
    "costoCalculado" DECIMAL(14,2),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehiculoId" TEXT NOT NULL,
    "choferId" TEXT NOT NULL,
    "obraId" TEXT,
    "solicitudId" TEXT,

    CONSTRAINT "Viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargaCombustible" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "litros" DECIMAL(8,2) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "km" INTEGER,
    "estacion" TEXT,
    "comprobanteUrl" TEXT,
    "vehiculoId" TEXT NOT NULL,
    "choferId" TEXT,
    "obraId" TEXT,

    CONSTRAINT "CargaCombustible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MantenimientoVehiculo" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMantenimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "km" INTEGER,
    "descripcion" TEXT NOT NULL,
    "taller" TEXT,
    "costo" DECIMAL(14,2),
    "proximoKm" INTEGER,
    "proximaFecha" TIMESTAMP(3),
    "vehiculoId" TEXT NOT NULL,

    CONSTRAINT "MantenimientoVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidenteVehiculo" (
    "id" TEXT NOT NULL,
    "tipo" "TipoIncidenteVehiculo" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(14,2),
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "archivoUrl" TEXT,
    "vehiculoId" TEXT NOT NULL,
    "choferId" TEXT,

    CONSTRAINT "IncidenteVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaAlerta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "severidad" "Severidad" NOT NULL DEFAULT 'AVISO',
    "umbral" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "rolesDestino" "Rol"[],
    "canales" "CanalNotificacion"[],

    CONSTRAINT "ReglaAlerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "claveUnica" TEXT NOT NULL,
    "severidad" "Severidad" NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "enlace" TEXT,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'ABIERTA',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaEn" TIMESTAMP(3),
    "reglaId" TEXT NOT NULL,
    "obraId" TEXT,
    "resueltaPorId" TEXT,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacionEnvio" (
    "id" TEXT NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',
    "enviadoEn" TIMESTAMP(3),
    "error" TEXT,
    "alertaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "NotificacionEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_empleadoId_key" ON "Usuario"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadNegocio_codigo_key" ON "UnidadNegocio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Obra_codigo_key" ON "Obra"("codigo");

-- CreateIndex
CREATE INDEX "Obra_estado_idx" ON "Obra"("estado");

-- CreateIndex
CREATE INDEX "Obra_unidadNegocioId_idx" ON "Obra"("unidadNegocioId");

-- CreateIndex
CREATE INDEX "Obra_idExterno_idx" ON "Obra"("idExterno");

-- CreateIndex
CREATE UNIQUE INDEX "Deposito_nombre_key" ON "Deposito"("nombre");

-- CreateIndex
CREATE INDEX "MovimientoExterno_obraId_fecha_idx" ON "MovimientoExterno"("obraId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoExterno_categoria_idx" ON "MovimientoExterno"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoExterno_fuente_idExterno_key" ON "MovimientoExterno"("fuente", "idExterno");

-- CreateIndex
CREATE INDEX "PedidoCompraExterno_estado_idx" ON "PedidoCompraExterno"("estado");

-- CreateIndex
CREATE INDEX "PedidoCompraExterno_obraId_idx" ON "PedidoCompraExterno"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCompraExterno_fuente_idExterno_key" ON "PedidoCompraExterno"("fuente", "idExterno");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaHerramienta_nombre_key" ON "CategoriaHerramienta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Herramienta_codigo_key" ON "Herramienta"("codigo");

-- CreateIndex
CREATE INDEX "Herramienta_estado_idx" ON "Herramienta"("estado");

-- CreateIndex
CREATE INDEX "Herramienta_obraId_idx" ON "Herramienta"("obraId");

-- CreateIndex
CREATE INDEX "Herramienta_depositoId_idx" ON "Herramienta"("depositoId");

-- CreateIndex
CREATE INDEX "Herramienta_categoriaId_idx" ON "Herramienta"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "ExistenciaHerramienta_herramientaId_depositoId_obraId_key" ON "ExistenciaHerramienta"("herramientaId", "depositoId", "obraId");

-- CreateIndex
CREATE INDEX "MovimientoHerramienta_herramientaId_fecha_idx" ON "MovimientoHerramienta"("herramientaId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoHerramienta_destinoObraId_idx" ON "MovimientoHerramienta"("destinoObraId");

-- CreateIndex
CREATE INDEX "MantenimientoHerramienta_herramientaId_idx" ON "MantenimientoHerramienta"("herramientaId");

-- CreateIndex
CREATE INDEX "SolicitudHerramienta_estado_idx" ON "SolicitudHerramienta"("estado");

-- CreateIndex
CREATE INDEX "SolicitudHerramienta_obraId_idx" ON "SolicitudHerramienta"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_legajo_key" ON "Empleado"("legajo");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_dni_key" ON "Empleado"("dni");

-- CreateIndex
CREATE INDEX "Empleado_activo_idx" ON "Empleado"("activo");

-- CreateIndex
CREATE INDEX "Empleado_apellido_nombre_idx" ON "Empleado"("apellido", "nombre");

-- CreateIndex
CREATE INDEX "HistorialValorHora_empleadoId_desde_idx" ON "HistorialValorHora"("empleadoId", "desde");

-- CreateIndex
CREATE INDEX "DocumentoEmpleado_vencimiento_idx" ON "DocumentoEmpleado"("vencimiento");

-- CreateIndex
CREATE INDEX "EntregaEpp_empleadoId_idx" ON "EntregaEpp"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcontratista_cuit_key" ON "Subcontratista"("cuit");

-- CreateIndex
CREATE INDEX "DocumentoSubcontratista_vencimiento_idx" ON "DocumentoSubcontratista"("vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "Cuadrilla_nombre_key" ON "Cuadrilla"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CuadrillaMiembro_cuadrillaId_empleadoId_key" ON "CuadrillaMiembro"("cuadrillaId", "empleadoId");

-- CreateIndex
CREATE INDEX "AsignacionObra_obraId_desde_idx" ON "AsignacionObra"("obraId", "desde");

-- CreateIndex
CREATE INDEX "AsignacionObra_empleadoId_desde_idx" ON "AsignacionObra"("empleadoId", "desde");

-- CreateIndex
CREATE INDEX "ParteDiario_fecha_idx" ON "ParteDiario"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ParteDiario_obraId_fecha_key" ON "ParteDiario"("obraId", "fecha");

-- CreateIndex
CREATE INDEX "ParteDiarioLinea_empleadoId_idx" ON "ParteDiarioLinea"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "ParteDiarioLinea_parteId_empleadoId_key" ON "ParteDiarioLinea"("parteId", "empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "ParteSubcontratista_parteId_subcontratistaId_key" ON "ParteSubcontratista"("parteId", "subcontratistaId");

-- CreateIndex
CREATE INDEX "NovedadPersonal_empleadoId_fecha_idx" ON "NovedadPersonal"("empleadoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Quincena_anio_mes_numero_key" ON "Quincena"("anio", "mes", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "QuincenaLinea_quincenaId_empleadoId_obraId_key" ON "QuincenaLinea"("quincenaId", "empleadoId", "obraId");

-- CreateIndex
CREATE INDEX "PagoPersonal_fecha_idx" ON "PagoPersonal"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_patente_key" ON "Vehiculo"("patente");

-- CreateIndex
CREATE INDEX "Vehiculo_estado_idx" ON "Vehiculo"("estado");

-- CreateIndex
CREATE INDEX "DocumentoVehiculo_vencimiento_idx" ON "DocumentoVehiculo"("vencimiento");

-- CreateIndex
CREATE INDEX "SolicitudViaje_estado_fechaHoraNecesaria_idx" ON "SolicitudViaje"("estado", "fechaHoraNecesaria");

-- CreateIndex
CREATE UNIQUE INDEX "Viaje_solicitudId_key" ON "Viaje"("solicitudId");

-- CreateIndex
CREATE INDEX "Viaje_vehiculoId_salidaPrevista_idx" ON "Viaje"("vehiculoId", "salidaPrevista");

-- CreateIndex
CREATE INDEX "Viaje_choferId_salidaPrevista_idx" ON "Viaje"("choferId", "salidaPrevista");

-- CreateIndex
CREATE INDEX "Viaje_obraId_idx" ON "Viaje"("obraId");

-- CreateIndex
CREATE INDEX "Viaje_estado_idx" ON "Viaje"("estado");

-- CreateIndex
CREATE INDEX "CargaCombustible_vehiculoId_fecha_idx" ON "CargaCombustible"("vehiculoId", "fecha");

-- CreateIndex
CREATE INDEX "MantenimientoVehiculo_vehiculoId_idx" ON "MantenimientoVehiculo"("vehiculoId");

-- CreateIndex
CREATE INDEX "IncidenteVehiculo_vehiculoId_idx" ON "IncidenteVehiculo"("vehiculoId");

-- CreateIndex
CREATE UNIQUE INDEX "ReglaAlerta_codigo_key" ON "ReglaAlerta"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Alerta_claveUnica_key" ON "Alerta"("claveUnica");

-- CreateIndex
CREATE INDEX "Alerta_estado_severidad_idx" ON "Alerta"("estado", "severidad");

-- CreateIndex
CREATE INDEX "Alerta_obraId_idx" ON "Alerta"("obraId");

-- CreateIndex
CREATE INDEX "NotificacionEnvio_usuarioId_estado_idx" ON "NotificacionEnvio"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_entidad_entidadId_idx" ON "RegistroAuditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_fecha_idx" ON "RegistroAuditoria"("fecha");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_unidadNegocioId_fkey" FOREIGN KEY ("unidadNegocioId") REFERENCES "UnidadNegocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_jefeObraId_fkey" FOREIGN KEY ("jefeObraId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposito" ADD CONSTRAINT "Deposito_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoExterno" ADD CONSTRAINT "MovimientoExterno_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompraExterno" ADD CONSTRAINT "PedidoCompraExterno_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Herramienta" ADD CONSTRAINT "Herramienta_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Herramienta" ADD CONSTRAINT "Herramienta_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Herramienta" ADD CONSTRAINT "Herramienta_responsableActualId_fkey" FOREIGN KEY ("responsableActualId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Herramienta" ADD CONSTRAINT "Herramienta_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaHerramienta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExistenciaHerramienta" ADD CONSTRAINT "ExistenciaHerramienta_herramientaId_fkey" FOREIGN KEY ("herramientaId") REFERENCES "Herramienta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExistenciaHerramienta" ADD CONSTRAINT "ExistenciaHerramienta_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExistenciaHerramienta" ADD CONSTRAINT "ExistenciaHerramienta_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_herramientaId_fkey" FOREIGN KEY ("herramientaId") REFERENCES "Herramienta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_origenDepositoId_fkey" FOREIGN KEY ("origenDepositoId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_origenObraId_fkey" FOREIGN KEY ("origenObraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_destinoDepositoId_fkey" FOREIGN KEY ("destinoDepositoId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_destinoObraId_fkey" FOREIGN KEY ("destinoObraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoHerramienta" ADD CONSTRAINT "MovimientoHerramienta_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudHerramienta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantenimientoHerramienta" ADD CONSTRAINT "MantenimientoHerramienta_herramientaId_fkey" FOREIGN KEY ("herramientaId") REFERENCES "Herramienta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudHerramienta" ADD CONSTRAINT "SolicitudHerramienta_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudHerramienta" ADD CONSTRAINT "SolicitudHerramienta_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaHerramienta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudHerramienta" ADD CONSTRAINT "SolicitudHerramienta_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudHerramienta" ADD CONSTRAINT "SolicitudHerramienta_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialValorHora" ADD CONSTRAINT "HistorialValorHora_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEmpleado" ADD CONSTRAINT "DocumentoEmpleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaEpp" ADD CONSTRAINT "EntregaEpp_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoSubcontratista" ADD CONSTRAINT "DocumentoSubcontratista_subcontratistaId_fkey" FOREIGN KEY ("subcontratistaId") REFERENCES "Subcontratista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuadrilla" ADD CONSTRAINT "Cuadrilla_capatazId_fkey" FOREIGN KEY ("capatazId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadrillaMiembro" ADD CONSTRAINT "CuadrillaMiembro_cuadrillaId_fkey" FOREIGN KEY ("cuadrillaId") REFERENCES "Cuadrilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadrillaMiembro" ADD CONSTRAINT "CuadrillaMiembro_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionObra" ADD CONSTRAINT "AsignacionObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionObra" ADD CONSTRAINT "AsignacionObra_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionObra" ADD CONSTRAINT "AsignacionObra_subcontratistaId_fkey" FOREIGN KEY ("subcontratistaId") REFERENCES "Subcontratista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionObra" ADD CONSTRAINT "AsignacionObra_cuadrillaId_fkey" FOREIGN KEY ("cuadrillaId") REFERENCES "Cuadrilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteDiario" ADD CONSTRAINT "ParteDiario_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteDiario" ADD CONSTRAINT "ParteDiario_cargadoPorId_fkey" FOREIGN KEY ("cargadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteDiario" ADD CONSTRAINT "ParteDiario_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteDiarioLinea" ADD CONSTRAINT "ParteDiarioLinea_parteId_fkey" FOREIGN KEY ("parteId") REFERENCES "ParteDiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteDiarioLinea" ADD CONSTRAINT "ParteDiarioLinea_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteSubcontratista" ADD CONSTRAINT "ParteSubcontratista_parteId_fkey" FOREIGN KEY ("parteId") REFERENCES "ParteDiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteSubcontratista" ADD CONSTRAINT "ParteSubcontratista_subcontratistaId_fkey" FOREIGN KEY ("subcontratistaId") REFERENCES "Subcontratista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadPersonal" ADD CONSTRAINT "NovedadPersonal_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadPersonal" ADD CONSTRAINT "NovedadPersonal_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovedadPersonal" ADD CONSTRAINT "NovedadPersonal_quincenaId_fkey" FOREIGN KEY ("quincenaId") REFERENCES "Quincena"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quincena" ADD CONSTRAINT "Quincena_cerradaPorId_fkey" FOREIGN KEY ("cerradaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuincenaLinea" ADD CONSTRAINT "QuincenaLinea_quincenaId_fkey" FOREIGN KEY ("quincenaId") REFERENCES "Quincena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuincenaLinea" ADD CONSTRAINT "QuincenaLinea_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuincenaLinea" ADD CONSTRAINT "QuincenaLinea_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPersonal" ADD CONSTRAINT "PagoPersonal_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPersonal" ADD CONSTRAINT "PagoPersonal_subcontratistaId_fkey" FOREIGN KEY ("subcontratistaId") REFERENCES "Subcontratista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPersonal" ADD CONSTRAINT "PagoPersonal_quincenaId_fkey" FOREIGN KEY ("quincenaId") REFERENCES "Quincena"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_choferHabitualId_fkey" FOREIGN KEY ("choferHabitualId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVehiculo" ADD CONSTRAINT "DocumentoVehiculo_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudViaje" ADD CONSTRAINT "SolicitudViaje_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudViaje" ADD CONSTRAINT "SolicitudViaje_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudViaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaCombustible" ADD CONSTRAINT "CargaCombustible_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaCombustible" ADD CONSTRAINT "CargaCombustible_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaCombustible" ADD CONSTRAINT "CargaCombustible_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantenimientoVehiculo" ADD CONSTRAINT "MantenimientoVehiculo_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteVehiculo" ADD CONSTRAINT "IncidenteVehiculo_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenteVehiculo" ADD CONSTRAINT "IncidenteVehiculo_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "ReglaAlerta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacionEnvio" ADD CONSTRAINT "NotificacionEnvio_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "Alerta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacionEnvio" ADD CONSTRAINT "NotificacionEnvio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
