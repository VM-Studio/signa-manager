import 'server-only'

import {
  CategoriaCostoExterno,
  EstadoParte,
  EstadoViaje,
  Moneda,
  TipoMovimientoExterno,
} from '@prisma/client'
import { db } from '@/lib/db'
import { costoHerramientasPorObra } from './herramientas'
import { viaticosPorObra } from './personal'

/* =====================================================================
   La capa de cálculo del tablero.

   Junta lo que viene del sistema base (materiales, subcontratos,
   equipos, cobros) con lo que registra esta app (mano de obra,
   vehículos, herramientas) y muestra por primera vez el costo real.

   Reglas que atraviesan todo:

   · Los montos en dólares se convierten a pesos con el tipo de cambio
     del propio movimiento, no con uno de hoy: así el histórico no se
     reescribe cada vez que se mueve el dólar.
   · Todo se calcula con consultas agregadas. Nunca se traen registros
     de a uno.
   · Los gastos de estructura NO se reparten entre las obras: van en un
     bloque aparte.
   ===================================================================== */

/** Un monto llevado a pesos. */
export function aPesos(
  monto: unknown,
  moneda: Moneda,
  tipoCambio: unknown,
): number {
  const valor = Number(monto ?? 0)
  if (moneda !== Moneda.USD) return valor

  const cambio = Number(tipoCambio ?? 0)
  // Sin tipo de cambio registrado el monto no se puede convertir: se
  // devuelve cero antes que inventar un número que después nadie puede
  // explicar.
  return cambio > 0 ? valor * cambio : 0
}

export interface Periodo {
  desde: Date
  hasta: Date
  etiqueta: string
}

/* ------------------------ COSTO DE UNA OBRA ------------------------- */

export interface CostoObra {
  obraId: string
  ingresos: number
  materiales: number
  subcontratos: number
  equipos: number
  otrosExternos: number
  manoObra: number
  viaticos: number
  vehiculos: number
  herramientas: number
  costoTotal: number
  resultado: number
  margen: number
  /** De dónde salió cada número, para poder explicarlo. */
  origen: {
    movimientos: number
    partes: number
    viajes: number
    herramientas: number
  }
}

/**
 * A qué rubro del tablero va cada categoría del sistema base.
 * Lo que no esté acá cae en "otros": nunca se descarta un costo.
 */
const RUBRO_DE_CATEGORIA: Partial<
  Record<CategoriaCostoExterno, 'materiales' | 'subcontratos' | 'equipos'>
> = {
  [CategoriaCostoExterno.MATERIALES]: 'materiales',
  [CategoriaCostoExterno.SUBCONTRATOS]: 'subcontratos',
  [CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES]: 'equipos',
}

/**
 * El costo completo de cada obra en un período.
 * Devuelve un mapa por obraId para que el tablero arme sus bloques sin
 * volver a consultar.
 */
export async function costosPorObra(
  periodo: Periodo,
  obraIds?: string[],
): Promise<Map<string, CostoObra>> {
  const filtroObra = obraIds ? { obraId: { in: obraIds } } : {}
  const enElPeriodo = { gte: periodo.desde, lte: periodo.hasta }

  const [movimientos, partes, viajes, herramientas, viaticos] =
    await Promise.all([
      // Los movimientos externos se traen con lo mínimo para poder
      // convertir dólares: monto, moneda y tipo de cambio.
      db.movimientoExterno.findMany({
        where: {
          ...filtroObra,
          obraId: { not: null },
          fecha: enElPeriodo,
          categoria: { not: CategoriaCostoExterno.ESTRUCTURA },
        },
        select: {
          obraId: true,
          tipo: true,
          categoria: true,
          monto: true,
          moneda: true,
          tipoCambio: true,
        },
      }),

      // Mano de obra: líneas de partes aprobados, con el costo congelado.
      db.parteDiario.findMany({
        where: {
          ...(obraIds ? { obraId: { in: obraIds } } : {}),
          estado: EstadoParte.APROBADO,
          fecha: enElPeriodo,
        },
        select: {
          obraId: true,
          lineas: { select: { costoCalculado: true } },
        },
      }),

      db.viaje.groupBy({
        by: ['obraId'],
        where: {
          ...filtroObra,
          obraId: { not: null },
          estado: EstadoViaje.FINALIZADO,
          salidaPrevista: enElPeriodo,
        },
        _sum: { costoCalculado: true },
        _count: true,
      }),

      costoHerramientasPorObra(periodo.desde, periodo.hasta, obraIds),
      viaticosPorObra(periodo.desde, periodo.hasta),
    ])

  const mapa = new Map<string, CostoObra>()

  const obtener = (obraId: string): CostoObra => {
    const existente = mapa.get(obraId)
    if (existente) return existente

    const nuevo: CostoObra = {
      obraId,
      ingresos: 0,
      materiales: 0,
      subcontratos: 0,
      equipos: 0,
      otrosExternos: 0,
      manoObra: 0,
      viaticos: 0,
      vehiculos: 0,
      herramientas: 0,
      costoTotal: 0,
      resultado: 0,
      margen: 0,
      origen: { movimientos: 0, partes: 0, viajes: 0, herramientas: 0 },
    }
    mapa.set(obraId, nuevo)
    return nuevo
  }

  // 1. Lo que viene del sistema base.
  for (const m of movimientos) {
    if (!m.obraId) continue
    const obra = obtener(m.obraId)
    const monto = aPesos(m.monto, m.moneda, m.tipoCambio)
    obra.origen.movimientos += 1

    if (m.tipo === TipoMovimientoExterno.INGRESO) {
      obra.ingresos += monto
      continue
    }

    switch (RUBRO_DE_CATEGORIA[m.categoria]) {
      case 'materiales':
        obra.materiales += monto
        break
      case 'subcontratos':
        obra.subcontratos += monto
        break
      case 'equipos':
        obra.equipos += monto
        break
      default:
        // Honorarios, impuestos y cualquier categoría nueva del proveedor.
        obra.otrosExternos += monto
    }
  }

  // 2. Mano de obra propia.
  for (const p of partes) {
    const obra = obtener(p.obraId)
    obra.manoObra += p.lineas.reduce(
      (a, l) => a + Number(l.costoCalculado ?? 0),
      0,
    )
    obra.origen.partes += 1
  }

  // 3. Viáticos: son parte del costo de la gente, sobre todo en el interior.
  for (const [obraId, monto] of viaticos) {
    if (obraIds && !obraIds.includes(obraId)) continue
    obtener(obraId).viaticos += monto
  }

  // 4. Vehículos.
  for (const v of viajes) {
    if (!v.obraId) continue
    const obra = obtener(v.obraId)
    obra.vehiculos += Number(v._sum.costoCalculado ?? 0)
    obra.origen.viajes += v._count
  }

  // 5. Herramientas: días en obra × costo diario imputable.
  for (const [obraId, datos] of herramientas) {
    const obra = obtener(obraId)
    obra.herramientas += datos.costo
    obra.origen.herramientas += datos.herramientas
  }

  // 6. Totales.
  for (const obra of mapa.values()) {
    obra.costoTotal =
      obra.materiales +
      obra.subcontratos +
      obra.equipos +
      obra.otrosExternos +
      obra.manoObra +
      obra.viaticos +
      obra.vehiculos +
      obra.herramientas

    obra.resultado = obra.ingresos - obra.costoTotal
    obra.margen = obra.ingresos > 0 ? obra.resultado / obra.ingresos : 0
  }

  return mapa
}

/* --------------------------- ESTRUCTURA ----------------------------- */

export interface Estructura {
  total: number
  /** Qué porcentaje de los ingresos se lleva. */
  porcentajeDeIngresos: number
  detalle: Array<{ descripcion: string; monto: number }>
  movimientos: number
}

/**
 * Los gastos de estructura: los que no son de ninguna obra.
 * No se reparten: van en un bloque aparte, como pide el prompt.
 */
export async function gastosDeEstructura(
  periodo: Periodo,
  ingresosTotales: number,
): Promise<Estructura> {
  const movimientos = await db.movimientoExterno.findMany({
    where: {
      fecha: { gte: periodo.desde, lte: periodo.hasta },
      tipo: TipoMovimientoExterno.EGRESO,
      // Sin obra, o marcados como estructura aunque tengan obra.
      OR: [{ obraId: null }, { categoria: CategoriaCostoExterno.ESTRUCTURA }],
    },
    select: {
      descripcion: true,
      monto: true,
      moneda: true,
      tipoCambio: true,
    },
  })

  const porDescripcion = new Map<string, number>()
  let total = 0

  for (const m of movimientos) {
    const monto = aPesos(m.monto, m.moneda, m.tipoCambio)
    total += monto
    const clave = m.descripcion ?? 'Otros gastos de estructura'
    porDescripcion.set(clave, (porDescripcion.get(clave) ?? 0) + monto)
  }

  return {
    total,
    porcentajeDeIngresos: ingresosTotales > 0 ? (total / ingresosTotales) * 100 : 0,
    detalle: [...porDescripcion.entries()]
      .map(([descripcion, monto]) => ({ descripcion, monto }))
      .sort((a, b) => b.monto - a.monto),
    movimientos: movimientos.length,
  }
}

/* ------------------------ TABLERO COMPLETO -------------------------- */

export interface ResumenEmpresaTablero {
  ingresos: number
  costoTotal: number
  resultado: number
  margen: number
  estructura: Estructura
  /** Resultado después de descontar la estructura. */
  resultadoNeto: number
  margenNeto: number
}

export interface ResumenUnidad {
  unidadId: string
  nombre: string
  ingresos: number
  costoTotal: number
  resultado: number
  margen: number
  obras: number
}

export interface ObraTablero extends CostoObra {
  codigo: string
  nombre: string
  estado: string
  unidadNegocio: string
  unidadNegocioId: string
  presupuestoManoObra: number | null
  /** Consumo del presupuesto de mano de obra, en fracción. */
  consumoPresupuesto: number | null
}

export interface DatosTablero {
  periodo: Periodo
  empresa: ResumenEmpresaTablero
  unidades: ResumenUnidad[]
  obras: ObraTablero[]
  /** El mismo cálculo para el período anterior, para comparar. */
  anterior: { ingresos: number; costoTotal: number; resultado: number; margen: number }
  sincronizacion: { ultima: Date | null; horasDesde: number | null; atrasada: boolean }
}

export async function calcularTablero(
  periodo: Periodo,
  unidadNegocioId?: string,
): Promise<DatosTablero> {
  const obras = await db.obra.findMany({
    where: unidadNegocioId ? { unidadNegocioId } : {},
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
      presupuestoManoObra: true,
      unidadNegocioId: true,
      unidadNegocio: { select: { id: true, nombre: true, orden: true } },
    },
  })

  const obraIds = obras.map((o) => o.id)

  // El período anterior, del mismo largo, para la comparación.
  const largo = periodo.hasta.getTime() - periodo.desde.getTime()
  const periodoAnterior: Periodo = {
    desde: new Date(periodo.desde.getTime() - largo),
    hasta: new Date(periodo.desde.getTime() - 1),
    etiqueta: 'Período anterior',
  }

  const [costos, costosAnteriores, ultimaSync] = await Promise.all([
    costosPorObra(periodo, obraIds),
    costosPorObra(periodoAnterior, obraIds),
    db.registroSync.findFirst({
      where: { estado: 'OK' },
      orderBy: { inicio: 'desc' },
      select: { inicio: true },
    }),
  ])

  // --- Las obras, con su costo ---
  const obrasTablero: ObraTablero[] = obras.map((o) => {
    const costo = costos.get(o.id) ?? {
      obraId: o.id,
      ingresos: 0,
      materiales: 0,
      subcontratos: 0,
      equipos: 0,
      otrosExternos: 0,
      manoObra: 0,
      viaticos: 0,
      vehiculos: 0,
      herramientas: 0,
      costoTotal: 0,
      resultado: 0,
      margen: 0,
      origen: { movimientos: 0, partes: 0, viajes: 0, herramientas: 0 },
    }

    const presupuesto = o.presupuestoManoObra
      ? Number(o.presupuestoManoObra)
      : null

    return {
      ...costo,
      codigo: o.codigo,
      nombre: o.nombre,
      estado: o.estado,
      unidadNegocio: o.unidadNegocio.nombre,
      unidadNegocioId: o.unidadNegocioId,
      presupuestoManoObra: presupuesto,
      // El consumo se mide sobre TODO lo gastado en la obra, no solo el
      // período: un presupuesto se consume una sola vez.
      consumoPresupuesto: null,
    }
  })

  // El consumo del presupuesto necesita el acumulado histórico.
  const acumulado = await db.parteDiario.groupBy({
    by: ['obraId'],
    where: { estado: EstadoParte.APROBADO, obraId: { in: obraIds } },
    _count: true,
  })
  if (acumulado.length > 0) {
    const lineas = await db.parteDiarioLinea.findMany({
      where: {
        parte: { estado: EstadoParte.APROBADO, obraId: { in: obraIds } },
      },
      select: { costoCalculado: true, parte: { select: { obraId: true } } },
    })

    const gastadoTotal = new Map<string, number>()
    for (const l of lineas) {
      gastadoTotal.set(
        l.parte.obraId,
        (gastadoTotal.get(l.parte.obraId) ?? 0) + Number(l.costoCalculado ?? 0),
      )
    }

    for (const obra of obrasTablero) {
      if (!obra.presupuestoManoObra || obra.presupuestoManoObra <= 0) continue
      obra.consumoPresupuesto =
        (gastadoTotal.get(obra.obraId) ?? 0) / obra.presupuestoManoObra
    }
  }

  // --- Totales de la empresa ---
  const ingresos = obrasTablero.reduce((a, o) => a + o.ingresos, 0)
  const costoTotal = obrasTablero.reduce((a, o) => a + o.costoTotal, 0)
  const estructura = await gastosDeEstructura(periodo, ingresos)

  const resultado = ingresos - costoTotal

  // --- Por unidad de negocio ---
  const porUnidad = new Map<string, ResumenUnidad>()
  for (const o of obrasTablero) {
    const actual = porUnidad.get(o.unidadNegocioId) ?? {
      unidadId: o.unidadNegocioId,
      nombre: o.unidadNegocio,
      ingresos: 0,
      costoTotal: 0,
      resultado: 0,
      margen: 0,
      obras: 0,
    }
    actual.ingresos += o.ingresos
    actual.costoTotal += o.costoTotal
    actual.obras += 1
    porUnidad.set(o.unidadNegocioId, actual)
  }
  for (const u of porUnidad.values()) {
    u.resultado = u.ingresos - u.costoTotal
    u.margen = u.ingresos > 0 ? u.resultado / u.ingresos : 0
  }

  // --- Período anterior ---
  let ingresosAnterior = 0
  let costoAnterior = 0
  for (const c of costosAnteriores.values()) {
    ingresosAnterior += c.ingresos
    costoAnterior += c.costoTotal
  }

  const horasDesde = ultimaSync
    ? (Date.now() - ultimaSync.inicio.getTime()) / 3_600_000
    : null

  return {
    periodo,
    empresa: {
      ingresos,
      costoTotal,
      resultado,
      margen: ingresos > 0 ? resultado / ingresos : 0,
      estructura,
      resultadoNeto: resultado - estructura.total,
      margenNeto: ingresos > 0 ? (resultado - estructura.total) / ingresos : 0,
    },
    unidades: [...porUnidad.values()].sort((a, b) => b.ingresos - a.ingresos),
    obras: obrasTablero
      .filter((o) => o.ingresos > 0 || o.costoTotal > 0)
      .sort((a, b) => b.ingresos - a.ingresos),
    anterior: {
      ingresos: ingresosAnterior,
      costoTotal: costoAnterior,
      resultado: ingresosAnterior - costoAnterior,
      margen:
        ingresosAnterior > 0
          ? (ingresosAnterior - costoAnterior) / ingresosAnterior
          : 0,
    },
    sincronizacion: {
      ultima: ultimaSync?.inicio ?? null,
      horasDesde,
      // Un tablero con datos viejos es peor que no tener tablero.
      atrasada: horasDesde === null || horasDesde > 6,
    },
  }
}

/* ----------------------- EVOLUCIÓN MENSUAL -------------------------- */

export interface MesDeObra {
  mes: string
  etiqueta: string
  ingresos: number
  costos: number
  resultado: number
}

/** La evolución mensual de una obra, para el gráfico de líneas. */
export async function evolucionMensual(
  obraId: string,
  meses = 6,
): Promise<MesDeObra[]> {
  const hoy = new Date()
  const salida: MesDeObra[] = []

  for (let i = meses - 1; i >= 0; i--) {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 0)
    hasta.setHours(23, 59, 59, 999)

    const costos = await costosPorObra(
      { desde, hasta, etiqueta: '' },
      [obraId],
    )
    const c = costos.get(obraId)

    salida.push({
      mes: `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}`,
      etiqueta: desde.toLocaleDateString('es-AR', { month: 'short' }),
      ingresos: c?.ingresos ?? 0,
      costos: c?.costoTotal ?? 0,
      resultado: (c?.ingresos ?? 0) - (c?.costoTotal ?? 0),
    })
  }

  return salida
}

/* ------------------------ PERÍODOS ARMADOS -------------------------- */

export type ClavePeriodo =
  | 'este-mes'
  | 'mes-anterior'
  | 'ultimos-3-meses'
  | 'este-ano'
  | 'personalizado'

export function armarPeriodo(
  clave: ClavePeriodo,
  desdeTexto?: string,
  hastaTexto?: string,
): Periodo {
  const hoy = new Date()
  const finDeHoy = new Date(hoy)
  finDeHoy.setHours(23, 59, 59, 999)

  switch (clave) {
    case 'mes-anterior': {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      hasta.setHours(23, 59, 59, 999)
      return {
        desde,
        hasta,
        etiqueta: desde.toLocaleDateString('es-AR', {
          month: 'long',
          year: 'numeric',
        }),
      }
    }

    case 'ultimos-3-meses': {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
      return { desde, hasta: finDeHoy, etiqueta: 'Últimos 3 meses' }
    }

    case 'este-ano': {
      const desde = new Date(hoy.getFullYear(), 0, 1)
      return { desde, hasta: finDeHoy, etiqueta: String(hoy.getFullYear()) }
    }

    case 'personalizado': {
      const desde = desdeTexto ? new Date(`${desdeTexto}T00:00:00`) : null
      const hasta = hastaTexto ? new Date(`${hastaTexto}T23:59:59`) : null
      if (desde && hasta && !Number.isNaN(desde.getTime()) && !Number.isNaN(hasta.getTime())) {
        return {
          desde,
          hasta,
          etiqueta: `${desde.toLocaleDateString('es-AR')} al ${hasta.toLocaleDateString('es-AR')}`,
        }
      }
      // Fechas inválidas: se cae a este mes en vez de romper.
      break
    }
  }

  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  return {
    desde,
    hasta: finDeHoy,
    etiqueta: desde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
  }
}
