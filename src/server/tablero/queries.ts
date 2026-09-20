import 'server-only'

import {
  EstadoAlerta,
  EstadoHerramienta,
  EstadoObra,
  EstadoVehiculo,
  EstadoViaje,
  Severidad,
} from '@prisma/client'
import { db } from '@/lib/db'
import { ausentismo } from '@/lib/calculos/personal'
import { comprasEvitadas } from '@/lib/calculos/herramientas'
import { usoDeLaFlota } from '@/lib/calculos/vehiculos'

/* =====================================================================
   El bloque "operación hoy" del tablero: lo que está pasando ahora
   mismo en la empresa, no en el período.
   ===================================================================== */

export interface OperacionHoy {
  personasTrabajando: number
  obrasConGente: number
  ausentismo: { porcentaje: number; ausencias: number; jornadas: number }
  vehiculosEnViaje: number
  usoFlota: number
  herramientasEnObra: number
  valorHerramientasEnObra: number
  comprasEvitadas: { cantidad: number; monto: number }
  alertasCriticas: number
  alertasAbiertas: number
}

export async function operacionHoy(
  desde: Date,
  hasta: Date,
): Promise<OperacionHoy> {
  const ahora = new Date()

  const [
    asignaciones,
    falta,
    enViaje,
    flota,
    herramientas,
    evitadas,
    criticas,
    abiertas,
  ] = await Promise.all([
    db.asignacionObra.findMany({
      where: {
        empleadoId: { not: null },
        desde: { lte: ahora },
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
        obra: { estado: EstadoObra.EN_CURSO },
      },
      select: { empleadoId: true, obraId: true },
    }),
    ausentismo(desde, hasta),
    db.vehiculo.count({ where: { estado: EstadoVehiculo.EN_VIAJE } }),
    usoDeLaFlota(desde, hasta),
    db.herramienta.aggregate({
      where: { estado: EstadoHerramienta.EN_OBRA },
      _count: true,
      _sum: { valorCompra: true },
    }),
    comprasEvitadas(desde, hasta),
    db.alerta.count({
      where: {
        severidad: Severidad.CRITICA,
        estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
      },
    }),
    db.alerta.count({
      where: { estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] } },
    }),
  ])

  return {
    personasTrabajando: new Set(asignaciones.map((a) => a.empleadoId)).size,
    obrasConGente: new Set(asignaciones.map((a) => a.obraId)).size,
    ausentismo: falta,
    vehiculosEnViaje: enViaje,
    usoFlota: flota.porcentaje,
    herramientasEnObra: herramientas._count,
    valorHerramientasEnObra: Number(herramientas._sum.valorCompra ?? 0),
    comprasEvitadas: evitadas,
    alertasCriticas: criticas,
    alertasAbiertas: abiertas,
  }
}

/* --------------------- DETALLE DE UNA OBRA -------------------------- */

/** Los pedidos demorados de una obra, para el detalle del tablero. */
export async function pedidosDemorados(obraId: string) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const pedidos = await db.pedidoCompraExterno.findMany({
    where: {
      obraId,
      fechaEntregaReal: null,
      OR: [
        { fechaNecesariaEnObra: { lt: hoy } },
        { estado: 'PENDIENTE_APROBACION' },
      ],
    },
    select: {
      id: true,
      numero: true,
      descripcion: true,
      estado: true,
      monto: true,
      proveedor: true,
      fechaSolicitud: true,
      fechaNecesariaEnObra: true,
      fechaEntregaEstimada: true,
    },
    orderBy: { fechaNecesariaEnObra: 'asc' },
  })

  return pedidos.map((p) => ({
    ...p,
    monto: p.monto ? Number(p.monto) : null,
    diasDeAtraso: p.fechaNecesariaEnObra
      ? Math.max(
          0,
          Math.round(
            (hoy.getTime() - p.fechaNecesariaEnObra.getTime()) / 86_400_000,
          ),
        )
      : 0,
  }))
}

/** Los viajes de una obra en el período. */
export async function viajesDeObraEnPeriodo(
  obraId: string,
  desde: Date,
  hasta: Date,
) {
  const resultado = await db.viaje.aggregate({
    where: {
      obraId,
      estado: EstadoViaje.FINALIZADO,
      salidaPrevista: { gte: desde, lte: hasta },
    },
    _count: true,
    _sum: { costoCalculado: true },
  })

  return {
    cantidad: resultado._count,
    costo: Number(resultado._sum.costoCalculado ?? 0),
  }
}

/* ----------------- DE DÓNDE SALE CADA NÚMERO ------------------------ */

export interface Explicacion {
  titulo: string
  lineas: Array<{ etiqueta: string; valor: string }>
  ultimaSync: Date | null
}

export type TipoCifra =
  | 'ingresos'
  | 'materiales'
  | 'manoObra'
  | 'vehiculos'
  | 'herramientas'

/**
 * De dónde sale una cifra del tablero.
 *
 * Cada número tiene que poder explicarse: si el dueño pregunta "¿de
 * dónde sale esto?", la app contesta con cuántos movimientos, cuántos
 * partes y cuántos viajes lo componen.
 */
export async function explicarCifra(
  tipo: TipoCifra,
  obraId: string | null,
  desde: Date,
  hasta: Date,
): Promise<Explicacion> {
  const ultimaSync = await db.registroSync.findFirst({
    where: { estado: 'OK' },
    orderBy: { inicio: 'desc' },
    select: { inicio: true },
  })

  const enElPeriodo = { gte: desde, lte: hasta }

  if (tipo === 'ingresos' || tipo === 'materiales') {
    const movimientos = await db.movimientoExterno.findMany({
      where: {
        ...(obraId ? { obraId } : { obraId: { not: null } }),
        fecha: enElPeriodo,
        tipo: tipo === 'ingresos' ? 'INGRESO' : 'EGRESO',
        ...(tipo === 'materiales' ? { categoria: 'MATERIALES' } : {}),
      },
      select: { moneda: true, fuente: true },
    })

    const enDolares = movimientos.filter((m) => m.moneda === 'USD').length

    return {
      titulo: tipo === 'ingresos' ? 'Ingresos' : 'Materiales',
      lineas: [
        {
          etiqueta: 'Movimientos del sistema base',
          valor: String(movimientos.length),
        },
        ...(enDolares > 0
          ? [
              {
                etiqueta: 'En dólares',
                valor: `${enDolares}, convertidos al tipo de cambio de cada uno`,
              },
            ]
          : []),
        { etiqueta: 'Fuente', valor: movimientos[0]?.fuente ?? 'sin datos' },
      ],
      ultimaSync: ultimaSync?.inicio ?? null,
    }
  }

  if (tipo === 'manoObra') {
    const partes = await db.parteDiario.findMany({
      where: {
        ...(obraId ? { obraId } : {}),
        estado: 'APROBADO',
        fecha: enElPeriodo,
      },
      select: { _count: { select: { lineas: true } } },
    })

    return {
      titulo: 'Mano de obra',
      lineas: [
        { etiqueta: 'Partes diarios aprobados', valor: String(partes.length) },
        {
          etiqueta: 'Jornadas registradas',
          valor: String(partes.reduce((a, p) => a + p._count.lineas, 0)),
        },
        {
          etiqueta: 'Cómo se calcula',
          valor:
            'horas × valor hora, congelado al aprobar el parte. Incluye los viáticos.',
        },
      ],
      ultimaSync: null,
    }
  }

  if (tipo === 'vehiculos') {
    const viajes = await db.viaje.count({
      where: {
        ...(obraId ? { obraId } : { obraId: { not: null } }),
        estado: 'FINALIZADO',
        salidaPrevista: enElPeriodo,
      },
    })

    return {
      titulo: 'Vehículos',
      lineas: [
        { etiqueta: 'Viajes finalizados', valor: String(viajes) },
        {
          etiqueta: 'Cómo se calcula',
          valor: 'kilómetros recorridos × costo por km + peajes',
        },
      ],
      ultimaSync: null,
    }
  }

  const enObra = await db.herramienta.count({
    where: {
      ...(obraId ? { obraId } : { obraId: { not: null } }),
      estado: 'EN_OBRA',
      costoDiarioImputable: { not: null },
    },
  })

  return {
    titulo: 'Herramientas',
    lineas: [
      {
        etiqueta: 'Herramientas con costo diario en obra',
        valor: String(enObra),
      },
      {
        etiqueta: 'Cómo se calcula',
        valor: 'días en la obra × costo diario imputable',
      },
    ],
    ultimaSync: null,
  }
}
