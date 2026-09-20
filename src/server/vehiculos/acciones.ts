'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  Combustible,
  EstadoSolicitudViaje,
  EstadoVehiculo,
  EstadoViaje,
  Prisma,
  TipoDocumentoEmpleado,
  TipoIncidenteVehiculo,
  TipoMantenimiento,
  TipoVehiculo,
  TipoViaje,
} from '@prisma/client'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { exigirAccesoAObra } from '@/lib/auth/obras'
import { registrarAuditoria } from '@/server/nucleo/auditoria'
import { reevaluarModulos } from '@/lib/alertas/motor'
import {
  DOCUMENTOS_BLOQUEANTES,
  bloqueosDelChofer,
  bloqueosDelVehiculo,
  costoDelViaje,
  kilometrajeValido,
  normalizarPatente,
  patenteValida,
  validarFin,
  validarInicio,
} from './reglas'

export interface ResultadoViaje {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
  mensaje?: string
  id?: string
}

function aErrores(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const p of error.issues) {
    const campo = p.path[0]
    if (typeof campo === 'string' && !salida[campo]) salida[campo] = p.message
  }
  return salida
}

const opcional = (v: FormDataEntryValue | null): string | null => {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}

const numero = (v: FormDataEntryValue | null): number | null => {
  const t = opcional(v)
  if (!t) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const decimal = (n: number | null) =>
  n === null ? null : new Prisma.Decimal(n.toFixed(2))

const fechaHora = (v: FormDataEntryValue | null): Date | null => {
  const t = opcional(v)
  if (!t) return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

/* ====================== SOLICITUD DE VIAJE ========================== */

const esquemaSolicitud = z.object({
  obraId: z.string().trim().min(1, 'Elegí la obra.'),
  tipo: z.nativeEnum(TipoViaje),
  origen: z.string().trim().min(2, 'Poné desde dónde sale.'),
  destino: z.string().trim().min(2, 'Poné a dónde va.'),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']),
})

export async function accionPedirViaje(
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.crear')

  const validado = esquemaSolicitud.safeParse({
    obraId: datos.get('obraId'),
    tipo: datos.get('tipo'),
    origen: datos.get('origen'),
    destino: datos.get('destino'),
    prioridad: datos.get('prioridad') || 'NORMAL',
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  await exigirAccesoAObra(sesion, validado.data.obraId)

  const fechaHoraNecesaria = fechaHora(datos.get('fechaHoraNecesaria'))
  if (!fechaHoraNecesaria) {
    return { errores: { fechaHoraNecesaria: 'Poné para cuándo lo necesitás.' } }
  }

  const solicitud = await db.solicitudViaje.create({
    data: {
      ...validado.data,
      fechaHoraNecesaria,
      descripcionCarga: opcional(datos.get('descripcionCarga')),
      pesoEstimadoKg: numero(datos.get('pesoEstimadoKg')),
      cantidadPersonas: numero(datos.get('cantidadPersonas')),
      solicitanteId: sesion.usuarioId,
      estado: EstadoSolicitudViaje.PENDIENTE,
    },
  })

  revalidatePath('/vehiculos/solicitudes')
  revalidatePath('/inicio')
  return { ok: true, id: solicitud.id, mensaje: 'Viaje pedido a logística' }
}

/* =========================== ASIGNAR =============================== */

/**
 * Asignar un vehículo y un chofer a una solicitud.
 *
 * Acá se aplican todas las validaciones bloqueantes de CLAUDE.md. Se
 * revalidan en el servidor aunque la pantalla ya las haya mostrado: la
 * situación puede haber cambiado entre que se abrió la pantalla y se
 * confirmó.
 */
export async function accionAsignarViaje(
  solicitudId: string,
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  const vehiculoId = String(datos.get('vehiculoId') ?? '')
  const choferId = String(datos.get('choferId') ?? '')
  if (!vehiculoId) return { error: 'Elegí un vehículo.' }
  if (!choferId) return { error: 'Elegí un chofer.' }

  const solicitud = await db.solicitudViaje.findUnique({
    where: { id: solicitudId },
    select: {
      id: true,
      obraId: true,
      estado: true,
      tipo: true,
      origen: true,
      destino: true,
      descripcionCarga: true,
      pesoEstimadoKg: true,
      cantidadPersonas: true,
      fechaHoraNecesaria: true,
    },
  })
  if (!solicitud) return { error: 'Esa solicitud no existe.' }
  if (solicitud.estado !== EstadoSolicitudViaje.PENDIENTE) {
    return { error: 'Esa solicitud ya está resuelta.' }
  }

  const salidaPrevista =
    fechaHora(datos.get('salidaPrevista')) ?? solicitud.fechaHoraNecesaria

  const bloqueo = await revalidarAsignacion(
    vehiculoId,
    choferId,
    {
      pesoCargaKg: solicitud.pesoEstimadoKg,
      cantidadPersonas: solicitud.cantidadPersonas,
      salidaPrevista,
    },
  )
  if (bloqueo) return { error: bloqueo }

  const viaje = await db.$transaction(async (tx) => {
    const creado = await tx.viaje.create({
      data: {
        vehiculoId,
        choferId,
        obraId: solicitud.obraId,
        solicitudId: solicitud.id,
        tipo: solicitud.tipo,
        estado: EstadoViaje.PROGRAMADO,
        origen: solicitud.origen,
        destino: solicitud.destino,
        descripcionCarga: solicitud.descripcionCarga,
        pesoCargaKg: solicitud.pesoEstimadoKg,
        salidaPrevista,
      },
    })

    await tx.solicitudViaje.update({
      where: { id: solicitudId },
      data: { estado: EstadoSolicitudViaje.ASIGNADA },
    })

    return creado
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'APROBAR',
    entidad: 'SolicitudViaje',
    entidadId: solicitudId,
    despues: { viajeId: viaje.id, vehiculoId, choferId },
  })

  // La alerta de "solicitud sin asignar" se cierra en el momento.
  await reevaluarModulos(['vehiculos'])

  revalidatePath('/vehiculos/solicitudes')
  revalidatePath('/vehiculos/agenda')
  revalidatePath('/inicio')
  revalidatePath('/alertas')
  return { ok: true, id: viaje.id, mensaje: 'Viaje asignado' }
}

/** Crear un viaje sin solicitud previa. */
export async function accionCrearViajeDirecto(
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  const vehiculoId = String(datos.get('vehiculoId') ?? '')
  const choferId = String(datos.get('choferId') ?? '')
  const origen = String(datos.get('origen') ?? '').trim()
  const destino = String(datos.get('destino') ?? '').trim()

  if (!vehiculoId) return { errores: { vehiculoId: 'Elegí un vehículo.' } }
  if (!choferId) return { errores: { choferId: 'Elegí un chofer.' } }
  if (origen.length < 2) return { errores: { origen: 'Poné desde dónde sale.' } }
  if (destino.length < 2) return { errores: { destino: 'Poné a dónde va.' } }

  const salidaPrevista = fechaHora(datos.get('salidaPrevista'))
  if (!salidaPrevista) {
    return { errores: { salidaPrevista: 'Poné cuándo sale.' } }
  }

  const pesoCargaKg = numero(datos.get('pesoCargaKg'))

  const bloqueo = await revalidarAsignacion(vehiculoId, choferId, {
    pesoCargaKg,
    cantidadPersonas: null,
    salidaPrevista,
  })
  if (bloqueo) return { error: bloqueo }

  const viaje = await db.viaje.create({
    data: {
      vehiculoId,
      choferId,
      obraId: opcional(datos.get('obraId')),
      tipo: (String(datos.get('tipo') ?? '') as TipoViaje) || TipoViaje.OTRO,
      estado: EstadoViaje.PROGRAMADO,
      origen,
      destino,
      descripcionCarga: opcional(datos.get('descripcionCarga')),
      pesoCargaKg,
      salidaPrevista,
    },
  })

  revalidatePath('/vehiculos/agenda')
  return { ok: true, id: viaje.id, mensaje: 'Viaje creado' }
}

/** Revalida en el servidor todo lo que la pantalla mostró. */
async function revalidarAsignacion(
  vehiculoId: string,
  choferId: string,
  pedido: {
    pesoCargaKg: number | null
    cantidadPersonas: number | null
    salidaPrevista: Date
  },
): Promise<string | null> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const desde = new Date(pedido.salidaPrevista.getTime() - 4 * 3_600_000)
  const hasta = new Date(pedido.salidaPrevista.getTime() + 4 * 3_600_000)

  const [vehiculo, chofer] = await Promise.all([
    db.vehiculo.findUnique({
      where: { id: vehiculoId },
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
    }),
    db.empleado.findUnique({
      where: { id: choferId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        activo: true,
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
    }),
  ])

  if (!vehiculo) return 'Ese vehículo no existe.'
  if (!chofer) return 'Ese chofer no existe.'
  if (!chofer.activo) return `${chofer.nombre} ${chofer.apellido} ya no trabaja en la empresa.`

  const bloqueosVehiculo = bloqueosDelVehiculo(
    {
      id: vehiculo.id,
      patente: vehiculo.patente,
      tipo: vehiculo.tipo,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      estado: vehiculo.estado,
      capacidadCargaKg: vehiculo.capacidadCargaKg,
      cantidadPasajeros: vehiculo.cantidadPasajeros,
      costoKmEstimado: vehiculo.costoKmEstimado ? Number(vehiculo.costoKmEstimado) : null,
      documentosVencidos: vehiculo.documentos,
      viajesSuperpuestos: vehiculo.viajes.map((v) => ({
        id: v.id,
        destino: v.destino,
        salida: v.salidaPrevista,
      })),
    },
    pedido,
  )
  if (bloqueosVehiculo.length > 0) return bloqueosVehiculo[0].mensaje

  const bloqueosChofer = bloqueosDelChofer({
    id: chofer.id,
    nombre: chofer.nombre,
    apellido: chofer.apellido,
    licenciaVence: chofer.documentos[0]?.vencimiento ?? null,
    viajesSuperpuestos: chofer.viajes.map((v) => ({
      id: v.id,
      destino: v.destino,
      salida: v.salidaPrevista,
    })),
  })
  if (bloqueosChofer.length > 0) return bloqueosChofer[0].mensaje

  return null
}

export async function accionRechazarSolicitudViaje(
  solicitudId: string,
  motivo: string,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  if (!motivo.trim()) {
    return { error: 'Escribí por qué, así la obra entiende la decisión.' }
  }

  await db.solicitudViaje.update({
    where: { id: solicitudId },
    data: {
      estado: EstadoSolicitudViaje.RECHAZADA,
      motivoRechazo: motivo.trim(),
    },
  })

  revalidatePath('/vehiculos/solicitudes')
  return { ok: true, mensaje: 'Solicitud rechazada' }
}

/* ===================== INICIAR Y FINALIZAR ========================== */

export async function accionIniciarViaje(
  viajeId: string,
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.editar')

  const viaje = await db.viaje.findUnique({
    where: { id: viajeId },
    select: {
      id: true,
      estado: true,
      choferId: true,
      vehiculoId: true,
      vehiculo: { select: { kmActual: true } },
    },
  })
  if (!viaje) return { error: 'Ese viaje no existe.' }

  // Un chofer solo puede tocar sus propios viajes.
  if (sesion.rol === 'CHOFER' && viaje.choferId !== sesion.empleadoId) {
    return { error: 'Ese viaje no es tuyo.' }
  }

  const kmSalida = numero(datos.get('kmSalida'))
  if (kmSalida === null) {
    return { errores: { kmSalida: 'Poné los kilómetros del tablero.' } }
  }

  const validacion = validarInicio(viaje.estado, kmSalida, viaje.vehiculo.kmActual)
  if (!validacion.ok) return { errores: { kmSalida: validacion.error } }

  await db.$transaction(async (tx) => {
    await tx.viaje.update({
      where: { id: viajeId },
      data: {
        estado: EstadoViaje.EN_CURSO,
        salidaReal: new Date(),
        kmSalida,
      },
    })
    await tx.vehiculo.update({
      where: { id: viaje.vehiculoId },
      data: { estado: EstadoVehiculo.EN_VIAJE, kmActual: kmSalida },
    })
  })

  revalidatePath('/vehiculos/mis-viajes')
  revalidatePath('/vehiculos/ahora')
  revalidatePath('/inicio')
  return { ok: true, mensaje: 'Viaje iniciado' }
}

export async function accionFinalizarViaje(
  viajeId: string,
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.editar')

  const viaje = await db.viaje.findUnique({
    where: { id: viajeId },
    select: {
      id: true,
      estado: true,
      kmSalida: true,
      choferId: true,
      vehiculoId: true,
      vehiculo: { select: { costoKmEstimado: true } },
    },
  })
  if (!viaje) return { error: 'Ese viaje no existe.' }

  if (sesion.rol === 'CHOFER' && viaje.choferId !== sesion.empleadoId) {
    return { error: 'Ese viaje no es tuyo.' }
  }

  const kmLlegada = numero(datos.get('kmLlegada'))
  if (kmLlegada === null) {
    return { errores: { kmLlegada: 'Poné los kilómetros del tablero.' } }
  }

  const validacion = validarFin(viaje.estado, viaje.kmSalida, kmLlegada)
  if (!validacion.ok) return { errores: { kmLlegada: validacion.error } }

  const peajes = numero(datos.get('peajes')) ?? 0
  const costo = costoDelViaje(
    viaje.kmSalida,
    kmLlegada,
    viaje.vehiculo.costoKmEstimado ? Number(viaje.vehiculo.costoKmEstimado) : null,
    peajes,
  )

  await db.$transaction(async (tx) => {
    await tx.viaje.update({
      where: { id: viajeId },
      data: {
        estado: EstadoViaje.FINALIZADO,
        llegadaReal: new Date(),
        kmLlegada,
        peajes: decimal(peajes),
        costoCalculado: decimal(costo),
        observaciones: opcional(datos.get('observaciones')),
      },
    })
    // El vehículo vuelve a estar disponible y con su kilometraje al día.
    await tx.vehiculo.update({
      where: { id: viaje.vehiculoId },
      data: { estado: EstadoVehiculo.DISPONIBLE, kmActual: kmLlegada },
    })
  })

  // Cerrar el viaje resuelve la alerta de "viaje en curso demorado".
  await reevaluarModulos(['vehiculos'])

  revalidatePath('/vehiculos/mis-viajes')
  revalidatePath('/vehiculos/ahora')
  revalidatePath('/inicio')
  revalidatePath('/alertas')
  return { ok: true, mensaje: 'Viaje finalizado' }
}

export async function accionCancelarViaje(
  viajeId: string,
  motivo: string,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  const viaje = await db.viaje.findUnique({
    where: { id: viajeId },
    select: { estado: true, vehiculoId: true, solicitudId: true },
  })
  if (!viaje) return { error: 'Ese viaje no existe.' }
  if (viaje.estado === EstadoViaje.FINALIZADO) {
    return { error: 'Ese viaje ya terminó.' }
  }

  await db.$transaction(async (tx) => {
    await tx.viaje.update({
      where: { id: viajeId },
      data: { estado: EstadoViaje.CANCELADO, observaciones: motivo.trim() || null },
    })
    if (viaje.estado === EstadoViaje.EN_CURSO) {
      await tx.vehiculo.update({
        where: { id: viaje.vehiculoId },
        data: { estado: EstadoVehiculo.DISPONIBLE },
      })
    }
    if (viaje.solicitudId) {
      await tx.solicitudViaje.update({
        where: { id: viaje.solicitudId },
        data: { estado: EstadoSolicitudViaje.PENDIENTE },
      })
    }
  })

  revalidatePath('/vehiculos/agenda')
  return { ok: true, mensaje: 'Viaje cancelado' }
}

/* ================ COMBUSTIBLE, SERVICE, DOCS, INCIDENTES =========== */

export async function accionCargarCombustible(
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.editar')

  const vehiculoId = String(datos.get('vehiculoId') ?? '')
  if (!vehiculoId) return { error: 'Elegí el vehículo.' }

  const litros = numero(datos.get('litros'))
  const monto = numero(datos.get('monto'))
  if (litros === null || litros <= 0) {
    return { errores: { litros: 'Poné cuántos litros cargaste.' } }
  }
  if (monto === null || monto <= 0) {
    return { errores: { monto: 'Poné cuánto pagaste.' } }
  }

  const km = numero(datos.get('km'))

  await db.$transaction(async (tx) => {
    await tx.cargaCombustible.create({
      data: {
        vehiculoId,
        choferId: sesion.empleadoId,
        fecha: fechaHora(datos.get('fecha')) ?? new Date(),
        litros: decimal(litros) as Prisma.Decimal,
        monto: decimal(monto) as Prisma.Decimal,
        km,
        estacion: opcional(datos.get('estacion')),
        obraId: opcional(datos.get('obraId')),
      },
    })

    // Si el chofer cargó los km, se aprovecha para actualizar el vehículo.
    if (km !== null && km > 0) {
      const vehiculo = await tx.vehiculo.findUnique({
        where: { id: vehiculoId },
        select: { kmActual: true },
      })
      if (vehiculo && km > vehiculo.kmActual) {
        await tx.vehiculo.update({
          where: { id: vehiculoId },
          data: { kmActual: km },
        })
      }
    }
  })

  revalidatePath(`/vehiculos/${vehiculoId}`)
  revalidatePath('/vehiculos/mis-viajes')
  return { ok: true, mensaje: 'Carga registrada' }
}

export async function accionRegistrarService(
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  const vehiculoId = String(datos.get('vehiculoId') ?? '')
  const descripcion = opcional(datos.get('descripcion'))
  if (!vehiculoId) return { error: 'Elegí el vehículo.' }
  if (!descripcion) {
    return { errores: { descripcion: 'Contá qué se le hizo.' } }
  }

  const tipo =
    (String(datos.get('tipo') ?? '') as TipoMantenimiento) ||
    TipoMantenimiento.PREVENTIVO
  const km = numero(datos.get('km'))
  const cadaKm = numero(datos.get('cadaKm')) ?? 10_000
  const cadaDias = numero(datos.get('cadaDias')) ?? 180
  const fecha = fechaHora(datos.get('fecha')) ?? new Date()

  // Al registrar un service se recalcula el próximo, por km y por fecha.
  const proximoKm =
    tipo === TipoMantenimiento.PREVENTIVO && km !== null
      ? Math.round(km + cadaKm)
      : null
  const proximaFecha =
    tipo === TipoMantenimiento.PREVENTIVO
      ? new Date(fecha.getTime() + cadaDias * 86_400_000)
      : null

  await db.$transaction(async (tx) => {
    await tx.mantenimientoVehiculo.create({
      data: {
        vehiculoId,
        tipo,
        fecha,
        km,
        descripcion,
        taller: opcional(datos.get('taller')),
        costo: decimal(numero(datos.get('costo'))),
        proximoKm,
        proximaFecha,
      },
    })

    if (km !== null && km > 0) {
      const vehiculo = await tx.vehiculo.findUnique({
        where: { id: vehiculoId },
        select: { kmActual: true },
      })
      if (vehiculo && km > vehiculo.kmActual) {
        await tx.vehiculo.update({ where: { id: vehiculoId }, data: { kmActual: km } })
      }
    }
  })

  revalidatePath(`/vehiculos/${vehiculoId}`)
  return { ok: true, mensaje: 'Mantenimiento registrado' }
}

export async function accionGuardarDocumentoVehiculo(
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  const vehiculoId = String(datos.get('vehiculoId') ?? '')
  if (!vehiculoId) return { error: 'Elegí el vehículo.' }

  const vencimiento = fechaHora(datos.get('vencimiento'))
  if (!vencimiento) {
    return { errores: { vencimiento: 'Poné la fecha de vencimiento.' } }
  }

  await db.documentoVehiculo.create({
    data: {
      vehiculoId,
      tipo: String(datos.get('tipo') ?? 'OTRO') as never,
      descripcion: opcional(datos.get('descripcion')),
      vencimiento,
      costo: decimal(numero(datos.get('costo'))),
    },
  })

  revalidatePath(`/vehiculos/${vehiculoId}`)
  return { ok: true, mensaje: 'Documento cargado' }
}

export async function accionRegistrarIncidente(
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  const vehiculoId = String(datos.get('vehiculoId') ?? '')
  const descripcion = opcional(datos.get('descripcion'))
  if (!vehiculoId) return { error: 'Elegí el vehículo.' }
  if (!descripcion) return { errores: { descripcion: 'Contá qué pasó.' } }

  await db.incidenteVehiculo.create({
    data: {
      vehiculoId,
      choferId: opcional(datos.get('choferId')),
      tipo:
        (String(datos.get('tipo') ?? '') as TipoIncidenteVehiculo) ||
        TipoIncidenteVehiculo.ROTURA,
      fecha: fechaHora(datos.get('fecha')) ?? new Date(),
      descripcion,
      monto: decimal(numero(datos.get('monto'))),
    },
  })

  revalidatePath(`/vehiculos/${vehiculoId}`)
  return { ok: true, mensaje: 'Incidente registrado' }
}

/** Cambiar el estado de un vehículo: al taller, fuera de servicio, etc. */
export async function accionCambiarEstadoVehiculo(
  vehiculoId: string,
  estado: EstadoVehiculo,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'vehiculos.aprobar')

  if (estado === EstadoVehiculo.EN_VIAJE) {
    return { error: 'El estado "en viaje" lo pone el sistema al iniciar un viaje.' }
  }

  const enCurso = await db.viaje.count({
    where: { vehiculoId, estado: EstadoViaje.EN_CURSO },
  })
  if (enCurso > 0 && estado !== EstadoVehiculo.DISPONIBLE) {
    return { error: 'Ese vehículo está en viaje. Primero hay que cerrarlo.' }
  }

  await db.vehiculo.update({ where: { id: vehiculoId }, data: { estado } })

  revalidatePath(`/vehiculos/${vehiculoId}`)
  revalidatePath('/vehiculos')
  return { ok: true, mensaje: 'Estado actualizado' }
}

/* ====================== ALTA Y EDICIÓN DE VEHÍCULOS ================= */

const esquemaVehiculo = z.object({
  patente: z
    .string()
    .trim()
    .refine(patenteValida, 'Tiene que ser tipo ABC123 o AB123CD.'),
  tipo: z.nativeEnum(TipoVehiculo),
  marca: z.string().trim().min(2, 'Poné la marca.'),
  modelo: z.string().trim().min(1, 'Poné el modelo.'),
  combustible: z.nativeEnum(Combustible),
})

export async function accionGuardarVehiculo(
  id: string | null,
  _previo: ResultadoViaje,
  datos: FormData,
): Promise<ResultadoViaje> {
  const sesion = await exigirSesion()
  // Ojo: en esta app 'vehiculos.crear' significa "puede pedir un viaje"
  // (lo tiene el capataz). El alta de un vehículo es gestión de flota:
  // dueño, administración y logística.
  exigirPermiso(sesion, 'vehiculos.aprobar')

  // La patente entra sin guiones ni espacios: ABC 123 y ABC-123 son la misma.
  const patenteCruda = normalizarPatente(String(datos.get('patente') ?? ''))

  const validado = esquemaVehiculo.safeParse({
    patente: patenteCruda,
    tipo: datos.get('tipo'),
    marca: datos.get('marca'),
    modelo: datos.get('modelo'),
    combustible: datos.get('combustible') || Combustible.DIESEL,
  })
  if (!validado.success) return { errores: aErrores(validado.error) }

  const repetida = await db.vehiculo.findUnique({
    where: { patente: validado.data.patente },
    select: { id: true },
  })
  if (repetida && repetida.id !== id) {
    return { errores: { patente: 'Ya hay un vehículo con esa patente.' } }
  }

  const km = numero(datos.get('kmActual'))
  const entero = (v: number | null) => (v === null ? null : Math.round(v))

  const comunes = {
    ...validado.data,
    interno: opcional(datos.get('interno')),
    anio: entero(numero(datos.get('anio'))),
    capacidadCargaKg: entero(numero(datos.get('capacidadCargaKg'))),
    volumenM3: decimal(numero(datos.get('volumenM3'))),
    cantidadPasajeros: entero(numero(datos.get('cantidadPasajeros'))),
    horasActual: entero(numero(datos.get('horasActual'))),
    costoKmEstimado: decimal(numero(datos.get('costoKmEstimado'))),
    tieneGps: datos.get('tieneGps') === 'on',
    choferHabitualId: opcional(datos.get('choferHabitualId')),
    notas: opcional(datos.get('notas')),
  }

  if (id) {
    /*
     * El odómetro nunca vuelve para atrás: lo mueven los viajes y las
     * cargas de combustible. Si alguien corrige el número a la baja hay
     * que decirlo en vez de aceptarlo en silencio, porque se llevaría
     * puestos los cálculos de consumo y de próximo service.
     */
    const actual = await db.vehiculo.findUnique({
      where: { id },
      select: { kmActual: true },
    })
    if (!actual) return { error: 'Ese vehículo no existe.' }

    const odometro = kilometrajeValido(km, actual.kmActual)
    if (!odometro.ok) return { errores: { kmActual: odometro.error } }

    await db.vehiculo.update({
      where: { id },
      data: { ...comunes, ...(km !== null ? { kmActual: km } : {}) },
    })

    await registrarAuditoria({
      usuarioId: sesion.usuarioId,
      accion: 'EDITAR',
      entidad: 'Vehiculo',
      entidadId: id,
      despues: { patente: comunes.patente },
    })

    revalidatePath(`/vehiculos/${id}`)
    revalidatePath('/vehiculos')
    return { ok: true, id, mensaje: 'Vehículo guardado' }
  }

  const creado = await db.vehiculo.create({
    data: {
      ...comunes,
      kmActual: km !== null && km > 0 ? km : 0,
      estado: EstadoVehiculo.DISPONIBLE,
    },
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'CREAR',
    entidad: 'Vehiculo',
    entidadId: creado.id,
    despues: { patente: creado.patente, marca: creado.marca, modelo: creado.modelo },
  })

  revalidatePath('/vehiculos')
  return { ok: true, id: creado.id, mensaje: 'Vehículo creado' }
}
