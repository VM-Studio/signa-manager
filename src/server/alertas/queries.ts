import 'server-only'

import { EstadoAlerta, Rol, Severidad } from '@prisma/client'
import { db } from '@/lib/db'
import type { Sesion } from '@/lib/auth/token'
import { obrasDeLaSesion } from '@/lib/auth/obras'
import { modulosDeAlertaQueRecibe } from '@/lib/auth/permisos'
import { MODULOS_ALERTA } from '@/lib/alertas/catalogo'

/* =====================================================================
   Consultas de la bandeja de alertas.

   Cada usuario ve solo las alertas de los módulos a los que tiene
   acceso, de las obras que le corresponden y de las reglas dirigidas a
   su rol. El acceso al módulo manda: quien no entra a Vehículos no
   recibe alertas de vehículos.
   ===================================================================== */

export interface AlertaDeLista {
  id: string
  claveUnica: string
  severidad: Severidad
  titulo: string
  detalle: string
  entidadTipo: string
  entidadId: string
  enlace: string | null
  estado: EstadoAlerta
  creadaEn: Date
  resueltaEn: Date | null
  modulo: string
  nombreRegla: string
  obra: { id: string; codigo: string } | null
}

/** El filtro que arma lo que cada usuario puede ver. */
async function filtroDeLaSesion(sesion: Sesion) {
  const obraIds = await obrasDeLaSesion(sesion)

  // El dueño y administración ven las alertas de todos los roles.
  const veTodo = sesion.rol === Rol.DUENO || sesion.rol === Rol.ADMINISTRACION

  /*
   * Los módulos a los que la persona tiene acceso hoy.
   *
   * Esto manda sobre todo lo demás, incluido el "ve todo" de arriba: si
   * a alguien se le cerró Vehículos desde Accesos, no tiene por qué
   * enterarse de que venció una VTV. Un contador que suma alertas de
   * pantallas a las que no puede entrar no es información, es ruido.
   */
  const modulos = modulosDeAlertaQueRecibe(sesion, MODULOS_ALERTA)

  return {
    regla: {
      modulo: { in: modulos },
      // Y, salvo el dueño y administración, solo las reglas dirigidas
      // a su rol.
      ...(veTodo ? {} : { rolesDestino: { has: sesion.rol } }),
    },
    // Solo de las obras que le corresponden. Las alertas sin obra
    // (sistema, documentación de un empleado) las ve igual.
    ...(obraIds === null
      ? {}
      : { OR: [{ obraId: { in: obraIds } }, { obraId: null }] }),
  }
}

export async function listarAlertas(
  sesion: Sesion,
  opciones: { historial?: boolean } = {},
): Promise<AlertaDeLista[]> {
  const filtro = await filtroDeLaSesion(sesion)

  const alertas = await db.alerta.findMany({
    where: {
      ...filtro,
      estado: opciones.historial
        ? { in: [EstadoAlerta.RESUELTA, EstadoAlerta.DESCARTADA] }
        : { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
    },
    select: {
      id: true,
      claveUnica: true,
      severidad: true,
      titulo: true,
      detalle: true,
      entidadTipo: true,
      entidadId: true,
      enlace: true,
      estado: true,
      creadaEn: true,
      resueltaEn: true,
      regla: { select: { modulo: true, nombre: true } },
      obra: { select: { id: true, codigo: true } },
    },
    orderBy: opciones.historial
      ? { resueltaEn: 'desc' }
      : [{ severidad: 'desc' }, { creadaEn: 'asc' }],
    take: opciones.historial ? 50 : 200,
  })

  return alertas.map((a) => ({
    id: a.id,
    claveUnica: a.claveUnica,
    severidad: a.severidad,
    titulo: a.titulo,
    detalle: a.detalle,
    entidadTipo: a.entidadTipo,
    entidadId: a.entidadId,
    enlace: a.enlace,
    estado: a.estado,
    creadaEn: a.creadaEn,
    resueltaEn: a.resueltaEn,
    modulo: a.regla.modulo,
    nombreRegla: a.regla.nombre,
    obra: a.obra,
  }))
}

/** Los contadores de la campana del header. */
export async function contadorAlertas(
  sesion: Sesion,
): Promise<{ abiertas: number; criticas: number }> {
  const filtro = await filtroDeLaSesion(sesion)

  const [abiertas, criticas] = await Promise.all([
    db.alerta.count({
      where: {
        ...filtro,
        estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
      },
    }),
    db.alerta.count({
      where: {
        ...filtro,
        estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
        severidad: Severidad.CRITICA,
      },
    }),
  ])

  return { abiertas, criticas }
}

export async function listarReglas() {
  return db.reglaAlerta.findMany({
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      modulo: true,
      severidad: true,
      umbral: true,
      activa: true,
      rolesDestino: true,
      canales: true,
      _count: {
        select: {
          alertas: {
            where: { estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] } },
          },
        },
      },
    },
    orderBy: [{ modulo: 'asc' }, { nombre: 'asc' }],
  })
}
