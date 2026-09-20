import {
  CategoriaCostoExterno,
  EstadoObra,
  EstadoPedidoCompra,
  TipoMovimientoExterno,
  TipoObra,
} from '@prisma/client'

/* =====================================================================
   MAPEO DE LA PLANILLA DE SORBY
   ---------------------------------------------------------------------
   Sorby sincroniza automáticamente contra una planilla de Google Sheets.
   Todavía NO conocemos el formato exacto: los nombres de hoja y de
   columna de acá abajo son los que suenan más probables, pero hay que
   confirmarlos contra la planilla real.

   CÓMO AJUSTARLO CUANDO TENGAMOS LA PLANILLA
   1. Abrir la planilla y anotar el nombre exacto de cada hoja.
      → cambiar HOJAS.
   2. Mirar la fila de encabezados de cada hoja y anotar el título exacto
      de cada columna, con mayúsculas, tildes y espacios como estén.
      → cambiar COLUMNAS. Se puede poner más de un nombre por campo: el
        adaptador usa el primero que encuentre, así que conviene dejar
        los alias por si cambian el título.
   3. Revisar los diccionarios de abajo (ESTADOS_OBRA, CATEGORIAS, …) y
      agregar los valores que use Sorby. Lo que no esté mapeado cae en el
      valor por defecto y queda registrado como advertencia, nunca se
      descarta en silencio.

   NO hace falta tocar nada más: el resto del adaptador lee este archivo.
   ===================================================================== */

/** Nombre de cada hoja dentro de la planilla. */
export const HOJAS = {
  obras: 'Obras',
  movimientos: 'Movimientos',
  pedidos: 'Pedidos de compra',
} as const

/**
 * Título de cada columna. El primero que exista en la planilla es el que
 * se usa; los demás quedan como alias.
 */
export const COLUMNAS = {
  obras: {
    idExterno: ['ID', 'Id obra', 'IdObra', 'Código interno'],
    codigo: ['Código', 'Codigo', 'Código de obra', 'Nº de obra'],
    nombre: ['Nombre', 'Obra', 'Descripción'],
    tipo: ['Tipo', 'Tipo de obra'],
    estado: ['Estado', 'Situación'],
    cliente: ['Cliente', 'Comitente'],
    unidadNegocio: ['Unidad de negocio', 'Unidad', 'Área', 'Rubro'],
    presupuestoTotal: ['Presupuesto', 'Presupuesto total', 'Monto contrato'],
    moneda: ['Moneda'],
    fechaInicio: ['Fecha inicio', 'Inicio'],
    fechaFinPrevista: ['Fecha fin prevista', 'Fin previsto', 'Fecha de finalización'],
    fechaFinReal: ['Fecha fin real', 'Fin real'],
  },

  movimientos: {
    idExterno: ['ID', 'Id movimiento', 'Nº comprobante', 'Comprobante'],
    codigoObra: ['Obra', 'Código de obra', 'Codigo obra', 'Centro de costo'],
    tipo: ['Tipo', 'Tipo de movimiento', 'Ingreso/Egreso'],
    categoria: ['Categoría', 'Categoria', 'Rubro', 'Concepto'],
    fecha: ['Fecha', 'Fecha del comprobante'],
    descripcion: ['Descripción', 'Descripcion', 'Detalle'],
    proveedor: ['Proveedor', 'Razón social'],
    monto: ['Importe', 'Monto', 'Total'],
    moneda: ['Moneda'],
    tipoCambio: ['Tipo de cambio', 'TC', 'Cotización'],
  },

  pedidos: {
    idExterno: ['ID', 'Id pedido', 'Nº pedido'],
    numero: ['Número', 'Numero', 'Nº', 'Nº pedido'],
    codigoObra: ['Obra', 'Código de obra', 'Centro de costo'],
    descripcion: ['Descripción', 'Descripcion', 'Detalle', 'Material'],
    solicitante: ['Solicitante', 'Pedido por'],
    proveedor: ['Proveedor'],
    estado: ['Estado', 'Situación'],
    monto: ['Importe', 'Monto', 'Total'],
    moneda: ['Moneda'],
    fechaSolicitud: ['Fecha', 'Fecha de pedido', 'Fecha solicitud'],
    fechaNecesariaEnObra: ['Fecha necesaria', 'Necesario en obra', 'Requerido para'],
    fechaAprobacion: ['Fecha aprobación', 'Aprobado el'],
    fechaEntregaEstimada: ['Entrega estimada', 'Fecha estimada de entrega'],
    fechaEntregaReal: ['Entrega real', 'Fecha de entrega', 'Recibido el'],
  },
} as const

/* ---------------------------------------------------------------------
   Diccionarios de valores.
   La clave se compara sin tildes, sin espacios de más y en minúsculas,
   así que no hace falta escribir todas las variantes de escritura.
   --------------------------------------------------------------------- */

export const TIPOS_OBRA: Record<string, TipoObra> = {
  propia: TipoObra.PROPIA,
  'obra propia': TipoObra.PROPIA,
  desarrollo: TipoObra.PROPIA,
  terceros: TipoObra.TERCEROS,
  'para terceros': TipoObra.TERCEROS,
  cliente: TipoObra.TERCEROS,
}

export const ESTADOS_OBRA: Record<string, EstadoObra> = {
  planificada: EstadoObra.PLANIFICADA,
  proyecto: EstadoObra.PLANIFICADA,
  'por iniciar': EstadoObra.PLANIFICADA,
  'en curso': EstadoObra.EN_CURSO,
  activa: EstadoObra.EN_CURSO,
  'en ejecucion': EstadoObra.EN_CURSO,
  pausada: EstadoObra.PAUSADA,
  suspendida: EstadoObra.PAUSADA,
  detenida: EstadoObra.PAUSADA,
  finalizada: EstadoObra.FINALIZADA,
  terminada: EstadoObra.FINALIZADA,
  cerrada: EstadoObra.FINALIZADA,
}

export const TIPOS_MOVIMIENTO: Record<string, TipoMovimientoExterno> = {
  ingreso: TipoMovimientoExterno.INGRESO,
  cobro: TipoMovimientoExterno.INGRESO,
  entrada: TipoMovimientoExterno.INGRESO,
  credito: TipoMovimientoExterno.INGRESO,
  egreso: TipoMovimientoExterno.EGRESO,
  gasto: TipoMovimientoExterno.EGRESO,
  pago: TipoMovimientoExterno.EGRESO,
  salida: TipoMovimientoExterno.EGRESO,
  debito: TipoMovimientoExterno.EGRESO,
  compra: TipoMovimientoExterno.EGRESO,
}

export const CATEGORIAS: Record<string, CategoriaCostoExterno> = {
  materiales: CategoriaCostoExterno.MATERIALES,
  material: CategoriaCostoExterno.MATERIALES,
  insumos: CategoriaCostoExterno.MATERIALES,
  hormigon: CategoriaCostoExterno.MATERIALES,
  hierro: CategoriaCostoExterno.MATERIALES,
  subcontratos: CategoriaCostoExterno.SUBCONTRATOS,
  subcontrato: CategoriaCostoExterno.SUBCONTRATOS,
  'mano de obra contratada': CategoriaCostoExterno.SUBCONTRATOS,
  equipos: CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES,
  alquileres: CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES,
  'alquiler de equipos': CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES,
  maquinaria: CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES,
  honorarios: CategoriaCostoExterno.HONORARIOS,
  profesionales: CategoriaCostoExterno.HONORARIOS,
  impuestos: CategoriaCostoExterno.IMPUESTOS_Y_TASAS,
  tasas: CategoriaCostoExterno.IMPUESTOS_Y_TASAS,
  'derechos de construccion': CategoriaCostoExterno.IMPUESTOS_Y_TASAS,
  estructura: CategoriaCostoExterno.ESTRUCTURA,
  'gastos generales': CategoriaCostoExterno.ESTRUCTURA,
  administracion: CategoriaCostoExterno.ESTRUCTURA,
  cobro: CategoriaCostoExterno.COBRO_CLIENTE,
  'cobro cliente': CategoriaCostoExterno.COBRO_CLIENTE,
  certificado: CategoriaCostoExterno.COBRO_CLIENTE,
  'venta de unidad': CategoriaCostoExterno.VENTA_UNIDAD,
  venta: CategoriaCostoExterno.VENTA_UNIDAD,
  escrituracion: CategoriaCostoExterno.VENTA_UNIDAD,
  alquiler: CategoriaCostoExterno.ALQUILER_TEMPORARIO,
  'alquiler temporario': CategoriaCostoExterno.ALQUILER_TEMPORARIO,
}

export const ESTADOS_PEDIDO: Record<string, EstadoPedidoCompra> = {
  borrador: EstadoPedidoCompra.BORRADOR,
  'pendiente de aprobacion': EstadoPedidoCompra.PENDIENTE_APROBACION,
  pendiente: EstadoPedidoCompra.PENDIENTE_APROBACION,
  'a aprobar': EstadoPedidoCompra.PENDIENTE_APROBACION,
  aprobado: EstadoPedidoCompra.APROBADO,
  autorizado: EstadoPedidoCompra.APROBADO,
  comprado: EstadoPedidoCompra.COMPRADO,
  'orden emitida': EstadoPedidoCompra.COMPRADO,
  'entregado parcial': EstadoPedidoCompra.ENTREGADO_PARCIAL,
  parcial: EstadoPedidoCompra.ENTREGADO_PARCIAL,
  entregado: EstadoPedidoCompra.ENTREGADO,
  recibido: EstadoPedidoCompra.ENTREGADO,
  cancelado: EstadoPedidoCompra.CANCELADO,
  anulado: EstadoPedidoCompra.CANCELADO,
}

/* ---------------------------------------------------------------------
   Valores por defecto: lo que se usa cuando un campo viene vacío o con
   un valor que no está en los diccionarios. Nunca se descarta la fila.
   --------------------------------------------------------------------- */

export const POR_DEFECTO = {
  tipoObra: TipoObra.TERCEROS,
  estadoObra: EstadoObra.EN_CURSO,
  tipoMovimiento: TipoMovimientoExterno.EGRESO,
  categoria: CategoriaCostoExterno.OTROS,
  estadoPedido: EstadoPedidoCompra.BORRADOR,
} as const

/**
 * Cómo vienen escritos los números en la planilla.
 * En Argentina el punto separa los miles y la coma los decimales, pero
 * Google Sheets a veces devuelve el formato inglés según la
 * configuración regional del documento. 'auto' se da cuenta solo.
 */
export const FORMATO_NUMERO: 'auto' | 'es-AR' | 'en-US' = 'auto'

/** Cómo vienen escritas las fechas. 'auto' prueba los formatos comunes. */
export const FORMATO_FECHA: 'auto' | 'dd/mm/aaaa' | 'aaaa-mm-dd' = 'auto'
