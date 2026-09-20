'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { exigirAccesoAObra } from '@/lib/auth/obras'

export interface ResultadoAsignacion {
  ok?: boolean
  error?: string
  aviso?: string
  mensaje?: string
}

/**
 * Asignar a una obra: un empleado, una cuadrilla entera o un
 * subcontratista.
 *
 * Si la persona ya está asignada a otra obra en el mismo período se
 * avisa, pero no se bloquea: pasa de verdad que alguien parte la semana
 * entre dos obras.
 */
export async function accionAsignarAObra(
  _previo: ResultadoAsignacion,
  datos: FormData,
): Promise<ResultadoAsignacion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.crear')

  const obraId = String(datos.get('obraId') ?? '')
  if (!obraId) return { error: 'Elegí la obra.' }
  await exigirAccesoAObra(sesion, obraId)

  const empleadoId = String(datos.get('empleadoId') ?? '') || null
  const cuadrillaId = String(datos.get('cuadrillaId') ?? '') || null
  const subcontratistaId = String(datos.get('subcontratistaId') ?? '') || null

  if (!empleadoId && !cuadrillaId && !subcontratistaId) {
    return { error: 'Elegí a quién asignar.' }
  }

  const desdeTexto = String(datos.get('desde') ?? '')
  const hastaTexto = String(datos.get('hasta') ?? '')

  const desde = desdeTexto ? new Date(`${desdeTexto}T00:00:00`) : new Date()
  const hasta = hastaTexto ? new Date(`${hastaTexto}T00:00:00`) : null

  if (Number.isNaN(desde.getTime())) return { error: 'Esa fecha no es válida.' }
  if (hasta && hasta < desde) {
    return { error: 'La fecha de fin no puede ser anterior a la de inicio.' }
  }

  const tarea = String(datos.get('tarea') ?? '') || null

  // ¿Ya está en otra obra en ese período?
  let aviso: string | undefined
  if (empleadoId) {
    const superpuesta = await db.asignacionObra.findFirst({
      where: {
        empleadoId,
        obraId: { not: obraId },
        desde: { lte: hasta ?? new Date('2100-01-01') },
        OR: [{ hasta: null }, { hasta: { gte: desde } }],
      },
      select: { obra: { select: { codigo: true } } },
    })
    if (superpuesta) {
      aviso = `Ya está asignado a ${superpuesta.obra.codigo} en ese mismo período.`
    }
  }

  // Asignar una cuadrilla asigna también a su gente: si no, el parte
  // diario no los trae y el capataz los tiene que agregar a mano.
  if (cuadrillaId) {
    const cuadrilla = await db.cuadrilla.findUnique({
      where: { id: cuadrillaId },
      select: {
        capatazId: true,
        miembros: { select: { empleadoId: true } },
      },
    })

    if (cuadrilla) {
      const integrantes = [
        ...(cuadrilla.capatazId ? [cuadrilla.capatazId] : []),
        ...cuadrilla.miembros.map((m) => m.empleadoId),
      ]

      await db.$transaction(async (tx) => {
        await tx.asignacionObra.create({
          data: { obraId, cuadrillaId, desde, hasta, tarea },
        })

        for (const id of integrantes) {
          const yaEsta = await tx.asignacionObra.findFirst({
            where: {
              empleadoId: id,
              obraId,
              desde: { lte: hasta ?? new Date('2100-01-01') },
              OR: [{ hasta: null }, { hasta: { gte: desde } }],
            },
            select: { id: true },
          })
          if (!yaEsta) {
            await tx.asignacionObra.create({
              data: { obraId, empleadoId: id, desde, hasta, tarea },
            })
          }
        }
      })

      revalidatePath('/personal/planificacion')
      return {
        ok: true,
        mensaje: `Cuadrilla asignada con ${integrantes.length} persona${integrantes.length === 1 ? '' : 's'}`,
      }
    }
  }

  await db.asignacionObra.create({
    data: { obraId, empleadoId, subcontratistaId, desde, hasta, tarea },
  })

  revalidatePath('/personal/planificacion')
  revalidatePath(`/obras/${obraId}`)
  return { ok: true, aviso, mensaje: 'Asignación creada' }
}

/** Sacar a alguien de una obra. */
export async function accionQuitarAsignacion(
  asignacionId: string,
): Promise<ResultadoAsignacion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'personal.editar')

  const asignacion = await db.asignacionObra.findUnique({
    where: { id: asignacionId },
    select: { obraId: true },
  })
  if (!asignacion) return { error: 'Esa asignación no existe.' }
  await exigirAccesoAObra(sesion, asignacion.obraId)

  // Se cierra con fecha de hoy en vez de borrarla: los partes que ya se
  // cargaron con esa asignación tienen que seguir teniendo sentido.
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  await db.asignacionObra.update({
    where: { id: asignacionId },
    data: { hasta: hoy },
  })

  revalidatePath('/personal/planificacion')
  revalidatePath(`/obras/${asignacion.obraId}`)
  return { ok: true, mensaje: 'Asignación cerrada' }
}
