import 'server-only'

import {
  EstadoSolicitudViaje,
  EstadoVehiculo,
  EstadoViaje,
  TipoDocumentoEmpleado,
  TipoVehiculo,
} from '@prisma/client'
import { db } from '@/lib/db'
import type { Sesion } from '@/lib/auth/token'
import { obrasDeLaSesion } from '@/lib/auth/obras'
import {
  DOCUMENTOS_BLOQUEANTES,
  consumoAnormal,
  consumoPromedio,
  proponerVehiculos,
  proximoService,
  type ChoferParaAsignar,
  type VehiculoParaAsignar,
} from './reglas'

function hoyCero(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function manana(): Date {
  const d = hoyCero()
  d.setDate(d.getDate() + 1)
  return d
}

/* ------------------------------ FLOTA ------------------------------- */

export interface ResumenFlota {
  disponibles: number
  enViaje: number
  enTaller: number
  fueraDeServicio: number
  total: number
  conDocumentoVencido: number
}

export async function resumenFlota(): Promise<ResumenFlota> {
  const hoy = hoyCero()

  const [porEstado, conVencidos] = await Promise.all([
    db.vehiculo.groupBy({
      by: ['estado'],
      where: { estado: { not: EstadoVehiculo.VENDIDO } },
      _count: true,
    }),
    db.vehiculo.count({
      where: {
        estado: { not: EstadoVehiculo.VENDIDO },
        documentos: {
          some: {
            tipo: { in: DOCUMENTOS_BLOQUEANTES },
            vencimiento: { lt: hoy },
          },
        },
      },
    }),
  ])

  const cuenta = (e: EstadoVehiculo) =>
    porEstado.find((p) => p.estado === e)?._count ?? 0

  return {
    disponibles: cuenta(EstadoVehiculo.DISPONIBLE),
    enViaje: cuenta(EstadoVehiculo.EN_VIAJE),
    enTaller: cuenta(EstadoVehiculo.EN_TALLER),
    fueraDeServicio: cuenta(EstadoVehiculo.FUERA_DE_SERVICIO),
    total: porEstado.reduce((a, p) => a + p._count, 0),
    conDocumentoVencido: conVencidos,
  }
}

export interface VehiculoDeLista {
  id: string
  patente: string
  interno: string | null
  tipo: TipoVehiculo
  marca: string
  modelo: string
  estado: EstadoVehiculo
  capacidadCargaKg: number | null
  kmActual: number
  chofer: string | null
  documentosVencidos: number
  /** Si está en viaje: a dónde y para qué obra. */
  viajeActual: { destino: string; obra: string | null; desde: Date } | null
  serviceUrgente: boolean
}

export async function listarVehiculos(): Promise<VehiculoDeLista[]> {
  const hoy = hoyCero()

  const vehiculos = await db.vehiculo.findMany({
    where: { estado: { not: EstadoVehiculo.VENDIDO } },
    select: {
      id: true,
      patente: true,
      interno: true,
      tipo: true,
      marca: true,
      modelo: true,
      estado: true,
      capacidadCargaKg: true,
      kmActual: true,
      choferHabitual: { select: { nombre: true, apellido: true } },
      documentos: {
        where: { vencimiento: { lt: hoy } },
        select: { id: true, tipo: true },
      },
      viajes: {
        where: { estado: EstadoViaje.EN_CURSO },
        select: {
          destino: true,
          salidaReal: true,
          salidaPrevista: true,
          obra: { select: { codigo: true } },
        },
        take: 1,
      },
      mantenimientos: {
        where: { OR: [{ proximoKm: { not: null } }, { proximaFecha: { not: null } }] },
        select: { proximoKm: true, proximaFecha: true },
        orderBy: { fecha: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ tipo: 'asc' }, { patente: 'asc' }],
  })

  return vehiculos.map((v) => {
    const service = v.mantenimientos[0]
      ? proximoService(
          v.kmActual,
          v.mantenimientos[0].proximoKm,
          v.mantenimientos[0].proximaFecha,
        )
      : null

    const enViaje = v.viajes[0]

    return {
      id: v.id,
      patente: v.patente,
      interno: v.interno,
      tipo: v.tipo,
      marca: v.marca,
      modelo: v.modelo,
      estado: v.estado,
      capacidadCargaKg: v.capacidadCargaKg,
      kmActual: v.kmActual,
      chofer: v.choferHabitual
        ? `${v.choferHabitual.nombre} ${v.choferHabitual.apellido}`
        : null,
      documentosVencidos: v.documentos.filter((d) =>
        DOCUMENTOS_BLOQUEANTES.includes(d.tipo),
      ).length,
      viajeActual: enViaje
        ? {
            destino: enViaje.destino,
            obra: enViaje.obra?.codigo ?? null,
            desde: enViaje.salidaReal ?? enViaje.salidaPrevista,
          }
        : null,
      serviceUrgente: service?.urgente ?? false,
    }
  })
}

/* ------------------------------ FICHA ------------------------------- */

export async function obtenerVehiculo(id: string) {
  return db.vehiculo.findUnique({
    where: { id },
    include: {
      choferHabitual: {
        select: { id: true, nombre: true, apellido: true, legajo: true },
      },
      documentos: { orderBy: { vencimiento: 'asc' } },
      viajes: {
        include: {
          chofer: { select: { nombre: true, apellido: true } },
          obra: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { salidaPrevista: 'desc' },
        take: 30,
      },
      cargas: {
        include: { chofer: { select: { nombre: true, apellido: true } } },
        orderBy: { fecha: 'desc' },
        take: 30,
      },
      mantenimientos: { orderBy: { fecha: 'desc' } },
      incidentes: {
        include: { chofer: { select: { nombre: true, apellido: true } } },
        orderBy: { fecha: 'desc' },
      },
    },
  })
}

export type VehiculoFicha = NonNullable<
  Awaited<ReturnType<typeof obtenerVehiculo>>
>

/** Los números de la ficha: consumo, service y costo del mes. */
export async function indicadoresVehiculo(id: string) {
  const ahora = new Date()
  const inicioDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [vehiculo, cargas, ultimoMantenimiento, combustibleMes, mantenimientoMes, incidentesMes, viajesMes] =
    await Promise.all([
      db.vehiculo.findUnique({
        where: { id },
        select: { kmActual: true, costoKmEstimado: true },
      }),
      db.cargaCombustible.findMany({
        where: { vehiculoId: id },
        select: { fecha: true, litros: true, km: true },
        orderBy: { fecha: 'desc' },
        take: 20,
      }),
      db.mantenimientoVehiculo.findFirst({
        where: {
          vehiculoId: id,
          OR: [{ proximoKm: { not: null } }, { proximaFecha: { not: null } }],
        },
        select: { proximoKm: true, proximaFecha: true },
        orderBy: { fecha: 'desc' },
      }),
      db.cargaCombustible.aggregate({
        _sum: { monto: true },
        where: { vehiculoId: id, fecha: { gte: inicioDelMes } },
      }),
      db.mantenimientoVehiculo.aggregate({
        _sum: { costo: true },
        where: { vehiculoId: id, fecha: { gte: inicioDelMes } },
      }),
      db.incidenteVehiculo.aggregate({
        _sum: { monto: true },
        where: { vehiculoId: id, fecha: { gte: inicioDelMes } },
      }),
      db.viaje.aggregate({
        _count: true,
        _sum: { costoCalculado: true },
        where: {
          vehiculoId: id,
          estado: EstadoViaje.FINALIZADO,
          salidaPrevista: { gte: inicioDelMes },
        },
      }),
    ])

  const listaCargas = cargas.map((c) => ({
    fecha: c.fecha,
    litros: Number(c.litros),
    km: c.km,
  }))

  const costoCombustible = Number(combustibleMes._sum.monto ?? 0)
  const costoMantenimiento = Number(mantenimientoMes._sum.costo ?? 0)
  const costoIncidentes = Number(incidentesMes._sum.monto ?? 0)

  return {
    consumo: consumoPromedio(listaCargas),
    consumoAnormal: consumoAnormal(listaCargas),
    service: vehiculo
      ? proximoService(
          vehiculo.kmActual,
          ultimoMantenimiento?.proximoKm ?? null,
          ultimoMantenimiento?.proximaFecha ?? null,
        )
      : null,
    costoDelMes: {
      combustible: costoCombustible,
      mantenimiento: costoMantenimiento,
      incidentes: costoIncidentes,
      total: costoCombustible + costoMantenimiento + costoIncidentes,
    },
    viajesDelMes: viajesMes._count,
    costoViajesDelMes: Number(viajesMes._sum.costoCalculado ?? 0),
  }
}

/* --------------------------- SOLICITUDES ---------------------------- */

export async function listarSolicitudesViaje(
  sesion: Sesion,
  estado?: EstadoSolicitudViaje,
) {
  const ids = await obrasDeLaSesion(sesion)

  return db.solicitudViaje.findMany({
    where: {
      ...(ids === null ? {} : { obraId: { in: ids } }),
      ...(estado ? { estado } : {}),
    },
    include: {
      obra: { select: { id: true, codigo: true, nombre: true } },
      solicitante: { select: { nombre: true } },
      viaje: { select: { id: true, estado: true } },
    },
    orderBy: [{ estado: 'asc' }, { prioridad: 'desc' }, { fechaHoraNecesaria: 'asc' }],
  })
}

export async function obtenerSolicitudViaje(id: string) {
  return db.solicitudViaje.findUnique({
    where: { id },
    include: {
      obra: { select: { id: true, codigo: true, nombre: true, direccion: true } },
      solicitante: { select: { nombre: true } },
      viaje: {
        include: {
          vehiculo: { select: { patente: true, marca: true, modelo: true } },
          chofer: { select: { nombre: true, apellido: true } },
        },
      },
    },
  })
}

/**
 * Los vehículos que sirven para un pedido, ya ordenados y con el motivo
 * de bloqueo de cada uno que no sirve.
 */
export async function vehiculosParaElPedido(pedido: {
  pesoCargaKg: number | null
  cantidadPersonas: number | null
  salidaPrevista: Date
}) {
  const hoy = hoyCero()

  // Ventana de solapamiento: un viaje ocupa el vehículo unas 4 horas.
  const desde = new Date(pedido.salidaPrevista.getTime() - 4 * 3_600_000)
  const hasta = new Date(pedido.salidaPrevista.getTime() + 4 * 3_600_000)

  const vehiculos = await db.vehiculo.findMany({
    where: { estado: { not: EstadoVehiculo.VENDIDO } },
    select: {
      id: true,
      patente: true,
      tipo: true,
      marca: true,
      modelo: true,
      estado: true,
      capacidadCargaKg: true,
      cantidadPasajeros: true,
      costoKmEstimado: true,
      documentos: {
        where: {
          tipo: { in: DOCUMENTOS_BLOQUEANTES },
          vencimiento: { lt: hoy },
        },
        select: { tipo: true, vencimiento: true },
      },
      viajes: {
        where: {
          estado: { in: [EstadoViaje.PROGRAMADO, EstadoViaje.EN_CURSO] },
          salidaPrevista: { gte: desde, lte: hasta },
        },
        select: { id: true, destino: true, salidaPrevista: true },
      },
    },
  })

  const paraEvaluar: VehiculoParaAsignar[] = vehiculos.map((v) => ({
    id: v.id,
    patente: v.patente,
    tipo: v.tipo,
    marca: v.marca,
    modelo: v.modelo,
    estado: v.estado,
    capacidadCargaKg: v.capacidadCargaKg,
    cantidadPasajeros: v.cantidadPasajeros,
    costoKmEstimado: v.costoKmEstimado ? Number(v.costoKmEstimado) : null,
    documentosVencidos: v.documentos,
    viajesSuperpuestos: v.viajes.map((x) => ({
      id: x.id,
      destino: x.destino,
      salida: x.salidaPrevista,
    })),
  }))

  return proponerVehiculos(paraEvaluar, pedido)
}

/** Los choferes con su estado de licencia y sus viajes del horario. */
export async function choferesParaElPedido(
  salidaPrevista: Date,
): Promise<ChoferParaAsignar[]> {
  const desde = new Date(salidaPrevista.getTime() - 4 * 3_600_000)
  const hasta = new Date(salidaPrevista.getTime() + 4 * 3_600_000)

  const choferes = await db.empleado.findMany({
    where: {
      activo: true,
      OR: [{ categoria: 'CHOFER' }, { vehiculosHabituales: { some: {} } }],
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      documentos: {
        where: { tipo: TipoDocumentoEmpleado.LICENCIA_CONDUCIR },
        select: { vencimiento: true },
        orderBy: { vencimiento: 'desc' },
        take: 1,
      },
      viajes: {
        where: {
          estado: { in: [EstadoViaje.PROGRAMADO, EstadoViaje.EN_CURSO] },
          salidaPrevista: { gte: desde, lte: hasta },
        },
        select: { id: true, destino: true, salidaPrevista: true },
      },
    },
    orderBy: { apellido: 'asc' },
  })

  return choferes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    licenciaVence: c.documentos[0]?.vencimiento ?? null,
    viajesSuperpuestos: c.viajes.map((v) => ({
      id: v.id,
      destino: v.destino,
      salida: v.salidaPrevista,
    })),
  }))
}

/* ------------------------------ VIAJES ------------------------------ */

export async function obtenerViaje(id: string) {
  return db.viaje.findUnique({
    where: { id },
    include: {
      vehiculo: {
        select: {
          id: true,
          patente: true,
          marca: true,
          modelo: true,
          kmActual: true,
          costoKmEstimado: true,
        },
      },
      chofer: { select: { id: true, nombre: true, apellido: true } },
      obra: { select: { id: true, codigo: true, nombre: true } },
      solicitud: { select: { id: true, descripcionCarga: true } },
    },
  })
}

/** La agenda del día: los vehículos en filas y sus viajes como bloques. */
export async function agendaDelDia(fecha: Date) {
  const desde = new Date(fecha)
  desde.setHours(0, 0, 0, 0)
  const hasta = new Date(desde)
  hasta.setDate(hasta.getDate() + 1)

  const vehiculos = await db.vehiculo.findMany({
    where: { estado: { not: EstadoVehiculo.VENDIDO } },
    select: {
      id: true,
      patente: true,
      tipo: true,
      marca: true,
      modelo: true,
      estado: true,
      capacidadCargaKg: true,
      viajes: {
        where: { salidaPrevista: { gte: desde, lt: hasta } },
        select: {
          id: true,
          tipo: true,
          estado: true,
          destino: true,
          salidaPrevista: true,
          salidaReal: true,
          llegadaReal: true,
          pesoCargaKg: true,
          chofer: { select: { nombre: true, apellido: true } },
          obra: { select: { codigo: true } },
        },
        orderBy: { salidaPrevista: 'asc' },
      },
    },
    orderBy: [{ tipo: 'asc' }, { patente: 'asc' }],
  })

  return vehiculos
}

/** Qué está haciendo cada vehículo ahora mismo. */
export async function queHaceCadaUno() {
  const vehiculos = await db.vehiculo.findMany({
    where: { estado: { not: EstadoVehiculo.VENDIDO } },
    select: {
      id: true,
      patente: true,
      tipo: true,
      marca: true,
      modelo: true,
      estado: true,
      kmActual: true,
      tieneGps: true,
      choferHabitual: { select: { nombre: true, apellido: true } },
      viajes: {
        where: { estado: EstadoViaje.EN_CURSO },
        select: {
          id: true,
          destino: true,
          origen: true,
          salidaReal: true,
          salidaPrevista: true,
          descripcionCarga: true,
          chofer: { select: { nombre: true, apellido: true } },
          obra: { select: { id: true, codigo: true, nombre: true } },
        },
        take: 1,
      },
      mantenimientos: {
        where: { proximaFecha: { not: null } },
        select: { descripcion: true, taller: true },
        orderBy: { fecha: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ estado: 'asc' }, { patente: 'asc' }],
  })

  return vehiculos
}

/** Los viajes de un chofer: su pantalla. */
export async function viajesDelChofer(empleadoId: string) {
  const hoy = hoyCero()
  const finDeHoy = manana()

  const viajes = await db.viaje.findMany({
    where: {
      choferId: empleadoId,
      OR: [
        { estado: { in: [EstadoViaje.PROGRAMADO, EstadoViaje.EN_CURSO] } },
        { estado: EstadoViaje.FINALIZADO, llegadaReal: { gte: hoy } },
      ],
    },
    include: {
      vehiculo: {
        select: { id: true, patente: true, marca: true, modelo: true, kmActual: true },
      },
      obra: { select: { id: true, codigo: true, nombre: true } },
    },
    orderBy: { salidaPrevista: 'asc' },
  })

  return viajes.map((v) => ({
    ...v,
    esDeHoy: v.salidaPrevista >= hoy && v.salidaPrevista < finDeHoy,
    costoCalculado: v.costoCalculado ? Number(v.costoCalculado) : null,
    peajes: v.peajes ? Number(v.peajes) : null,
  }))
}

/* -------------------------- VENCIMIENTOS ---------------------------- */

export async function vencimientosDeFlota() {
  const hoy = hoyCero()
  const en60 = new Date(hoy)
  en60.setDate(en60.getDate() + 60)

  const [documentos, licencias] = await Promise.all([
    db.documentoVehiculo.findMany({
      where: { vencimiento: { lte: en60 } },
      include: {
        vehiculo: { select: { id: true, patente: true, marca: true, modelo: true } },
      },
      orderBy: { vencimiento: 'asc' },
    }),
    db.documentoEmpleado.findMany({
      where: {
        tipo: TipoDocumentoEmpleado.LICENCIA_CONDUCIR,
        vencimiento: { lte: en60 },
        empleado: { activo: true },
      },
      include: {
        empleado: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { vencimiento: 'asc' },
    }),
  ])

  return { documentos, licencias }
}

/* ------------------------- LISTAS AUXILIARES ------------------------ */

export async function vehiculosActivos() {
  return db.vehiculo.findMany({
    where: { estado: { not: EstadoVehiculo.VENDIDO } },
    select: { id: true, patente: true, marca: true, modelo: true, kmActual: true },
    orderBy: { patente: 'asc' },
  })
}

export async function choferesActivos() {
  return db.empleado.findMany({
    where: {
      activo: true,
      OR: [{ categoria: 'CHOFER' }, { vehiculosHabituales: { some: {} } }],
    },
    select: { id: true, nombre: true, apellido: true, legajo: true },
    orderBy: { apellido: 'asc' },
  })
}
