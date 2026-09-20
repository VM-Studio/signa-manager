import 'server-only'

import { Asistencia, EstadoParte } from '@prisma/client'
import { db } from '@/lib/db'

/* =====================================================================
   Cálculos de mano de obra.
   Los usa la ficha de obra, las quincenas y el tablero del dueño.
   Todo con consultas agregadas: nunca traer líneas de a una.
   ===================================================================== */

export interface CostoManoObra {
  costo: number
  horasNormales: number
  horasExtra50: number
  horasExtra100: number
  diasTrabajados: number
  ausencias: number
  personas: number
}

const VACIO: CostoManoObra = {
  costo: 0,
  horasNormales: 0,
  horasExtra50: 0,
  horasExtra100: 0,
  diasTrabajados: 0,
  ausencias: 0,
  personas: 0,
}

/**
 * Costo de mano de obra de una obra en un período.
 * Solo cuenta partes APROBADOS: ahí es donde el costo quedó congelado.
 */
export async function costoManoObraDeObra(
  obraId: string,
  desde?: Date,
  hasta?: Date,
): Promise<CostoManoObra> {
  const lineas = await db.parteDiarioLinea.findMany({
    where: {
      parte: {
        obraId,
        estado: EstadoParte.APROBADO,
        ...(desde || hasta
          ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
          : {}),
      },
    },
    select: {
      empleadoId: true,
      asistencia: true,
      horasNormales: true,
      horasExtra50: true,
      horasExtra100: true,
      costoCalculado: true,
    },
  })

  return acumular(lineas)
}

/** Lo mismo para varias obras de una, para el tablero. */
export async function costoManoObraPorObra(
  desde: Date,
  hasta: Date,
  obraIds?: string[],
): Promise<Map<string, CostoManoObra>> {
  const partes = await db.parteDiario.findMany({
    where: {
      estado: EstadoParte.APROBADO,
      fecha: { gte: desde, lte: hasta },
      ...(obraIds ? { obraId: { in: obraIds } } : {}),
    },
    select: {
      obraId: true,
      lineas: {
        select: {
          empleadoId: true,
          asistencia: true,
          horasNormales: true,
          horasExtra50: true,
          horasExtra100: true,
          costoCalculado: true,
        },
      },
    },
  })

  const porObra = new Map<string, typeof partes[number]['lineas']>()
  for (const p of partes) {
    const lista = porObra.get(p.obraId) ?? []
    lista.push(...p.lineas)
    porObra.set(p.obraId, lista)
  }

  const resultado = new Map<string, CostoManoObra>()
  for (const [obraId, lineas] of porObra) {
    resultado.set(obraId, acumular(lineas))
  }
  return resultado
}

type LineaCruda = {
  empleadoId: string
  asistencia: Asistencia
  horasNormales: unknown
  horasExtra50: unknown
  horasExtra100: unknown
  costoCalculado: unknown
}

function acumular(lineas: LineaCruda[]): CostoManoObra {
  if (lineas.length === 0) return { ...VACIO }

  const personas = new Set<string>()
  let costo = 0
  let normales = 0
  let extra50 = 0
  let extra100 = 0
  let dias = 0
  let ausencias = 0

  for (const l of lineas) {
    personas.add(l.empleadoId)
    costo += Number(l.costoCalculado ?? 0)
    normales += Number(l.horasNormales)
    extra50 += Number(l.horasExtra50)
    extra100 += Number(l.horasExtra100)

    if (l.asistencia === Asistencia.PRESENTE || l.asistencia === Asistencia.MEDIA_JORNADA) {
      dias += 1
    }
    if (
      l.asistencia === Asistencia.AUSENTE_CON_AVISO ||
      l.asistencia === Asistencia.AUSENTE_SIN_AVISO
    ) {
      ausencias += 1
    }
  }

  return {
    costo,
    horasNormales: normales,
    horasExtra50: extra50,
    horasExtra100: extra100,
    diasTrabajados: dias,
    ausencias,
    personas: personas.size,
  }
}

/** Qué porcentaje del presupuesto de mano de obra lleva consumido una obra. */
export async function consumoPresupuestoManoObra(
  obraId: string,
): Promise<{ gastado: number; presupuesto: number; fraccion: number } | null> {
  const obra = await db.obra.findUnique({
    where: { id: obraId },
    select: { presupuestoManoObra: true },
  })
  if (!obra?.presupuestoManoObra) return null

  const { costo } = await costoManoObraDeObra(obraId)
  const presupuesto = Number(obra.presupuestoManoObra)

  return {
    gastado: costo,
    presupuesto,
    fraccion: presupuesto > 0 ? costo / presupuesto : 0,
  }
}

/** Ausentismo del mes: qué porcentaje de las jornadas previstas se perdió. */
export async function ausentismo(
  desde: Date,
  hasta: Date,
): Promise<{ jornadas: number; ausencias: number; porcentaje: number }> {
  const grupos = await db.parteDiarioLinea.groupBy({
    by: ['asistencia'],
    where: {
      parte: { estado: EstadoParte.APROBADO, fecha: { gte: desde, lte: hasta } },
    },
    _count: true,
  })

  const total = grupos.reduce((a, g) => a + g._count, 0)
  const ausencias = grupos
    .filter(
      (g) =>
        g.asistencia === Asistencia.AUSENTE_CON_AVISO ||
        g.asistencia === Asistencia.AUSENTE_SIN_AVISO,
    )
    .reduce((a, g) => a + g._count, 0)

  return {
    jornadas: total,
    ausencias,
    porcentaje: total > 0 ? (ausencias / total) * 100 : 0,
  }
}

/** Horas por semana de una obra, para el detalle del tablero. */
export async function horasPorSemana(
  obraId: string,
  desde: Date,
  hasta: Date,
): Promise<Array<{ semana: string; horas: number }>> {
  const partes = await db.parteDiario.findMany({
    where: {
      obraId,
      estado: EstadoParte.APROBADO,
      fecha: { gte: desde, lte: hasta },
    },
    select: {
      fecha: true,
      lineas: {
        select: { horasNormales: true, horasExtra50: true, horasExtra100: true },
      },
    },
    orderBy: { fecha: 'asc' },
  })

  const porSemana = new Map<string, number>()

  for (const p of partes) {
    // Lunes de esa semana, como etiqueta del grupo.
    const lunes = new Date(p.fecha)
    const dia = lunes.getDay()
    lunes.setDate(lunes.getDate() - (dia === 0 ? 6 : dia - 1))
    const clave = lunes.toISOString().slice(0, 10)

    const horas = p.lineas.reduce(
      (a, l) =>
        a +
        Number(l.horasNormales) +
        Number(l.horasExtra50) +
        Number(l.horasExtra100),
      0,
    )
    porSemana.set(clave, (porSemana.get(clave) ?? 0) + horas)
  }

  return [...porSemana.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, horas]) => ({ semana, horas }))
}

/** Los viáticos de una obra en un período: suman al costo de mano de obra. */
export async function viaticosDeObra(
  obraId: string,
  desde: Date,
  hasta: Date,
): Promise<number> {
  const resultado = await db.novedadPersonal.aggregate({
    _sum: { monto: true },
    where: { obraId, tipo: 'VIATICO', fecha: { gte: desde, lte: hasta } },
  })
  return Number(resultado._sum.monto ?? 0)
}

/** Viáticos de todas las obras, para el tablero. */
export async function viaticosPorObra(
  desde: Date,
  hasta: Date,
): Promise<Map<string, number>> {
  const grupos = await db.novedadPersonal.groupBy({
    by: ['obraId'],
    where: {
      tipo: 'VIATICO',
      obraId: { not: null },
      fecha: { gte: desde, lte: hasta },
    },
    _sum: { monto: true },
  })

  const mapa = new Map<string, number>()
  for (const g of grupos) {
    if (g.obraId) mapa.set(g.obraId, Number(g._sum.monto ?? 0))
  }
  return mapa
}
