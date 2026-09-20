import type {
  CategoriaCostoExterno,
  EstadoObra,
  EstadoPedidoCompra,
  Moneda,
  TipoMovimientoExterno,
  TipoObra,
} from '@prisma/client'

/* =====================================================================
   El contrato con el sistema base.

   Esta es la pieza que hace que la app funcione igual con Lebane o con
   Sorby. Cada proveedor entrega los datos como quiere: uno una planilla
   de Google, el otro una API. Acá adentro los dos se ven iguales.

   Regla: los tipos de este archivo son NUESTROS. Ningún campo, nombre ni
   código de un proveedor se filtra más allá de su adaptador. Si mañana
   la empresa cambia de sistema, se escribe un adaptador nuevo y no se
   toca ni una pantalla.
   ===================================================================== */

/** Qué sistema base está conectado. Sale de la variable SISTEMA_BASE. */
export type FuenteSistemaBase = 'mock' | 'sorby' | 'lebane'

export const FUENTES: FuenteSistemaBase[] = ['mock', 'sorby', 'lebane']

export const NOMBRE_FUENTE: Record<FuenteSistemaBase, string> = {
  mock: 'Datos de ejemplo',
  sorby: 'Sorby',
  lebane: 'Lebane',
}

// ------------------------------- OBRA --------------------------------

/**
 * Una obra como la entrega el sistema base.
 *
 * Solo trae los campos que son SUYOS. El jefe de obra, el presupuesto de
 * mano de obra, la ubicación y si es del interior son nuestros, los carga
 * esta app y la sincronización no los toca nunca.
 */
export interface ObraExterna {
  /** Id de la obra en el sistema del proveedor. */
  idExterno: string
  /** Código de obra: es la clave que comparten los dos sistemas. */
  codigo: string
  nombre: string
  tipo: TipoObra
  estado: EstadoObra
  cliente: string | null
  /** Nombre de la unidad de negocio tal como viene. Se resuelve al sincronizar. */
  unidadNegocio: string | null
  presupuestoTotal: number | null
  moneda: Moneda
  fechaInicio: Date | null
  fechaFinPrevista: Date | null
  fechaFinReal: Date | null
}

// ---------------------------- MOVIMIENTO -----------------------------

/** Un movimiento de plata de una obra: una factura, un cobro, un gasto. */
export interface MovimientoExternoNormalizado {
  idExterno: string
  tipo: TipoMovimientoExterno
  categoria: CategoriaCostoExterno
  fecha: Date
  descripcion: string | null
  proveedor: string | null
  monto: number
  moneda: Moneda
  /** Solo cuando la moneda es USD. */
  tipoCambio: number | null
  /**
   * Código de la obra a la que se imputa.
   * Puede ser null (gasto de estructura) o traer un código que todavía no
   * existe en nuestra base: en ese caso el movimiento se guarda igual, sin
   * obra, y la sincronización lo informa.
   */
  codigoObra: string | null
}

// -------------------------- PEDIDO DE COMPRA -------------------------

/** Un pedido de compra. Se carga y se aprueba en el sistema base. */
export interface PedidoCompraExternoNormalizado {
  idExterno: string
  numero: string | null
  descripcion: string
  solicitante: string | null
  proveedor: string | null
  estado: EstadoPedidoCompra
  monto: number | null
  moneda: Moneda
  fechaSolicitud: Date
  fechaNecesariaEnObra: Date | null
  fechaAprobacion: Date | null
  fechaEntregaEstimada: Date | null
  fechaEntregaReal: Date | null
  /** Obligatorio: un pedido siempre es para una obra. */
  codigoObra: string
}

// ---------------------------- LA INTERFAZ ----------------------------

/**
 * Lo único que la app le pide al sistema base.
 *
 * Tres métodos. Nada más. Si un adaptador necesita paginar, cachear o
 * reintentar, lo resuelve adentro: para el resto de la app son tres
 * llamadas que devuelven listas.
 */
export interface SistemaBase {
  /** Con qué fuente se está hablando. Va en cada registro que se guarda. */
  readonly fuente: FuenteSistemaBase

  /** Nombre para mostrar en la pantalla de sincronización. */
  readonly nombre: string

  /** Todas las obras que el sistema base conoce. */
  listarObras(): Promise<ObraExterna[]>

  /**
   * Los movimientos registrados desde una fecha.
   * La sincronización pasa la fecha de la última corrida exitosa, así no
   * se traen seis meses de facturas cada hora.
   */
  listarMovimientos(desde: Date): Promise<MovimientoExternoNormalizado[]>

  /** Los pedidos de compra creados o modificados desde una fecha. */
  listarPedidosCompra(desde: Date): Promise<PedidoCompraExternoNormalizado[]>
}

/* ---------------------------------------------------------------------
   Error de integración.

   Cuando falta una credencial o el proveedor contesta cualquier cosa, el
   adaptador tira esto con un mensaje escrito para que lo lea una persona,
   no un stack trace. Ese mensaje va derecho a la pantalla de
   sincronización y al RegistroSync.
   --------------------------------------------------------------------- */

export class ErrorIntegracion extends Error {
  constructor(
    public readonly fuente: FuenteSistemaBase,
    mensaje: string,
    /** Qué habría que hacer para destrabarlo. */
    public readonly comoSeArregla?: string,
  ) {
    super(mensaje)
    this.name = 'ErrorIntegracion'
  }

  /** El texto completo que se guarda en RegistroSync.error. */
  get textoCompleto(): string {
    return this.comoSeArregla
      ? `${this.message} ${this.comoSeArregla}`
      : this.message
  }
}
