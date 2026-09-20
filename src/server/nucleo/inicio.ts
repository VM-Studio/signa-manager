import 'server-only'

import {
  EstadoAlerta,
  EstadoHerramienta,
  EstadoObra,
  EstadoParte,
  EstadoSolicitudHerramienta,
  EstadoSolicitudViaje,
  EstadoVehiculo,
  EstadoViaje,
  Severidad,
} from '@prisma/client'
import { db } from '@/lib/db'
import type { Sesion } from '@/lib/auth/sesion'
import { obrasDeLaSesion } from '@/lib/auth/obras'

/* =====================================================================
   Las consultas del inicio, una por rol.
   Cada una trae lo mínimo para que la primera pantalla conteste la
   pregunta que esa persona tiene cuando abre la app.
   ===================================================================== */

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

function enDias(dias: number): Date {
  const d = hoyCero()
  d.setDate(d.getDate() + dias)
  return d
}

/** El día hábil anterior a hoy. */
export function diaHabilAnterior(): Date {
  const d = hoyCero()
  do {
    d.setDate(d.getDate() - 1)
  } while (d.getDay() === 0 || d.getDay() === 6)
  return d
}

// --------------------------- DUEÑO Y ADMIN ---------------------------

export interface ResumenEmpresa {
  obrasEnCurso: number
  personasEnObra: number
  vehiculosEnViaje: number
  alertasCriticas: number
  herramientasEnObra: number
  solicitudesPendientes: number
}

export async function resumenEmpresa(): Promise<ResumenEmpresa> {
  const ahora = new Date()

  const [
    obrasEnCurso,
    asignaciones,
    vehiculosEnViaje,
    alertasCriticas,
    herramientasEnObra,
    solicitudesPendientes,
  ] = await Promise.all([
    db.obra.count({ where: { estado: EstadoObra.EN_CURSO } }),
    db.asignacionObra.findMany({
      where: {
        empleadoId: { not: null },
        desde: { lte: ahora },
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
        obra: { estado: EstadoObra.EN_CURSO },
      },
      select: { empleadoId: true },
      distinct: ['empleadoId'],
    }),
    db.vehiculo.count({ where: { estado: EstadoVehiculo.EN_VIAJE } }),
    db.alerta.count({
      where: {
        severidad: Severidad.CRITICA,
        estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
      },
    }),
    db.herramienta.count({ where: { estado: EstadoHerramienta.EN_OBRA } }),
    db.solicitudHerramienta.count({
      where: { estado: EstadoSolicitudHerramienta.PENDIENTE },
    }),
  ])

  return {
    obrasEnCurso,
    personasEnObra: asignaciones.length,
    vehiculosEnViaje,
    alertasCriticas,
    herramientasEnObra,
    solicitudesPendientes,
  }
}

// ----------------------- JEFE DE OBRA Y ARQUITECTA -------------------

export interface ObraDelInicio {
  id: string
  codigo: string
  nombre: string
  estado: EstadoObra
  localidad: string | null
  esInterior: boolean
  personas: number
  /** Cuántos partes suyos están esperando aprobación. */
  partesSinAprobar: number
  /** Si falta el parte del último día hábil. */
  faltaParteDeAyer: boolean
}

export async function misObras(sesion: Sesion): Promise<ObraDelInicio[]> {
  const ids = await obrasDeLaSesion(sesion)
  const ayer = diaHabilAnterior()
  const ahora = new Date()

  const obras = await db.obra.findMany({
    where: {
      ...(ids === null ? {} : { id: { in: ids } }),
      estado: { in: [EstadoObra.EN_CURSO, EstadoObra.PLANIFICADA, EstadoObra.PAUSADA] },
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
      localidad: true,
      esInterior: true,
    },
    orderBy: [{ estado: 'asc' }, { codigo: 'asc' }],
  })

  if (obras.length === 0) return []
  const obraIds = obras.map((o) => o.id)

  const [asignaciones, sinAprobar, partesDeAyer] = await Promise.all([
    db.asignacionObra.findMany({
      where: {
        obraId: { in: obraIds },
        empleadoId: { not: null },
        desde: { lte: ahora },
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
      },
      select: { obraId: true, empleadoId: true },
    }),
    db.parteDiario.groupBy({
      by: ['obraId'],
      where: { obraId: { in: obraIds }, estado: EstadoParte.ENVIADO },
      _count: true,
    }),
    db.parteDiario.findMany({
      where: { obraId: { in: obraIds }, fecha: ayer },
      select: { obraId: true },
    }),
  ])

  const personasPorObra = new Map<string, Set<string>>()
  for (const a of asignaciones) {
    if (!a.empleadoId) continue
    const set = personasPorObra.get(a.obraId) ?? new Set<string>()
    set.add(a.empleadoId)
    personasPorObra.set(a.obraId, set)
  }

  const sinAprobarPorObra = new Map(sinAprobar.map((s) => [s.obraId, s._count]))
  const conParteAyer = new Set(partesDeAyer.map((p) => p.obraId))

  return obras.map((o) => ({
    ...o,
    personas: personasPorObra.get(o.id)?.size ?? 0,
    partesSinAprobar: sinAprobarPorObra.get(o.id) ?? 0,
    faltaParteDeAyer:
      o.estado === EstadoObra.EN_CURSO &&
      (personasPorObra.get(o.id)?.size ?? 0) > 0 &&
      !conParteAyer.has(o.id),
  }))
}

// ------------------------------ CAPATAZ ------------------------------

export interface InicioCapataz {
  obra: { id: string; codigo: string; nombre: string; localidad: string | null } | null
  yaCargoElParteDeHoy: boolean
  personasAsignadas: number
  herramientasACargo: Array<{
    id: string
    codigo: string
    nombre: string
    fechaDevolucionPrevista: Date | null
    vencida: boolean
  }>
}

export async function inicioCapataz(sesion: Sesion): Promise<InicioCapataz> {
  const ids = await obrasDeLaSesion(sesion)
  const hoy = hoyCero()
  const ahora = new Date()

  const obra = await db.obra.findFirst({
    where: {
      ...(ids === null ? {} : { id: { in: ids } }),
      estado: EstadoObra.EN_CURSO,
    },
    select: { id: true, codigo: true, nombre: true, localidad: true },
    orderBy: { codigo: 'asc' },
  })

  if (!obra) {
    return { obra: null, yaCargoElParteDeHoy: false, personasAsignadas: 0, herramientasACargo: [] }
  }

  const [parteDeHoy, asignados, herramientas] = await Promise.all([
    db.parteDiario.findUnique({
      where: { obraId_fecha: { obraId: obra.id, fecha: hoy } },
      select: { estado: true },
    }),
    db.asignacionObra.findMany({
      where: {
        obraId: obra.id,
        empleadoId: { not: null },
        desde: { lte: ahora },
        OR: [{ hasta: null }, { hasta: { gte: ahora } }],
      },
      select: { empleadoId: true },
      distinct: ['empleadoId'],
    }),
    sesion.empleadoId
      ? db.herramienta.findMany({
          where: {
            responsableActualId: sesion.empleadoId,
            estado: EstadoHerramienta.EN_OBRA,
          },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            fechaDevolucionPrevista: true,
          },
          orderBy: { fechaDevolucionPrevista: 'asc' },
        })
      : Promise.resolve([]),
  ])

  return {
    obra,
    yaCargoElParteDeHoy: parteDeHoy?.estado === EstadoParte.ENVIADO || parteDeHoy?.estado === EstadoParte.APROBADO,
    personasAsignadas: asignados.length,
    herramientasACargo: herramientas.map((h) => ({
      ...h,
      vencida: h.fechaDevolucionPrevista !== null && h.fechaDevolucionPrevista < hoy,
    })),
  }
}

// ------------------------------ PAÑOLERO -----------------------------

export interface InicioPanolero {
  solicitudesPendientes: Array<{
    id: string
    descripcion: string
    fechaNecesaria: Date
    prioridad: string
    obra: string
  }>
  devolucionesVencidas: Array<{
    id: string
    codigo: string
    nombre: string
    diasDeAtraso: number
    obra: string | null
    responsable: string | null
  }>
  enReparacion: number
  disponibles: number
}

export async function inicioPanolero(): Promise<InicioPanolero> {
  const hoy = hoyCero()

  const [solicitudes, vencidas, enReparacion, disponibles] = await Promise.all([
    db.solicitudHerramienta.findMany({
      where: { estado: EstadoSolicitudHerramienta.PENDIENTE },
      select: {
        id: true,
        descripcion: true,
        fechaNecesaria: true,
        prioridad: true,
        obra: { select: { codigo: true } },
      },
      orderBy: [{ prioridad: 'desc' }, { fechaNecesaria: 'asc' }],
      take: 5,
    }),
    db.herramienta.findMany({
      where: {
        estado: EstadoHerramienta.EN_OBRA,
        fechaDevolucionPrevista: { lt: hoy },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        fechaDevolucionPrevista: true,
        obra: { select: { codigo: true } },
        responsableActual: { select: { nombre: true, apellido: true } },
      },
      orderBy: { fechaDevolucionPrevista: 'asc' },
      take: 5,
    }),
    db.herramienta.count({ where: { estado: EstadoHerramienta.EN_REPARACION } }),
    db.herramienta.count({ where: { estado: EstadoHerramienta.DISPONIBLE } }),
  ])

  return {
    solicitudesPendientes: solicitudes.map((s) => ({
      id: s.id,
      descripcion: s.descripcion,
      fechaNecesaria: s.fechaNecesaria,
      prioridad: s.prioridad,
      obra: s.obra.codigo,
    })),
    devolucionesVencidas: vencidas.map((h) => ({
      id: h.id,
      codigo: h.codigo,
      nombre: h.nombre,
      diasDeAtraso: h.fechaDevolucionPrevista
        ? Math.round((hoy.getTime() - h.fechaDevolucionPrevista.getTime()) / 86_400_000)
        : 0,
      obra: h.obra?.codigo ?? null,
      responsable: h.responsableActual
        ? `${h.responsableActual.nombre} ${h.responsableActual.apellido}`
        : null,
    })),
    enReparacion,
    disponibles,
  }
}

// ------------------------------ LOGÍSTICA ----------------------------

export interface InicioLogistica {
  viajesDeHoy: Array<{
    id: string
    destino: string
    estado: EstadoViaje
    salidaPrevista: Date
    vehiculo: string
    chofer: string
  }>
  solicitudesSinAsignar: Array<{
    id: string
    destino: string
    fechaHoraNecesaria: Date
    prioridad: string
    obra: string
    pesoEstimadoKg: number | null
  }>
  vencimientosProximos: Array<{
    id: string
    tipo: string
    vencimiento: Date | null
    patente: string
    diasRestantes: number
  }>
  flota: { disponibles: number; enViaje: number; enTaller: number }
}

export async function inicioLogistica(): Promise<InicioLogistica> {
  const hoy = hoyCero()
  const finDeHoy = manana()

  const [viajes, solicitudes, documentos, disponibles, enViaje, enTaller] =
    await Promise.all([
      db.viaje.findMany({
        where: {
          estado: { in: [EstadoViaje.PROGRAMADO, EstadoViaje.EN_CURSO] },
          salidaPrevista: { gte: hoy, lt: finDeHoy },
        },
        select: {
          id: true,
          destino: true,
          estado: true,
          salidaPrevista: true,
          vehiculo: { select: { patente: true } },
          chofer: { select: { nombre: true, apellido: true } },
        },
        orderBy: { salidaPrevista: 'asc' },
      }),
      db.solicitudViaje.findMany({
        where: { estado: EstadoSolicitudViaje.PENDIENTE },
        select: {
          id: true,
          destino: true,
          fechaHoraNecesaria: true,
          prioridad: true,
          pesoEstimadoKg: true,
          obra: { select: { codigo: true } },
        },
        orderBy: [{ prioridad: 'desc' }, { fechaHoraNecesaria: 'asc' }],
        take: 5,
      }),
      db.documentoVehiculo.findMany({
        where: { vencimiento: { lte: enDias(15) } },
        select: {
          id: true,
          tipo: true,
          vencimiento: true,
          vehiculo: { select: { patente: true } },
        },
        orderBy: { vencimiento: 'asc' },
        take: 5,
      }),
      db.vehiculo.count({ where: { estado: EstadoVehiculo.DISPONIBLE } }),
      db.vehiculo.count({ where: { estado: EstadoVehiculo.EN_VIAJE } }),
      db.vehiculo.count({ where: { estado: EstadoVehiculo.EN_TALLER } }),
    ])

  return {
    viajesDeHoy: viajes.map((v) => ({
      id: v.id,
      destino: v.destino,
      estado: v.estado,
      salidaPrevista: v.salidaPrevista,
      vehiculo: v.vehiculo.patente,
      chofer: `${v.chofer.nombre} ${v.chofer.apellido}`,
    })),
    solicitudesSinAsignar: solicitudes.map((s) => ({
      id: s.id,
      destino: s.destino,
      fechaHoraNecesaria: s.fechaHoraNecesaria,
      prioridad: s.prioridad,
      obra: s.obra.codigo,
      pesoEstimadoKg: s.pesoEstimadoKg,
    })),
    vencimientosProximos: documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      vencimiento: d.vencimiento,
      patente: d.vehiculo.patente,
      diasRestantes: d.vencimiento
        ? Math.round((d.vencimiento.getTime() - hoy.getTime()) / 86_400_000)
        : 0,
    })),
    flota: { disponibles, enViaje, enTaller },
  }
}

// ------------------------------- CHOFER ------------------------------

export interface InicioChofer {
  vehiculo: {
    id: string
    patente: string
    marca: string
    modelo: string
    kmActual: number
    estado: EstadoVehiculo
  } | null
  viajes: Array<{
    id: string
    tipo: string
    estado: EstadoViaje
    origen: string
    destino: string
    salidaPrevista: Date
    descripcionCarga: string | null
    obra: string | null
    esDeHoy: boolean
  }>
}

export async function inicioChofer(sesion: Sesion): Promise<InicioChofer> {
  if (!sesion.empleadoId) return { vehiculo: null, viajes: [] }

  const hoy = hoyCero()
  const finDeHoy = manana()

  const [vehiculo, viajes] = await Promise.all([
    db.vehiculo.findFirst({
      where: { choferHabitualId: sesion.empleadoId },
      select: {
        id: true,
        patente: true,
        marca: true,
        modelo: true,
        kmActual: true,
        estado: true,
      },
    }),
    db.viaje.findMany({
      where: {
        choferId: sesion.empleadoId,
        estado: { in: [EstadoViaje.PROGRAMADO, EstadoViaje.EN_CURSO] },
      },
      select: {
        id: true,
        tipo: true,
        estado: true,
        origen: true,
        destino: true,
        salidaPrevista: true,
        descripcionCarga: true,
        obra: { select: { codigo: true } },
      },
      orderBy: { salidaPrevista: 'asc' },
      take: 10,
    }),
  ])

  return {
    vehiculo,
    viajes: viajes.map((v) => ({
      id: v.id,
      tipo: v.tipo,
      estado: v.estado,
      origen: v.origen,
      destino: v.destino,
      salidaPrevista: v.salidaPrevista,
      descripcionCarga: v.descripcionCarga,
      obra: v.obra?.codigo ?? null,
      esDeHoy: v.salidaPrevista >= hoy && v.salidaPrevista < finDeHoy,
    })),
  }
}

// -------------------------------- RRHH -------------------------------

export interface InicioRrhh {
  documentacionPorVencer: Array<{
    id: string
    tipo: string
    vencimiento: Date | null
    empleado: string
    legajo: string
    empleadoId: string
    vencido: boolean
    diasRestantes: number
  }>
  sinAsignacion: Array<{
    id: string
    legajo: string
    nombre: string
    categoria: string
  }>
  totalEmpleados: number
  subcontratistasConDocVencida: number
}

export async function inicioRrhh(): Promise<InicioRrhh> {
  const hoy = hoyCero()
  const ahora = new Date()

  const [documentos, asignados, totalEmpleados, subcontratistas] =
    await Promise.all([
      db.documentoEmpleado.findMany({
        where: {
          vencimiento: { lte: enDias(15) },
          empleado: { activo: true },
        },
        select: {
          id: true,
          tipo: true,
          vencimiento: true,
          empleadoId: true,
          empleado: { select: { nombre: true, apellido: true, legajo: true } },
        },
        orderBy: { vencimiento: 'asc' },
        take: 8,
      }),
      db.asignacionObra.findMany({
        where: {
          empleadoId: { not: null },
          desde: { lte: ahora },
          OR: [{ hasta: null }, { hasta: { gte: ahora } }],
        },
        select: { empleadoId: true },
        distinct: ['empleadoId'],
      }),
      db.empleado.count({ where: { activo: true } }),
      db.subcontratista.count({
        where: {
          activo: true,
          documentos: { some: { vencimiento: { lt: hoy } } },
        },
      }),
    ])

  const idsAsignados = asignados
    .map((a) => a.empleadoId)
    .filter((id): id is string => id !== null)

  const sinAsignacion = await db.empleado.findMany({
    where: { activo: true, id: { notIn: idsAsignados } },
    select: { id: true, legajo: true, nombre: true, apellido: true, categoria: true },
    orderBy: { apellido: 'asc' },
    take: 8,
  })

  return {
    documentacionPorVencer: documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      vencimiento: d.vencimiento,
      empleado: `${d.empleado.nombre} ${d.empleado.apellido}`,
      legajo: d.empleado.legajo,
      empleadoId: d.empleadoId,
      vencido: d.vencimiento !== null && d.vencimiento < hoy,
      diasRestantes: d.vencimiento
        ? Math.round((d.vencimiento.getTime() - hoy.getTime()) / 86_400_000)
        : 0,
    })),
    sinAsignacion: sinAsignacion.map((e) => ({
      id: e.id,
      legajo: e.legajo,
      nombre: `${e.nombre} ${e.apellido}`,
      categoria: e.categoria,
    })),
    totalEmpleados,
    subcontratistasConDocVencida: subcontratistas,
  }
}
