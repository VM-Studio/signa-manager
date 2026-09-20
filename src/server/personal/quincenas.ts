'use server'

import { revalidatePath } from 'next/cache'
import {
  Asistencia,
  EstadoParte,
  EstadoQuincena,
  MedioPago,
  Prisma,
  TipoNovedad,
} from '@prisma/client'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { registrarAuditoria } from '@/server/nucleo/auditoria'
import { diasHabilesEntre, pendientesDeCierre, quincenaDe } from './reglas'

export interface ResultadoQuincena {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
  mensaje?: string
  id?: string
}

/* ---------------------- QUÉ FALTA PARA CERRAR ----------------------- */

export interface Pendiente {
  tipo: 'parte_sin_aprobar' | 'dia_sin_parte'
  obra: string
  fecha: Date
  detalle: string
}

/**
 * Antes de cerrar, qué queda afuera: partes sin aprobar y días hábiles
 * sin parte. No bloquea el cierre, pero administración tiene que saber
 * qué horas no van a entrar en la liquidación.
 */
export async function revisarAntesDeCerrar(
  quincenaId: string,
): Promise<Pendiente[]> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.aprobar')

  const quincena = await db.quincena.findUnique({
    where: { id: quincenaId },
    select: { desde: true, hasta: true },
  })
  if (!quincena) return []

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const hasta = quincena.hasta > hoy ? hoy : quincena.hasta

  const [partes, obrasConGente] = await Promise.all([
    db.parteDiario.findMany({
      where: { fecha: { gte: quincena.desde, lte: hasta } },
      select: {
        obraId: true,
        fecha: true,
        estado: true,
        obra: { select: { codigo: true } },
      },
    }),
    db.obra.findMany({
      where: {
        estado: 'EN_CURSO',
        asignaciones: {
          some: {
            empleadoId: { not: null },
            desde: { lte: hasta },
            OR: [{ hasta: null }, { hasta: { gte: quincena.desde } }],
          },
        },
      },
      select: { id: true, codigo: true },
    }),
  ])

  return pendientesDeCierre(
    diasHabilesEntre(quincena.desde, hasta),
    partes.map((p) => ({
      obraId: p.obraId,
      obra: p.obra.codigo,
      fecha: p.fecha,
      estado: p.estado,
    })),
    obrasConGente,
  )
}

/* --------------------------- CERRAR --------------------------------- */

/**
 * Cerrar la quincena genera las QuincenaLinea (la foto por empleado y
 * obra) y bloquea los partes del período.
 */
export async function accionCerrarQuincena(
  quincenaId: string,
): Promise<ResultadoQuincena> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.aprobar')

  const quincena = await db.quincena.findUnique({
    where: { id: quincenaId },
    select: { id: true, desde: true, hasta: true, estado: true },
  })
  if (!quincena) return { error: 'Esa quincena no existe.' }
  if (quincena.estado !== EstadoQuincena.ABIERTA) {
    return { error: 'Esa quincena ya está cerrada.' }
  }

  const partes = await db.parteDiario.findMany({
    where: {
      estado: EstadoParte.APROBADO,
      fecha: { gte: quincena.desde, lte: quincena.hasta },
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

  // Se acumula por empleado + obra, que es la granularidad que el
  // estudio contable necesita.
  const acumulado = new Map<
    string,
    {
      empleadoId: string
      obraId: string
      dias: number
      normales: number
      extra50: number
      extra100: number
      ausencias: number
      costo: number
    }
  >()

  for (const p of partes) {
    for (const l of p.lineas) {
      const clave = `${l.empleadoId}|${p.obraId}`
      const actual = acumulado.get(clave) ?? {
        empleadoId: l.empleadoId,
        obraId: p.obraId,
        dias: 0,
        normales: 0,
        extra50: 0,
        extra100: 0,
        ausencias: 0,
        costo: 0,
      }

      if (
        l.asistencia === Asistencia.PRESENTE ||
        l.asistencia === Asistencia.MEDIA_JORNADA
      ) {
        actual.dias += 1
      }
      if (
        l.asistencia === Asistencia.AUSENTE_CON_AVISO ||
        l.asistencia === Asistencia.AUSENTE_SIN_AVISO
      ) {
        actual.ausencias += 1
      }

      actual.normales += Number(l.horasNormales)
      actual.extra50 += Number(l.horasExtra50)
      actual.extra100 += Number(l.horasExtra100)
      actual.costo += Number(l.costoCalculado ?? 0)

      acumulado.set(clave, actual)
    }
  }

  const decimal = (n: number) => new Prisma.Decimal(n.toFixed(2))

  await db.$transaction(async (tx) => {
    // Por si se reabrió alguna vez.
    await tx.quincenaLinea.deleteMany({ where: { quincenaId } })

    if (acumulado.size > 0) {
      await tx.quincenaLinea.createMany({
        data: [...acumulado.values()].map((a) => ({
          quincenaId,
          empleadoId: a.empleadoId,
          obraId: a.obraId,
          diasTrabajados: a.dias,
          horasNormales: decimal(a.normales),
          horasExtra50: decimal(a.extra50),
          horasExtra100: decimal(a.extra100),
          ausencias: a.ausencias,
          costo: decimal(a.costo),
        })),
      })
    }

    // Las novedades del período quedan atadas a la quincena.
    await tx.novedadPersonal.updateMany({
      where: {
        quincenaId: null,
        fecha: { gte: quincena.desde, lte: quincena.hasta },
      },
      data: { quincenaId },
    })

    await tx.quincena.update({
      where: { id: quincenaId },
      data: {
        estado: EstadoQuincena.CERRADA,
        cerradaEn: new Date(),
        cerradaPorId: sesion.usuarioId,
      },
    })
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'CERRAR',
    entidad: 'Quincena',
    entidadId: quincenaId,
    despues: { lineas: acumulado.size },
  })

  revalidatePath('/personal/quincenas')
  return {
    ok: true,
    mensaje: `Quincena cerrada con ${acumulado.size} línea${acumulado.size === 1 ? '' : 's'}`,
  }
}

/** Marcar que el resumen ya se le mandó al estudio contable. */
export async function accionMarcarEnviadaAlEstudio(
  quincenaId: string,
): Promise<ResultadoQuincena> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.aprobar')

  const quincena = await db.quincena.findUnique({
    where: { id: quincenaId },
    select: { estado: true },
  })
  if (quincena?.estado !== EstadoQuincena.CERRADA) {
    return { error: 'Primero hay que cerrar la quincena.' }
  }

  await db.quincena.update({
    where: { id: quincenaId },
    data: { estado: EstadoQuincena.ENVIADA_AL_ESTUDIO },
  })

  revalidatePath('/personal/quincenas')
  return { ok: true, mensaje: 'Marcada como enviada al estudio' }
}

export async function accionMarcarPagada(
  quincenaId: string,
): Promise<ResultadoQuincena> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.aprobar')

  await db.quincena.update({
    where: { id: quincenaId },
    data: { estado: EstadoQuincena.PAGADA },
  })

  revalidatePath('/personal/quincenas')
  return { ok: true, mensaje: 'Quincena marcada como pagada' }
}

/** Crear la quincena en curso si todavía no existe. */
export async function accionAbrirQuincenaActual(): Promise<ResultadoQuincena> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.aprobar')

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const rango = quincenaDe(hoy)

  const existente = await db.quincena.findUnique({
    where: {
      anio_mes_numero: {
        anio: rango.anio,
        mes: rango.mes,
        numero: rango.numero,
      },
    },
    select: { id: true },
  })
  if (existente) return { ok: true, id: existente.id }

  const creada = await db.quincena.create({
    data: {
      anio: rango.anio,
      mes: rango.mes,
      numero: rango.numero,
      desde: rango.desde,
      hasta: rango.hasta,
      estado: EstadoQuincena.ABIERTA,
    },
  })

  revalidatePath('/personal/quincenas')
  return { ok: true, id: creada.id, mensaje: 'Quincena abierta' }
}

/* --------------------------- NOVEDADES ------------------------------ */

export async function accionRegistrarNovedad(
  _previo: ResultadoQuincena,
  datos: FormData,
): Promise<ResultadoQuincena> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  const empleadoId = String(datos.get('empleadoId') ?? '')
  const tipo = String(datos.get('tipo') ?? '') as TipoNovedad
  const montoTexto = String(datos.get('monto') ?? '').trim()
  const fechaTexto = String(datos.get('fecha') ?? '')

  if (!empleadoId) return { errores: { empleadoId: 'Elegí el empleado.' } }

  const monto = Number(montoTexto.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(monto) || monto <= 0) {
    return { errores: { monto: 'Poné un monto mayor a cero.' } }
  }

  const fecha = fechaTexto ? new Date(`${fechaTexto}T00:00:00`) : new Date()
  if (Number.isNaN(fecha.getTime())) {
    return { errores: { fecha: 'Esa fecha no es válida.' } }
  }

  const obraId = String(datos.get('obraId') ?? '') || null

  await db.novedadPersonal.create({
    data: {
      empleadoId,
      tipo,
      fecha,
      monto: new Prisma.Decimal(monto.toFixed(2)),
      descripcion: String(datos.get('descripcion') ?? '') || null,
      obraId,
    },
  })

  revalidatePath('/personal/quincenas')
  revalidatePath(`/personal/empleados/${empleadoId}`)
  return { ok: true, mensaje: 'Novedad registrada' }
}

/* ----------------------------- PAGOS -------------------------------- */

export async function accionRegistrarPago(
  _previo: ResultadoQuincena,
  datos: FormData,
): Promise<ResultadoQuincena> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  const empleadoId = String(datos.get('empleadoId') ?? '') || null
  const subcontratistaId = String(datos.get('subcontratistaId') ?? '') || null

  if (!empleadoId && !subcontratistaId) {
    return { error: 'Elegí a quién se le paga.' }
  }

  const montoTexto = String(datos.get('monto') ?? '').trim()
  const monto = Number(montoTexto.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(monto) || monto <= 0) {
    return { errores: { monto: 'Poné un monto mayor a cero.' } }
  }

  const fechaTexto = String(datos.get('fecha') ?? '')
  const fecha = fechaTexto ? new Date(`${fechaTexto}T00:00:00`) : new Date()

  await db.pagoPersonal.create({
    data: {
      empleadoId,
      subcontratistaId,
      quincenaId: String(datos.get('quincenaId') ?? '') || null,
      fecha,
      monto: new Prisma.Decimal(monto.toFixed(2)),
      medio: (String(datos.get('medio') ?? '') as MedioPago) || MedioPago.TRANSFERENCIA,
      concepto: String(datos.get('concepto') ?? '') || null,
    },
  })

  revalidatePath('/personal/quincenas')
  return { ok: true, mensaje: 'Pago registrado' }
}
