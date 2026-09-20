'use server'

import { revalidatePath } from 'next/cache'
import {
  Asistencia,
  Clima,
  EstadoParte,
  EstadoQuincena,
  Prisma,
} from '@prisma/client'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { exigirAccesoAObra } from '@/lib/auth/obras'
import { registrarAuditoria } from '@/server/nucleo/auditoria'
import { reevaluarModulos } from '@/lib/alertas/motor'
import {
  costoLinea,
  hayErrores,
  quincenaDe,
  sePuedeAprobar,
  sePuedeCorregir,
  validarParte,
  type LineaParte,
  type ProblemaParte,
} from './reglas'

/* =====================================================================
   El parte diario.

   Lo carga un capataz en el celular, parado en la obra, y tiene que
   poder completarse en menos de dos minutos. Por eso:
   · al abrir ya vienen todos los asignados como presentes con 8 horas
   · se guarda solo como borrador mientras se completa
   · "Enviar parte" es un solo toque
   ===================================================================== */

export interface ResultadoParte {
  ok?: boolean
  error?: string
  problemas?: ProblemaParte[]
  parteId?: string
  mensaje?: string
}

export interface LineaEnviada {
  empleadoId: string
  asistencia: Asistencia
  horasNormales: number
  horasExtra50: number
  horasExtra100: number
  tarea: string | null
}

export interface ParteEnviado {
  obraId: string
  fecha: string
  clima: Clima
  tareasDelDia: string | null
  observaciones: string | null
  lineas: LineaEnviada[]
  subcontratistas: Array<{ subcontratistaId: string; cantidadPersonas: number; tarea: string | null }>
  /** true = "Enviar parte"; false = solo guardar el borrador. */
  enviar: boolean
}

/** Valor hora vigente de cada empleado en una fecha. */
async function valoresHora(
  empleadoIds: string[],
  fecha: Date,
): Promise<Map<string, number>> {
  const [empleados, historial] = await Promise.all([
    db.empleado.findMany({
      where: { id: { in: empleadoIds } },
      select: { id: true, valorHora: true },
    }),
    db.historialValorHora.findMany({
      where: { empleadoId: { in: empleadoIds }, desde: { lte: fecha } },
      select: { empleadoId: true, valorHora: true, desde: true },
      orderBy: { desde: 'desc' },
    }),
  ])

  const mapa = new Map<string, number>()
  // El valor actual como respaldo.
  for (const e of empleados) mapa.set(e.id, Number(e.valorHora))
  // Y el del historial, que es el que corresponde a esa fecha.
  for (const h of historial) {
    if (!mapa.has(`hist-${h.empleadoId}`)) {
      mapa.set(h.empleadoId, Number(h.valorHora))
      mapa.set(`hist-${h.empleadoId}`, 1)
    }
  }
  for (const id of empleadoIds) mapa.delete(`hist-${id}`)

  return mapa
}

/** ¿Está bloqueado el período por una quincena cerrada? */
async function quincenaCerrada(fecha: Date): Promise<boolean> {
  const rango = quincenaDe(fecha)
  const quincena = await db.quincena.findUnique({
    where: {
      anio_mes_numero: {
        anio: rango.anio,
        mes: rango.mes,
        numero: rango.numero,
      },
    },
    select: { estado: true },
  })
  return quincena !== null && quincena.estado !== EstadoQuincena.ABIERTA
}

/** Dónde más figura cada empleado ese día, para la doble presencia. */
async function presenciasEnOtrasObras(
  empleadoIds: string[],
  fecha: Date,
  obraIdActual: string,
): Promise<Map<string, Array<{ obra: string; horas: number }>>> {
  const lineas = await db.parteDiarioLinea.findMany({
    where: {
      empleadoId: { in: empleadoIds },
      asistencia: { in: [Asistencia.PRESENTE, Asistencia.MEDIA_JORNADA] },
      parte: { fecha, obraId: { not: obraIdActual } },
    },
    select: {
      empleadoId: true,
      horasNormales: true,
      horasExtra50: true,
      horasExtra100: true,
      parte: { select: { obra: { select: { codigo: true } } } },
    },
  })

  const mapa = new Map<string, Array<{ obra: string; horas: number }>>()
  for (const l of lineas) {
    const lista = mapa.get(l.empleadoId) ?? []
    lista.push({
      obra: l.parte.obra.codigo,
      horas:
        Number(l.horasNormales) +
        Number(l.horasExtra50) +
        Number(l.horasExtra100),
    })
    mapa.set(l.empleadoId, lista)
  }
  return mapa
}

/* ------------------------ GUARDAR Y ENVIAR -------------------------- */

export async function accionGuardarParte(
  datos: ParteEnviado,
): Promise<ResultadoParte> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.crear')
  await exigirAccesoAObra(sesion, datos.obraId)

  const fecha = new Date(`${datos.fecha}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) {
    return { error: 'Esa fecha no es válida.' }
  }

  if (await quincenaCerrada(fecha)) {
    return {
      error:
        'La quincena de ese día ya está cerrada. No se pueden cargar ni editar partes de ese período.',
    }
  }

  const existente = await db.parteDiario.findUnique({
    where: { obraId_fecha: { obraId: datos.obraId, fecha } },
    select: { id: true, estado: true },
  })

  // Un parte aprobado no se toca.
  if (existente && !sePuedeCorregir(existente.estado)) {
    return {
      error: 'Ese parte ya está aprobado. Pedile a administración que lo reabra.',
    }
  }

  const empleadoIds = datos.lineas.map((l) => l.empleadoId)
  const empleados = await db.empleado.findMany({
    where: { id: { in: empleadoIds } },
    select: { id: true, nombre: true, apellido: true },
  })
  const nombres = new Map(
    empleados.map((e) => [e.id, `${e.nombre} ${e.apellido}`]),
  )

  const paraValidar: LineaParte[] = datos.lineas.map((l) => ({
    empleadoId: l.empleadoId,
    nombre: nombres.get(l.empleadoId) ?? 'Empleado',
    asistencia: l.asistencia,
    horasNormales: l.horasNormales,
    horasExtra50: l.horasExtra50,
    horasExtra100: l.horasExtra100,
    tarea: l.tarea,
  }))

  // La doble presencia solo se chequea al enviar: mientras es borrador
  // el capataz está a mitad de camino y no hay que molestarlo.
  const otras = datos.enviar
    ? await presenciasEnOtrasObras(empleadoIds, fecha, datos.obraId)
    : new Map()

  const problemas = validarParte(paraValidar, otras)

  if (datos.enviar && hayErrores(problemas)) {
    return { problemas, error: 'Revisá lo que está marcado antes de enviar.' }
  }

  const estado = datos.enviar ? EstadoParte.ENVIADO : EstadoParte.BORRADOR

  const parte = await db.$transaction(async (tx) => {
    const guardado = existente
      ? await tx.parteDiario.update({
          where: { id: existente.id },
          data: {
            clima: datos.clima,
            tareasDelDia: datos.tareasDelDia,
            observaciones: datos.observaciones,
            estado,
            enviadoEn: datos.enviar ? new Date() : null,
          },
        })
      : await tx.parteDiario.create({
          data: {
            obraId: datos.obraId,
            fecha,
            clima: datos.clima,
            tareasDelDia: datos.tareasDelDia,
            observaciones: datos.observaciones,
            estado,
            cargadoPorId: sesion.usuarioId,
            enviadoEn: datos.enviar ? new Date() : null,
          },
        })

    // Las líneas se reemplazan enteras: es más simple y más seguro que
    // ir diffeando, y son diez o veinte filas.
    await tx.parteDiarioLinea.deleteMany({ where: { parteId: guardado.id } })

    if (datos.lineas.length > 0) {
      await tx.parteDiarioLinea.createMany({
        data: datos.lineas.map((l) => ({
          parteId: guardado.id,
          empleadoId: l.empleadoId,
          asistencia: l.asistencia,
          horasNormales: new Prisma.Decimal(l.horasNormales.toFixed(2)),
          horasExtra50: new Prisma.Decimal(l.horasExtra50.toFixed(2)),
          horasExtra100: new Prisma.Decimal(l.horasExtra100.toFixed(2)),
          tarea: l.tarea,
          // El costo se congela recién al aprobar.
          valorHoraAplicado: null,
          costoCalculado: null,
        })),
      })
    }

    await tx.parteSubcontratista.deleteMany({ where: { parteId: guardado.id } })
    if (datos.subcontratistas.length > 0) {
      await tx.parteSubcontratista.createMany({
        data: datos.subcontratistas.map((s) => ({
          parteId: guardado.id,
          subcontratistaId: s.subcontratistaId,
          cantidadPersonas: s.cantidadPersonas,
          tarea: s.tarea,
        })),
      })
    }

    return guardado
  })

  // Cargar el parte cierra la alerta de "parte faltante".
  if (datos.enviar) await reevaluarModulos(['personal'])

  revalidatePath('/personal/partes')
  revalidatePath('/inicio')
  revalidatePath(`/obras/${datos.obraId}`)
  revalidatePath('/alertas')

  return {
    ok: true,
    parteId: parte.id,
    problemas: problemas.filter((p) => p.nivel === 'aviso'),
    mensaje: datos.enviar ? 'Parte enviado' : 'Borrador guardado',
  }
}

/* ---------------------------- APROBAR ------------------------------- */

/**
 * Aprobar congela el valor hora y el costo de cada línea.
 * Un aumento posterior no puede reescribir la historia.
 */
export async function accionAprobarParte(
  parteId: string,
): Promise<ResultadoParte> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.aprobar')

  const parte = await db.parteDiario.findUnique({
    where: { id: parteId },
    select: {
      id: true,
      obraId: true,
      fecha: true,
      estado: true,
      lineas: {
        select: {
          id: true,
          empleadoId: true,
          horasNormales: true,
          horasExtra50: true,
          horasExtra100: true,
        },
      },
    },
  })
  if (!parte) return { error: 'Ese parte no existe.' }

  await exigirAccesoAObra(sesion, parte.obraId)

  if (!sePuedeAprobar(parte.estado)) {
    return {
      error:
        parte.estado === EstadoParte.APROBADO
          ? 'Ese parte ya está aprobado.'
          : 'El capataz todavía no lo envió.',
    }
  }

  if (await quincenaCerrada(parte.fecha)) {
    return { error: 'La quincena de ese día ya está cerrada.' }
  }

  const valores = await valoresHora(
    parte.lineas.map((l) => l.empleadoId),
    parte.fecha,
  )

  await db.$transaction(async (tx) => {
    for (const l of parte.lineas) {
      const vh = valores.get(l.empleadoId) ?? 0
      const costo = costoLinea(
        vh,
        Number(l.horasNormales),
        Number(l.horasExtra50),
        Number(l.horasExtra100),
      )

      await tx.parteDiarioLinea.update({
        where: { id: l.id },
        data: {
          valorHoraAplicado: new Prisma.Decimal(vh.toFixed(2)),
          costoCalculado: new Prisma.Decimal(costo.toFixed(2)),
        },
      })
    }

    await tx.parteDiario.update({
      where: { id: parteId },
      data: {
        estado: EstadoParte.APROBADO,
        aprobadoPorId: sesion.usuarioId,
        aprobadoEn: new Date(),
      },
    })
  })

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'APROBAR',
    entidad: 'ParteDiario',
    entidadId: parteId,
    despues: { lineas: parte.lineas.length },
  })

  // Aprobar cierra la alerta de "parte sin aprobar" y puede abrir la de
  // presupuesto de mano de obra: las dos se reevalúan ahora.
  await reevaluarModulos(['personal', 'obras'])

  revalidatePath('/personal/partes')
  revalidatePath(`/obras/${parte.obraId}`)
  revalidatePath('/inicio')
  revalidatePath('/alertas')

  return { ok: true, mensaje: 'Parte aprobado' }
}

/** Aprobar varios de una: el jefe de obra revisa la semana entera. */
export async function accionAprobarVarios(
  parteIds: string[],
): Promise<ResultadoParte> {
  let aprobados = 0
  const fallados: string[] = []

  for (const id of parteIds) {
    const r = await accionAprobarParte(id)
    if (r.ok) aprobados += 1
    else if (r.error) fallados.push(r.error)
  }

  if (aprobados === 0) {
    return { error: fallados[0] ?? 'No se pudo aprobar ninguno.' }
  }

  return {
    ok: true,
    mensaje: `${aprobados} parte${aprobados === 1 ? '' : 's'} aprobado${aprobados === 1 ? '' : 's'}`,
  }
}

/** Devolver un parte al capataz para que lo corrija. */
export async function accionReabrirParte(
  parteId: string,
  motivo: string,
): Promise<ResultadoParte> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.aprobar')

  if (!motivo.trim()) {
    return { error: 'Escribí qué hay que corregir, así el capataz sabe.' }
  }

  const parte = await db.parteDiario.findUnique({
    where: { id: parteId },
    select: { id: true, obraId: true, fecha: true, estado: true, observaciones: true },
  })
  if (!parte) return { error: 'Ese parte no existe.' }
  await exigirAccesoAObra(sesion, parte.obraId)

  if (await quincenaCerrada(parte.fecha)) {
    return { error: 'La quincena de ese día ya está cerrada.' }
  }

  await db.$transaction(async (tx) => {
    // Al volver a borrador se descongela el costo.
    await tx.parteDiarioLinea.updateMany({
      where: { parteId },
      data: { valorHoraAplicado: null, costoCalculado: null },
    })
    await tx.parteDiario.update({
      where: { id: parteId },
      data: {
        estado: EstadoParte.BORRADOR,
        aprobadoPorId: null,
        aprobadoEn: null,
        enviadoEn: null,
        observaciones: [parte.observaciones, `Devuelto para corregir: ${motivo.trim()}`]
          .filter(Boolean)
          .join('\n'),
      },
    })
  })

  revalidatePath('/personal/partes')
  return { ok: true, mensaje: 'Parte devuelto al capataz' }
}
