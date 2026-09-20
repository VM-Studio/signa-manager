import 'server-only'

import {
  CategoriaCostoExterno,
  EstadoPedidoCompra,
  Moneda,
  TipoMovimientoExterno,
} from '@prisma/client'
import { db } from '@/lib/db'
import type {
  MovimientoExternoNormalizado,
  ObraExterna,
  PedidoCompraExternoNormalizado,
  SistemaBase,
} from './tipos'

/* =====================================================================
   Adaptador de datos de ejemplo.

   Devuelve lo que ya está en la base (para que la sincronización no
   rompa nada de lo que se sembró) y además inventa un movimiento nuevo
   cada vez que se lo llama. Eso es a propósito: en la demo, al tocar
   "Sincronizar ahora" tiene que verse que entró información.
   ===================================================================== */

const FUENTE = 'mock' as const

/** Cosas que podrían haberse comprado entre una sincronización y la otra. */
const COMPRAS_POSIBLES = [
  { descripcion: 'Hierro del 10 · 800 kg', proveedor: 'Hierromat S.A.', categoria: CategoriaCostoExterno.MATERIALES, min: 1_800_000, max: 4_200_000 },
  { descripcion: 'Cemento de albañilería · 120 bolsas', proveedor: 'Corralón Norte', categoria: CategoriaCostoExterno.MATERIALES, min: 900_000, max: 2_400_000 },
  { descripcion: 'Hormigón elaborado H-21 · 8 m³', proveedor: 'Hormigonera Lomax', categoria: CategoriaCostoExterno.MATERIALES, min: 3_400_000, max: 6_800_000 },
  { descripcion: 'Certificado de avance · instalación eléctrica', proveedor: 'Electricidad Maidana S.R.L.', categoria: CategoriaCostoExterno.SUBCONTRATOS, min: 2_800_000, max: 9_500_000 },
  { descripcion: 'Certificado de avance · yesería', proveedor: 'Yesería Hermanos Cáceres', categoria: CategoriaCostoExterno.SUBCONTRATOS, min: 1_600_000, max: 5_200_000 },
  { descripcion: 'Alquiler de bomba de hormigón · jornada', proveedor: 'Bombas de Hormigón Delta', categoria: CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES, min: 800_000, max: 2_100_000 },
  { descripcion: 'Volquetes del mes', proveedor: 'Volquetes del Norte', categoria: CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES, min: 400_000, max: 1_300_000 },
]

const COBROS_POSIBLES = [
  { descripcion: 'Certificado de obra cobrado', categoria: CategoriaCostoExterno.COBRO_CLIENTE, min: 8_000_000, max: 28_000_000 },
  { descripcion: 'Anticipo de cliente', categoria: CategoriaCostoExterno.COBRO_CLIENTE, min: 4_000_000, max: 15_000_000 },
]

function entre(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) / 1000) * 1000
}

function uno<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]
}

export class AdaptadorMock implements SistemaBase {
  readonly fuente = FUENTE
  readonly nombre = 'Datos de ejemplo'

  /**
   * Las obras que "tiene" el sistema base: son las mismas de la base,
   * pero devueltas con la forma que devolvería un proveedor real. Así la
   * sincronización hace un upsert de verdad y se puede probar que no
   * pisa los campos nuestros.
   */
  async listarObras(): Promise<ObraExterna[]> {
    const obras = await db.obra.findMany({
      where: { idExterno: { not: null } },
      select: {
        idExterno: true,
        codigo: true,
        nombre: true,
        tipo: true,
        estado: true,
        cliente: true,
        presupuestoTotal: true,
        moneda: true,
        fechaInicio: true,
        fechaFinPrevista: true,
        fechaFinReal: true,
        unidadNegocio: { select: { nombre: true } },
      },
    })

    return obras.map((o) => ({
      idExterno: o.idExterno as string,
      codigo: o.codigo,
      nombre: o.nombre,
      tipo: o.tipo,
      estado: o.estado,
      cliente: o.cliente,
      unidadNegocio: o.unidadNegocio.nombre,
      presupuestoTotal: o.presupuestoTotal ? Number(o.presupuestoTotal) : null,
      moneda: o.moneda,
      fechaInicio: o.fechaInicio,
      fechaFinPrevista: o.fechaFinPrevista,
      fechaFinReal: o.fechaFinReal,
    }))
  }

  /**
   * Los movimientos desde la fecha pedida, más uno o dos inventados con
   * fecha de hoy. Los inventados llevan un idExterno único, así que el
   * upsert los inserta una sola vez y la próxima corrida crea otros.
   */
  async listarMovimientos(desde: Date): Promise<MovimientoExternoNormalizado[]> {
    const existentes = await db.movimientoExterno.findMany({
      where: { fuente: FUENTE, fecha: { gte: desde } },
      select: {
        idExterno: true,
        tipo: true,
        categoria: true,
        fecha: true,
        descripcion: true,
        proveedor: true,
        monto: true,
        moneda: true,
        tipoCambio: true,
        obra: { select: { codigo: true } },
      },
    })

    const normalizados: MovimientoExternoNormalizado[] = existentes.map((m) => ({
      idExterno: m.idExterno,
      tipo: m.tipo,
      categoria: m.categoria,
      fecha: m.fecha,
      descripcion: m.descripcion,
      proveedor: m.proveedor,
      monto: Number(m.monto),
      moneda: m.moneda,
      tipoCambio: m.tipoCambio ? Number(m.tipoCambio) : null,
      codigoObra: m.obra?.codigo ?? null,
    }))

    return [...normalizados, ...(await this.inventarMovimientos())]
  }

  /** Lo nuevo que "pasó" desde la última sincronización. */
  private async inventarMovimientos(): Promise<MovimientoExternoNormalizado[]> {
    const obras = await db.obra.findMany({
      where: { estado: 'EN_CURSO', idExterno: { not: null } },
      select: { codigo: true },
    })
    if (obras.length === 0) return []

    const nuevos: MovimientoExternoNormalizado[] = []
    const sello = Date.now()

    // Entre uno y tres gastos nuevos.
    const cuantos = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < cuantos; i++) {
      const compra = uno(COMPRAS_POSIBLES)
      nuevos.push({
        idExterno: `MV-NUEVO-${sello}-${i}`,
        tipo: TipoMovimientoExterno.EGRESO,
        categoria: compra.categoria,
        fecha: new Date(),
        descripcion: compra.descripcion,
        proveedor: compra.proveedor,
        monto: entre(compra.min, compra.max),
        moneda: Moneda.ARS,
        tipoCambio: null,
        codigoObra: uno(obras).codigo,
      })
    }

    // Y de tanto en tanto, un cobro.
    if (Math.random() < 0.45) {
      const cobro = uno(COBROS_POSIBLES)
      nuevos.push({
        idExterno: `MV-NUEVO-${sello}-cobro`,
        tipo: TipoMovimientoExterno.INGRESO,
        categoria: cobro.categoria,
        fecha: new Date(),
        descripcion: cobro.descripcion,
        proveedor: null,
        monto: entre(cobro.min, cobro.max),
        moneda: Moneda.ARS,
        tipoCambio: null,
        codigoObra: uno(obras).codigo,
      })
    }

    return nuevos
  }

  async listarPedidosCompra(
    desde: Date,
  ): Promise<PedidoCompraExternoNormalizado[]> {
    const pedidos = await db.pedidoCompraExterno.findMany({
      where: { fuente: FUENTE, fechaSolicitud: { gte: desde } },
      select: {
        idExterno: true,
        numero: true,
        descripcion: true,
        solicitante: true,
        proveedor: true,
        estado: true,
        monto: true,
        moneda: true,
        fechaSolicitud: true,
        fechaNecesariaEnObra: true,
        fechaAprobacion: true,
        fechaEntregaEstimada: true,
        fechaEntregaReal: true,
        obra: { select: { codigo: true } },
      },
    })

    const normalizados: PedidoCompraExternoNormalizado[] = pedidos.map((p) => ({
      idExterno: p.idExterno,
      numero: p.numero,
      descripcion: p.descripcion,
      solicitante: p.solicitante,
      proveedor: p.proveedor,
      estado: p.estado,
      monto: p.monto ? Number(p.monto) : null,
      moneda: p.moneda,
      fechaSolicitud: p.fechaSolicitud,
      fechaNecesariaEnObra: p.fechaNecesariaEnObra,
      fechaAprobacion: p.fechaAprobacion,
      fechaEntregaEstimada: p.fechaEntregaEstimada,
      fechaEntregaReal: p.fechaEntregaReal,
      codigoObra: p.obra.codigo,
    }))

    // Cada tanto aparece un pedido nuevo, igual que en la vida real.
    if (Math.random() < 0.35) {
      const obra = await db.obra.findFirst({
        where: { estado: 'EN_CURSO' },
        select: { codigo: true },
      })
      if (obra) {
        normalizados.push({
          idExterno: `PC-NUEVO-${Date.now()}`,
          numero: `PC-${2500 + Math.floor(Math.random() * 99)}`,
          descripcion: uno([
            'Malla Sima Q188 · 40 paños',
            'Membrana asfáltica 4 mm · 25 rollos',
            'Cañería de agua PPN · 120 m',
            'Aislación térmica de techos · 90 m²',
          ]),
          solicitante: uno(['Diego Sarmiento', 'Hernán Costa', 'Malena Ferrari']),
          proveedor: uno(['Corralón Norte', 'Hierromat S.A.', 'Sanitarios FV Norte']),
          estado: EstadoPedidoCompra.PENDIENTE_APROBACION,
          monto: entre(1_400_000, 8_600_000),
          moneda: Moneda.ARS,
          fechaSolicitud: new Date(),
          fechaNecesariaEnObra: new Date(Date.now() + 14 * 86_400_000),
          fechaAprobacion: null,
          fechaEntregaEstimada: null,
          fechaEntregaReal: null,
          codigoObra: obra.codigo,
        })
      }
    }

    return normalizados
  }
}
