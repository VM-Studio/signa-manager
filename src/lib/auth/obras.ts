import 'server-only'

import { Rol } from '@prisma/client'
import { db } from '@/lib/db'
import type { Sesion } from './token'
import { veTodasLasObras } from './permisos'

/* =====================================================================
   Qué obras le corresponden a cada sesión.

   El jefe de obra ve las obras donde figura como jefe. El capataz y la
   arquitecta, las obras donde su empleado está asignado. Todo lo que
   consulta la app filtra por acá: si no, cambiando el id en la URL un
   capataz vería los costos de una obra ajena.
   ===================================================================== */

/**
 * Los ids de obra que puede ver la sesión.
 * Devuelve null cuando ve todas: así la query de arriba no agrega ningún
 * filtro en vez de filtrar por una lista de 11 ids.
 */
export async function obrasDeLaSesion(sesion: Sesion): Promise<string[] | null> {
  if (veTodasLasObras(sesion)) return null

  if (sesion.rol === Rol.CHOFER) {
    // El chofer ve las obras a las que viaja, no las obras en sí.
    if (!sesion.empleadoId) return []
    const viajes = await db.viaje.findMany({
      where: { choferId: sesion.empleadoId, obraId: { not: null } },
      select: { obraId: true },
      distinct: ['obraId'],
    })
    return viajes.map((v) => v.obraId).filter((id): id is string => id !== null)
  }

  if (sesion.rol === Rol.JEFE_OBRA) {
    const obras = await db.obra.findMany({
      where: { jefeObraId: sesion.usuarioId },
      select: { id: true },
    })
    return obras.map((o) => o.id)
  }

  // Capataz y arquitecta: las obras donde está asignado su empleado.
  if (sesion.empleadoId) {
    const asignaciones = await db.asignacionObra.findMany({
      where: {
        empleadoId: sesion.empleadoId,
        OR: [{ hasta: null }, { hasta: { gte: new Date() } }],
      },
      select: { obraId: true },
      distinct: ['obraId'],
    })
    if (asignaciones.length > 0) return asignaciones.map((a) => a.obraId)
  }

  // La arquitecta de compras no tiene empleado vinculado: ve todas las
  // obras en curso, que es su alcance real de trabajo.
  if (sesion.rol === Rol.ARQUITECTA) {
    const obras = await db.obra.findMany({
      where: { estado: { in: ['EN_CURSO', 'PLANIFICADA', 'PAUSADA'] } },
      select: { id: true },
    })
    return obras.map((o) => o.id)
  }

  return []
}

/**
 * Filtro de Prisma listo para meter en cualquier `where` que tenga obraId.
 *   where: { ...(await filtroObras(sesion)), estado: 'EN_CURSO' }
 */
export async function filtroObras(
  sesion: Sesion,
): Promise<{ id?: { in: string[] } }> {
  const ids = await obrasDeLaSesion(sesion)
  return ids === null ? {} : { id: { in: ids } }
}

/** El mismo filtro para tablas que referencian la obra por obraId. */
export async function filtroPorObraId(
  sesion: Sesion,
): Promise<{ obraId?: { in: string[] } }> {
  const ids = await obrasDeLaSesion(sesion)
  return ids === null ? {} : { obraId: { in: ids } }
}

/** Corta el paso si la sesión no tiene nada que hacer en esa obra. */
export async function exigirAccesoAObra(
  sesion: Sesion,
  obraId: string,
): Promise<void> {
  const ids = await obrasDeLaSesion(sesion)
  if (ids === null) return
  if (!ids.includes(obraId)) {
    throw new Error('Esa obra no está entre las tuyas.')
  }
}
