import 'server-only'

import {
  EstadoHerramienta,
  EstadoObra,
  EstadoParte,
  EstadoViaje,
  OrigenDato,
  Prisma,
} from '@prisma/client'
import { db } from '@/lib/db'
import { costoHerramientasDeObra } from '@/lib/calculos/herramientas'
import type { Sesion } from '@/lib/auth/token'
import { obrasDeLaSesion } from '@/lib/auth/obras'

/* =====================================================================
   Consultas del módulo de obras.
   Todas filtran por las obras que le corresponden a la sesión: un jefe
   de obra no ve las obras de otro ni cambiando el id en la URL.
   ===================================================================== */

export interface FiltrosObras {
  busqueda?: string
  estado?: EstadoObra
  unidadNegocioId?: string
}

export interface ObraDeLista {
  id: string
  codigo: string
  nombre: string
  estado: EstadoObra
  cliente: string | null
  localidad: string | null
  esInterior: boolean
  origen: OrigenDato
  unidadNegocio: string
  jefeObra: string | null
}

export async function listarObras(
  sesion: Sesion,
  filtros: FiltrosObras = {},
): Promise<ObraDeLista[]> {
  const ids = await obrasDeLaSesion(sesion)
  if (ids !== null && ids.length === 0) return []

  const busqueda = filtros.busqueda?.trim()

  const where: Prisma.ObraWhereInput = {
    ...(ids === null ? {} : { id: { in: ids } }),
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.unidadNegocioId
      ? { unidadNegocioId: filtros.unidadNegocioId }
      : {}),
    ...(busqueda
      ? {
          OR: [
            { codigo: { contains: busqueda, mode: 'insensitive' } },
            { nombre: { contains: busqueda, mode: 'insensitive' } },
            { cliente: { contains: busqueda, mode: 'insensitive' } },
            { localidad: { contains: busqueda, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const obras = await db.obra.findMany({
    where,
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
      cliente: true,
      localidad: true,
      esInterior: true,
      origen: true,
      unidadNegocio: { select: { nombre: true } },
      jefeObra: { select: { nombre: true } },
    },
    orderBy: [{ estado: 'asc' }, { codigo: 'desc' }],
  })

  return obras.map((o) => ({
    id: o.id,
    codigo: o.codigo,
    nombre: o.nombre,
    estado: o.estado,
    cliente: o.cliente,
    localidad: o.localidad,
    esInterior: o.esInterior,
    origen: o.origen,
    unidadNegocio: o.unidadNegocio.nombre,
    jefeObra: o.jefeObra?.nombre ?? null,
  }))
}

/** Cuántas obras hay por estado, para los chips de filtro. */
export async function contarPorEstado(
  sesion: Sesion,
): Promise<Record<EstadoObra, number>> {
  const ids = await obrasDeLaSesion(sesion)
  const grupos = await db.obra.groupBy({
    by: ['estado'],
    where: ids === null ? {} : { id: { in: ids } },
    _count: true,
  })

  const base: Record<EstadoObra, number> = {
    PLANIFICADA: 0,
    EN_CURSO: 0,
    PAUSADA: 0,
    FINALIZADA: 0,
  }
  for (const g of grupos) base[g.estado] = g._count
  return base
}

/* --------------------------- FICHA DE OBRA --------------------------- */

export type ObraFicha = NonNullable<Awaited<ReturnType<typeof obtenerObra>>>

export async function obtenerObra(sesion: Sesion, obraId: string) {
  const ids = await obrasDeLaSesion(sesion)
  if (ids !== null && !ids.includes(obraId)) return null

  return db.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      tipo: true,
      estado: true,
      cliente: true,
      direccion: true,
      localidad: true,
      provincia: true,
      esInterior: true,
      fechaInicio: true,
      fechaFinPrevista: true,
      fechaFinReal: true,
      presupuestoManoObra: true,
      presupuestoTotal: true,
      moneda: true,
      origen: true,
      idExterno: true,
      ultimaSync: true,
      creadoEn: true,
      unidadNegocioId: true,
      jefeObraId: true,
      unidadNegocio: { select: { id: true, nombre: true } },
      jefeObra: { select: { id: true, nombre: true, email: true } },
    },
  })
}

/** Lo gastado en mano de obra: solo partes aprobados (el costo congelado). */
export async function costoManoObra(obraId: string): Promise<number> {
  const resultado = await db.parteDiarioLinea.aggregate({
    _sum: { costoCalculado: true },
    where: { parte: { obraId, estado: EstadoParte.APROBADO } },
  })
  return Number(resultado._sum.costoCalculado ?? 0)
}

/* ------------------------- PESTAÑA · RESUMEN ------------------------- */

export interface ResumenObra {
  costoManoObra: number
  personasAsignadas: number
  herramientasEnObra: number
  valorHerramientas: number
  viajesDelMes: number
  pedidosPendientes: number
  partesSinAprobar: number
}

export async function resumenDeObra(obraId: string): Promise<ResumenObra> {
  const ahora = new Date()
  const inicioDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [
    manoObra,
    asignaciones,
    herramientas,
    viajes,
    pedidos,
    partes,
  ] = await Promise.all([
    costoManoObra(obraId),
    db.asignacionObra.findMany({
      where: {
        obraId,
        empleadoId: { not: null },
        desde: { lte: ahora },
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
      },
      select: { empleadoId: true },
      distinct: ['empleadoId'],
    }),
    db.herramienta.aggregate({
      where: { obraId, estado: EstadoHerramienta.EN_OBRA },
      _count: true,
      _sum: { valorCompra: true },
    }),
    db.viaje.count({
      where: { obraId, salidaPrevista: { gte: inicioDelMes } },
    }),
    db.pedidoCompraExterno.count({
      where: {
        obraId,
        estado: { in: ['PENDIENTE_APROBACION', 'APROBADO', 'COMPRADO'] },
      },
    }),
    db.parteDiario.count({ where: { obraId, estado: EstadoParte.ENVIADO } }),
  ])

  return {
    costoManoObra: manoObra,
    personasAsignadas: asignaciones.length,
    herramientasEnObra: herramientas._count,
    valorHerramientas: Number(herramientas._sum.valorCompra ?? 0),
    viajesDelMes: viajes,
    pedidosPendientes: pedidos,
    partesSinAprobar: partes,
  }
}

/* ------------------------- PESTAÑA · PERSONAL ------------------------ */

export async function personalDeObra(obraId: string) {
  const ahora = new Date()

  const [asignaciones, subcontratistas, ultimoParte] = await Promise.all([
    db.asignacionObra.findMany({
      where: {
        obraId,
        empleadoId: { not: null },
        desde: { lte: ahora },
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
      },
      select: {
        id: true,
        desde: true,
        tarea: true,
        empleado: {
          select: {
            id: true,
            legajo: true,
            nombre: true,
            apellido: true,
            categoria: true,
            especialidad: true,
          },
        },
      },
      orderBy: { empleado: { apellido: 'asc' } },
    }),
    db.asignacionObra.findMany({
      where: {
        obraId,
        subcontratistaId: { not: null },
        desde: { lte: ahora },
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
      },
      select: {
        id: true,
        subcontratista: {
          select: { id: true, razonSocial: true, rubro: true },
        },
      },
    }),
    db.parteDiario.findFirst({
      where: { obraId },
      orderBy: { fecha: 'desc' },
      select: {
        id: true,
        fecha: true,
        estado: true,
        _count: { select: { lineas: true } },
      },
    }),
  ])

  return {
    empleados: asignaciones
      .filter((a) => a.empleado !== null)
      .map((a) => ({
        asignacionId: a.id,
        desde: a.desde,
        tarea: a.tarea,
        ...a.empleado!,
      })),
    subcontratistas: subcontratistas
      .filter((a) => a.subcontratista !== null)
      .map((a) => a.subcontratista!),
    ultimoParte,
  }
}

/* ----------------------- PESTAÑA · HERRAMIENTAS ---------------------- */

export async function herramientasDeObra(obraId: string) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // El costo que la obra lleva pagado en herramientas este mes:
  // días en obra × costo diario imputable.
  const inicioDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const [unitarias, existencias, costoImputado] = await Promise.all([
    db.herramienta.findMany({
      where: { obraId, estado: EstadoHerramienta.EN_OBRA },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        marca: true,
        valorCompra: true,
        fechaDevolucionPrevista: true,
        categoria: { select: { nombre: true } },
        responsableActual: { select: { nombre: true, apellido: true } },
      },
      orderBy: { fechaDevolucionPrevista: 'asc' },
    }),
    db.existenciaHerramienta.findMany({
      where: { obraId, cantidad: { gt: 0 } },
      select: {
        id: true,
        cantidad: true,
        herramienta: { select: { id: true, codigo: true, nombre: true } },
      },
    }),
    costoHerramientasDeObra(obraId, inicioDelMes, hoy),
  ])

  return {
    unitarias: unitarias.map((h) => ({
      ...h,
      valorCompra: Number(h.valorCompra ?? 0),
      vencida:
        h.fechaDevolucionPrevista !== null && h.fechaDevolucionPrevista < hoy,
    })),
    existencias,
    costoImputado,
  }
}

/* ------------------------ PESTAÑA · VEHÍCULOS ------------------------ */

export async function vehiculosDeObra(obraId: string) {
  const ahora = new Date()
  const inicioDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [viajes, costoDelMes, solicitudesPendientes] = await Promise.all([
    db.viaje.findMany({
      where: { obraId },
      select: {
        id: true,
        tipo: true,
        estado: true,
        origen: true,
        destino: true,
        salidaPrevista: true,
        costoCalculado: true,
        vehiculo: { select: { patente: true, marca: true, modelo: true } },
        chofer: { select: { nombre: true, apellido: true } },
      },
      orderBy: { salidaPrevista: 'desc' },
      take: 25,
    }),
    db.viaje.aggregate({
      _sum: { costoCalculado: true },
      where: {
        obraId,
        estado: EstadoViaje.FINALIZADO,
        salidaPrevista: { gte: inicioDelMes },
      },
    }),
    db.solicitudViaje.count({ where: { obraId, estado: 'PENDIENTE' } }),
  ])

  return {
    viajes: viajes.map((v) => ({
      ...v,
      costoCalculado: Number(v.costoCalculado ?? 0),
    })),
    costoDelMes: Number(costoDelMes._sum.costoCalculado ?? 0),
    solicitudesPendientes,
  }
}

/* ------------------------- PESTAÑA · COMPRAS ------------------------- */

export interface PedidoDeObra {
  id: string
  numero: string | null
  descripcion: string
  proveedor: string | null
  solicitante: string | null
  estado: string
  monto: number | null
  fechaSolicitud: Date
  fechaNecesariaEnObra: Date | null
  fechaEntregaEstimada: Date | null
  fechaEntregaReal: Date | null
  /** Días de atraso contra la fecha en que tenía que estar en obra. */
  diasDeDemora: number | null
}

export async function comprasDeObra(obraId: string): Promise<PedidoDeObra[]> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const pedidos = await db.pedidoCompraExterno.findMany({
    where: { obraId },
    orderBy: [{ fechaSolicitud: 'desc' }],
  })

  return pedidos.map((p) => {
    let diasDeDemora: number | null = null

    if (p.fechaNecesariaEnObra) {
      // Si ya se entregó, la demora es contra la fecha de entrega real;
      // si no, contra hoy, porque la demora sigue corriendo.
      const referencia = p.fechaEntregaReal ?? hoy
      const dias = Math.round(
        (referencia.getTime() - p.fechaNecesariaEnObra.getTime()) / 86_400_000,
      )
      if (dias > 0) diasDeDemora = dias
    }

    return {
      id: p.id,
      numero: p.numero,
      descripcion: p.descripcion,
      proveedor: p.proveedor,
      solicitante: p.solicitante,
      estado: p.estado,
      monto: p.monto ? Number(p.monto) : null,
      fechaSolicitud: p.fechaSolicitud,
      fechaNecesariaEnObra: p.fechaNecesariaEnObra,
      fechaEntregaEstimada: p.fechaEntregaEstimada,
      fechaEntregaReal: p.fechaEntregaReal,
      diasDeDemora,
    }
  })
}

/* --------------------------- LISTAS AUXILIARES ----------------------- */

export async function unidadesActivas() {
  return db.unidadNegocio.findMany({
    where: { activa: true },
    select: { id: true, nombre: true, codigo: true },
    orderBy: { orden: 'asc' },
  })
}

export async function jefesDeObraDisponibles() {
  return db.usuario.findMany({
    where: { activo: true, rol: { in: ['JEFE_OBRA', 'ARQUITECTA', 'DUENO'] } },
    select: { id: true, nombre: true, rol: true },
    orderBy: { nombre: 'asc' },
  })
}
