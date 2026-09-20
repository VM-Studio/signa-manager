import 'server-only'

import { EstadoHerramienta, TipoMovimientoHerramienta } from '@prisma/client'
import { db } from '@/lib/db'

/* =====================================================================
   Costo de herramientas imputable a una obra.

   Regla del prompt 5: días en obra × costo diario imputable.
   Vive acá porque el tablero (prompt 9) la va a usar igual que el
   módulo de herramientas.
   ===================================================================== */

export interface CostoHerramientasObra {
  obraId: string
  /** Suma de días × costo diario de cada herramienta que estuvo en la obra. */
  costo: number
  /** Cuántas herramientas con costo diario pasaron por la obra. */
  herramientas: number
  /** Total de días-herramienta acumulados. */
  diasTotales: number
}

/**
 * Cuántos días estuvo cada herramienta en cada obra dentro del período.
 *
 * Se reconstruye desde los movimientos, que son la única fuente de
 * verdad de dónde estuvo cada cosa: una herramienta entra a la obra con
 * SALIDA_A_OBRA o TRANSFERENCIA y sale con DEVOLUCION, TRANSFERENCIA,
 * ENVIO_A_REPARACION, EXTRAVIO o BAJA.
 */
export async function costoHerramientasPorObra(
  desde: Date,
  hasta: Date,
  obraIds?: string[],
): Promise<Map<string, CostoHerramientasObra>> {
  const movimientos = await db.movimientoHerramienta.findMany({
    where: {
      fecha: { lte: hasta },
      herramienta: { costoDiarioImputable: { not: null } },
      ...(obraIds
        ? {
            OR: [
              { destinoObraId: { in: obraIds } },
              { origenObraId: { in: obraIds } },
            ],
          }
        : {}),
    },
    select: {
      herramientaId: true,
      tipo: true,
      fecha: true,
      origenObraId: true,
      destinoObraId: true,
      herramienta: { select: { costoDiarioImputable: true } },
    },
    orderBy: [{ herramientaId: 'asc' }, { fecha: 'asc' }],
  })

  const resultado = new Map<string, CostoHerramientasObra>()
  const herramientasPorObra = new Map<string, Set<string>>()

  // Se recorre el historial de cada herramienta en orden y se van
  // cerrando tramos "estuvo en la obra X desde tal fecha hasta tal otra".
  let herramientaActual: string | null = null
  let obraActual: string | null = null
  let desdeCuando: Date | null = null
  let costoDiario = 0

  const cerrarTramo = (fin: Date) => {
    if (!obraActual || !desdeCuando || !herramientaActual) return
    if (obraIds && !obraIds.includes(obraActual)) return

    // El tramo se recorta al período pedido.
    const inicio = desdeCuando > desde ? desdeCuando : desde
    const final = fin < hasta ? fin : hasta
    if (final <= inicio) return

    const dias = Math.max(
      0,
      Math.round((final.getTime() - inicio.getTime()) / 86_400_000),
    )
    if (dias === 0) return

    const acumulado = resultado.get(obraActual) ?? {
      obraId: obraActual,
      costo: 0,
      herramientas: 0,
      diasTotales: 0,
    }
    acumulado.costo += dias * costoDiario
    acumulado.diasTotales += dias
    resultado.set(obraActual, acumulado)

    const set = herramientasPorObra.get(obraActual) ?? new Set<string>()
    set.add(herramientaActual)
    herramientasPorObra.set(obraActual, set)
  }

  for (const m of movimientos) {
    if (m.herramientaId !== herramientaActual) {
      // Cambió de herramienta: se cierra lo que quedara abierto.
      cerrarTramo(hasta)
      herramientaActual = m.herramientaId
      obraActual = null
      desdeCuando = null
      costoDiario = Number(m.herramienta.costoDiarioImputable ?? 0)
    }

    const entraAObra =
      m.tipo === TipoMovimientoHerramienta.SALIDA_A_OBRA ||
      m.tipo === TipoMovimientoHerramienta.TRANSFERENCIA

    if (obraActual) cerrarTramo(m.fecha)

    if (entraAObra && m.destinoObraId) {
      obraActual = m.destinoObraId
      desdeCuando = m.fecha
    } else {
      obraActual = null
      desdeCuando = null
    }
  }
  // La última herramienta puede seguir en obra hasta hoy.
  cerrarTramo(hasta)

  for (const [obraId, set] of herramientasPorObra) {
    const acumulado = resultado.get(obraId)
    if (acumulado) acumulado.herramientas = set.size
  }

  return resultado
}

/** El costo de herramientas de UNA obra en un período. */
export async function costoHerramientasDeObra(
  obraId: string,
  desde: Date,
  hasta: Date,
): Promise<number> {
  const mapa = await costoHerramientasPorObra(desde, hasta, [obraId])
  return mapa.get(obraId)?.costo ?? 0
}

/* ---------------------------------------------------------------------
   Compras evitadas: el número que le importa al dueño.
   --------------------------------------------------------------------- */

export interface ComprasEvitadas {
  cantidad: number
  /** Valor de compra de las herramientas que se prestaron en vez de comprar. */
  monto: number
}

export async function comprasEvitadas(
  desde: Date,
  hasta: Date,
): Promise<ComprasEvitadas> {
  const solicitudes = await db.solicitudHerramienta.findMany({
    where: {
      estado: 'RESUELTA_CON_STOCK',
      resueltaEn: { gte: desde, lte: hasta },
    },
    select: {
      id: true,
      movimientos: {
        select: { herramienta: { select: { valorCompra: true } } },
      },
    },
  })

  let monto = 0
  for (const s of solicitudes) {
    for (const m of s.movimientos) {
      monto += Number(m.herramienta.valorCompra ?? 0)
    }
  }

  return { cantidad: solicitudes.length, monto }
}

/** Valor del inventario parado en cada lugar. */
export async function valorPorUbicacion() {
  const [porDeposito, porObra, sinUbicacion] = await Promise.all([
    db.herramienta.groupBy({
      by: ['depositoId'],
      where: { depositoId: { not: null }, estado: { not: EstadoHerramienta.BAJA } },
      _count: true,
      _sum: { valorCompra: true },
    }),
    db.herramienta.groupBy({
      by: ['obraId'],
      where: { obraId: { not: null }, estado: { not: EstadoHerramienta.BAJA } },
      _count: true,
      _sum: { valorCompra: true },
    }),
    db.herramienta.aggregate({
      where: {
        depositoId: null,
        obraId: null,
        estado: { in: [EstadoHerramienta.EN_REPARACION, EstadoHerramienta.EXTRAVIADA] },
      },
      _count: true,
      _sum: { valorCompra: true },
    }),
  ])

  return { porDeposito, porObra, sinUbicacion }
}
