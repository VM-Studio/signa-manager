import 'server-only'

import { EstadoViaje } from '@prisma/client'
import { db } from '@/lib/db'

/* =====================================================================
   Cálculos de flota. Los usa la ficha de obra y el tablero del dueño.
   ===================================================================== */

/** Costo de vehículos imputado a cada obra en un período. */
export async function costoVehiculosPorObra(
  desde: Date,
  hasta: Date,
  obraIds?: string[],
): Promise<Map<string, { costo: number; viajes: number }>> {
  const grupos = await db.viaje.groupBy({
    by: ['obraId'],
    where: {
      estado: EstadoViaje.FINALIZADO,
      obraId: { not: null },
      ...(obraIds ? { obraId: { in: obraIds } } : {}),
      salidaPrevista: { gte: desde, lte: hasta },
    },
    _sum: { costoCalculado: true },
    _count: true,
  })

  const mapa = new Map<string, { costo: number; viajes: number }>()
  for (const g of grupos) {
    if (!g.obraId) continue
    mapa.set(g.obraId, {
      costo: Number(g._sum.costoCalculado ?? 0),
      viajes: g._count,
    })
  }
  return mapa
}

export async function costoVehiculosDeObra(
  obraId: string,
  desde: Date,
  hasta: Date,
): Promise<number> {
  const resultado = await db.viaje.aggregate({
    _sum: { costoCalculado: true },
    where: {
      obraId,
      estado: EstadoViaje.FINALIZADO,
      salidaPrevista: { gte: desde, lte: hasta },
    },
  })
  return Number(resultado._sum.costoCalculado ?? 0)
}

/**
 * Costo por kilómetro REAL de cada vehículo, contra el estimado.
 * Sale de lo que de verdad se gastó: combustible, service e incidentes,
 * dividido los kilómetros que hizo.
 */
export async function costoPorKmReal(
  desde: Date,
  hasta: Date,
): Promise<
  Array<{
    vehiculoId: string
    patente: string
    kmRecorridos: number
    costoTotal: number
    costoPorKm: number | null
    costoEstimado: number | null
  }>
> {
  const vehiculos = await db.vehiculo.findMany({
    where: { estado: { not: 'VENDIDO' } },
    select: {
      id: true,
      patente: true,
      costoKmEstimado: true,
      viajes: {
        where: {
          estado: EstadoViaje.FINALIZADO,
          salidaPrevista: { gte: desde, lte: hasta },
          kmSalida: { not: null },
          kmLlegada: { not: null },
        },
        select: { kmSalida: true, kmLlegada: true, peajes: true },
      },
      cargas: {
        where: { fecha: { gte: desde, lte: hasta } },
        select: { monto: true },
      },
      mantenimientos: {
        where: { fecha: { gte: desde, lte: hasta } },
        select: { costo: true },
      },
      incidentes: {
        where: { fecha: { gte: desde, lte: hasta } },
        select: { monto: true },
      },
    },
  })

  return vehiculos.map((v) => {
    const kmRecorridos = v.viajes.reduce(
      (a, viaje) => a + ((viaje.kmLlegada as number) - (viaje.kmSalida as number)),
      0,
    )

    const costoTotal =
      v.cargas.reduce((a, c) => a + Number(c.monto), 0) +
      v.mantenimientos.reduce((a, m) => a + Number(m.costo ?? 0), 0) +
      v.incidentes.reduce((a, i) => a + Number(i.monto ?? 0), 0) +
      v.viajes.reduce((a, viaje) => a + Number(viaje.peajes ?? 0), 0)

    return {
      vehiculoId: v.id,
      patente: v.patente,
      kmRecorridos,
      costoTotal,
      costoPorKm: kmRecorridos > 0 ? costoTotal / kmRecorridos : null,
      costoEstimado: v.costoKmEstimado ? Number(v.costoKmEstimado) : null,
    }
  })
}

/**
 * Porcentaje de uso de la flota: cuántos vehículos estuvieron en viaje
 * sobre el total de jornadas disponibles del período.
 */
export async function usoDeLaFlota(
  desde: Date,
  hasta: Date,
): Promise<{ porcentaje: number; viajes: number; vehiculos: number; diasHabiles: number }> {
  const [vehiculos, viajes] = await Promise.all([
    db.vehiculo.count({ where: { estado: { not: 'VENDIDO' } } }),
    db.viaje.findMany({
      where: {
        estado: { in: [EstadoViaje.FINALIZADO, EstadoViaje.EN_CURSO] },
        salidaPrevista: { gte: desde, lte: hasta },
      },
      select: { vehiculoId: true, salidaPrevista: true },
    }),
  ])

  // Un vehículo "usado" en un día hábil cuenta una vez, aunque haga tres viajes.
  const jornadasUsadas = new Set(
    viajes.map(
      (v) => `${v.vehiculoId}|${v.salidaPrevista.toISOString().slice(0, 10)}`,
    ),
  ).size

  let diasHabiles = 0
  const cursor = new Date(desde)
  cursor.setHours(0, 0, 0, 0)
  while (cursor <= hasta) {
    const d = cursor.getDay()
    if (d !== 0 && d !== 6) diasHabiles += 1
    cursor.setDate(cursor.getDate() + 1)
  }

  const disponibles = vehiculos * diasHabiles

  return {
    porcentaje: disponibles > 0 ? (jornadasUsadas / disponibles) * 100 : 0,
    viajes: viajes.length,
    vehiculos,
    diasHabiles,
  }
}
