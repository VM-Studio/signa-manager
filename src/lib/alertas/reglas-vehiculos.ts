import 'server-only'

import {
  EstadoSolicitudViaje,
  EstadoVehiculo,
  EstadoViaje,
  Severidad,
  TipoDocumentoEmpleado,
} from '@prisma/client'
import { db } from '@/lib/db'
import { DOCUMENTOS_BLOQUEANTES, consumoAnormal } from '@/server/vehiculos/reglas'
import {
  clave,
  diasHasta,
  enDias,
  fecha,
  haceHoras,
  hoyCero,
  plural,
  textoEnum,
  type Hallazgo,
  type Regla,
} from './tipos'

/* =====================================================================
   Reglas del módulo de vehículos.
   ===================================================================== */

/** Seguro, VTV, patente o RUTA por vencer. */
export const docVehiculoPorVencer: Regla = {
  codigo: 'DOC_VEHICULO_POR_VENCER',
  modulo: 'vehiculos',
  async evaluar(config) {
    const hoy = hoyCero()
    const limite = enDias(config.umbral)

    const documentos = await db.documentoVehiculo.findMany({
      where: {
        vencimiento: { lte: limite },
        vehiculo: { estado: { not: EstadoVehiculo.VENDIDO } },
      },
      select: {
        id: true,
        tipo: true,
        vencimiento: true,
        vehiculoId: true,
        vehiculo: { select: { patente: true, marca: true, modelo: true } },
      },
    })

    return documentos.map((d): Hallazgo => {
      const vencido = (d.vencimiento as Date) < hoy
      const bloquea = DOCUMENTOS_BLOQUEANTES.includes(d.tipo)
      const dias = diasHasta(d.vencimiento as Date)

      return {
        claveUnica: clave(config.codigo, 'DocumentoVehiculo', d.id),
        titulo: vencido
          ? `${d.vehiculo.patente}: ${textoEnum(d.tipo)} vencida`
          : `${d.vehiculo.patente}: ${textoEnum(d.tipo)} por vencer`,
        detalle: vencido
          ? `Venció el ${fecha(d.vencimiento)}.${
              bloquea
                ? ' El sistema no deja asignar este vehículo a ningún viaje hasta que se renueve.'
                : ''
            }`
          : `Vence el ${fecha(d.vencimiento)}, dentro de ${plural(dias, 'día')}.`,
        entidadTipo: 'Vehiculo',
        entidadId: d.vehiculoId,
        enlace: `/vehiculos/${d.vehiculoId}?pestana=documentacion`,
        severidad: vencido && bloquea ? Severidad.CRITICA : config.severidad,
      }
    })
  },
}

/** Licencia de conducir de un chofer por vencer. */
export const licenciaChoferPorVencer: Regla = {
  codigo: 'LICENCIA_CHOFER_POR_VENCER',
  modulo: 'vehiculos',
  async evaluar(config) {
    const hoy = hoyCero()
    const limite = enDias(config.umbral)

    const licencias = await db.documentoEmpleado.findMany({
      where: {
        tipo: TipoDocumentoEmpleado.LICENCIA_CONDUCIR,
        vencimiento: { lte: limite },
        empleado: { activo: true },
      },
      select: {
        id: true,
        vencimiento: true,
        empleadoId: true,
        empleado: { select: { nombre: true, apellido: true, legajo: true } },
      },
    })

    return licencias.map((l): Hallazgo => {
      const vencida = (l.vencimiento as Date) < hoy
      const dias = diasHasta(l.vencimiento as Date)

      return {
        claveUnica: clave(config.codigo, 'DocumentoEmpleado', l.id),
        titulo: `${l.empleado.nombre} ${l.empleado.apellido}: licencia ${
          vencida ? 'vencida' : 'por vencer'
        }`,
        detalle: vencida
          ? `Venció el ${fecha(l.vencimiento)}. No se le puede asignar ningún viaje.`
          : `Vence el ${fecha(l.vencimiento)}, dentro de ${plural(dias, 'día')}. Conviene renovarla antes de que quede sin poder manejar.`,
        entidadTipo: 'Empleado',
        entidadId: l.empleadoId,
        enlace: `/personal/empleados/${l.empleadoId}?pestana=documentacion`,
        severidad: vencida ? Severidad.CRITICA : config.severidad,
      }
    })
  },
}

/** Faltan menos de N km o 15 días para el service. */
export const serviceVehiculoProximo: Regla = {
  codigo: 'SERVICE_VEHICULO_PROXIMO',
  modulo: 'vehiculos',
  async evaluar(config) {
    const hoy = hoyCero()
    const en15dias = enDias(15)

    const vehiculos = await db.vehiculo.findMany({
      where: { estado: { not: EstadoVehiculo.VENDIDO } },
      select: {
        id: true,
        patente: true,
        marca: true,
        modelo: true,
        kmActual: true,
        mantenimientos: {
          where: {
            OR: [{ proximoKm: { not: null } }, { proximaFecha: { not: null } }],
          },
          select: { proximoKm: true, proximaFecha: true },
          orderBy: { fecha: 'desc' },
          take: 1,
        },
      },
    })

    const hallazgos: Hallazgo[] = []

    for (const v of vehiculos) {
      const m = v.mantenimientos[0]
      if (!m) continue

      const kmRestantes =
        m.proximoKm !== null ? m.proximoKm - v.kmActual : null
      const porKm = kmRestantes !== null && kmRestantes <= config.umbral
      const porFecha =
        m.proximaFecha !== null && m.proximaFecha <= en15dias

      if (!porKm && !porFecha) continue

      const motivo = porKm
        ? kmRestantes !== null && kmRestantes < 0
          ? `Ya pasó ${plural(Math.abs(kmRestantes), 'kilómetro')} del service.`
          : `Faltan ${plural(kmRestantes as number, 'kilómetro')}.`
        : (m.proximaFecha as Date) < hoy
          ? `El service estaba para el ${fecha(m.proximaFecha)}.`
          : `Toca el ${fecha(m.proximaFecha)}.`

      hallazgos.push({
        claveUnica: clave(config.codigo, 'Vehiculo', v.id),
        titulo: `${v.patente} necesita service`,
        detalle: `${v.marca} ${v.modelo}. ${motivo}`,
        entidadTipo: 'Vehiculo',
        entidadId: v.id,
        enlace: `/vehiculos/${v.id}?pestana=mantenimiento`,
      })
    }

    return hallazgos
  },
}

/** Se acerca la hora del viaje y nadie lo asignó. */
export const solicitudViajeSinAsignar: Regla = {
  codigo: 'SOLICITUD_VIAJE_SIN_ASIGNAR',
  modulo: 'vehiculos',
  async evaluar(config) {
    const limite = new Date(Date.now() + config.umbral * 3_600_000)

    const solicitudes = await db.solicitudViaje.findMany({
      where: {
        estado: EstadoSolicitudViaje.PENDIENTE,
        fechaHoraNecesaria: { lte: limite },
      },
      select: {
        id: true,
        destino: true,
        fechaHoraNecesaria: true,
        prioridad: true,
        obraId: true,
        obra: { select: { codigo: true } },
      },
    })

    return solicitudes.map((s): Hallazgo => {
      const horasRestantes = Math.round(
        (s.fechaHoraNecesaria.getTime() - Date.now()) / 3_600_000,
      )

      return {
        claveUnica: clave(config.codigo, 'SolicitudViaje', s.id),
        titulo: `Viaje a ${s.destino} sin asignar`,
        detalle: `${s.obra.codigo} lo pidió para ${
          horasRestantes < 0
            ? `hace ${plural(Math.abs(horasRestantes), 'hora')}`
            : `dentro de ${plural(horasRestantes, 'hora')}`
        } y todavía no tiene vehículo ni chofer.`,
        entidadTipo: 'SolicitudViaje',
        entidadId: s.id,
        enlace: `/vehiculos/solicitudes/${s.id}`,
        obraId: s.obraId,
        severidad:
          horasRestantes < 0 || s.prioridad === 'URGENTE'
            ? Severidad.CRITICA
            : config.severidad,
      }
    })
  },
}

/** Un viaje que figura en curso hace demasiado tiempo. */
export const viajeEnCursoDemorado: Regla = {
  codigo: 'VIAJE_EN_CURSO_DEMORADO',
  modulo: 'vehiculos',
  async evaluar(config) {
    const limite = haceHoras(config.umbral)

    const viajes = await db.viaje.findMany({
      where: {
        estado: EstadoViaje.EN_CURSO,
        OR: [
          { salidaReal: { lt: limite } },
          { salidaReal: null, salidaPrevista: { lt: limite } },
        ],
      },
      select: {
        id: true,
        destino: true,
        salidaReal: true,
        salidaPrevista: true,
        obraId: true,
        vehiculo: { select: { patente: true } },
        chofer: { select: { nombre: true, apellido: true } },
      },
    })

    return viajes.map((v): Hallazgo => {
      const salida = v.salidaReal ?? v.salidaPrevista
      const horas = Math.round((Date.now() - salida.getTime()) / 3_600_000)

      return {
        claveUnica: clave(config.codigo, 'Viaje', v.id),
        titulo: `${v.vehiculo.patente} en viaje hace ${plural(horas, 'hora')}`,
        detalle: `El viaje a ${v.destino} con ${v.chofer.nombre} ${v.chofer.apellido} sigue abierto. O se olvidaron de cerrarlo, o pasó algo.`,
        entidadTipo: 'Viaje',
        entidadId: v.id,
        enlace: `/vehiculos/viajes/${v.id}`,
        obraId: v.obraId,
      }
    })
  },
}

/** El vehículo está consumiendo más de lo que venía consumiendo. */
export const consumoCombustibleAlto: Regla = {
  codigo: 'CONSUMO_COMBUSTIBLE_ALTO',
  modulo: 'vehiculos',
  async evaluar(config) {
    const vehiculos = await db.vehiculo.findMany({
      where: { estado: { not: EstadoVehiculo.VENDIDO } },
      select: {
        id: true,
        patente: true,
        marca: true,
        modelo: true,
        cargas: {
          select: { fecha: true, litros: true, km: true },
          orderBy: { fecha: 'desc' },
          take: 12,
        },
      },
    })

    const hallazgos: Hallazgo[] = []

    for (const v of vehiculos) {
      if (v.cargas.length < 4) continue

      const resultado = consumoAnormal(
        v.cargas.map((c) => ({
          fecha: c.fecha,
          litros: Number(c.litros),
          km: c.km,
        })),
        config.umbral,
      )

      if (!resultado.anormal || resultado.reciente === null || resultado.promedio === null) {
        continue
      }

      const subida = Math.round(
        ((resultado.reciente - resultado.promedio) / resultado.promedio) * 100,
      )

      hallazgos.push({
        claveUnica: clave(config.codigo, 'Vehiculo', v.id),
        titulo: `${v.patente} está consumiendo más de lo normal`,
        detalle: `Las últimas cargas dan ${resultado.reciente.toFixed(1)} L cada 100 km, contra un promedio de ${resultado.promedio.toFixed(1)}: un ${subida}% más. Puede ser una falla mecánica o una pérdida.`,
        entidadTipo: 'Vehiculo',
        entidadId: v.id,
        enlace: `/vehiculos/${v.id}?pestana=combustible`,
      })
    }

    return hallazgos
  },
}

export const reglasVehiculos: Regla[] = [
  docVehiculoPorVencer,
  licenciaChoferPorVencer,
  serviceVehiculoProximo,
  solicitudViajeSinAsignar,
  viajeEnCursoDemorado,
  consumoCombustibleAlto,
]
