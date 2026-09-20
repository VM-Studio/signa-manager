'use server'

import { revalidatePath } from 'next/cache'
import { EstadoAlerta, Severidad } from '@prisma/client'
import { db } from '@/lib/db'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { evaluarAlertas } from '@/lib/alertas/motor'
import { armarResumenDiario, procesarPendientes } from '@/lib/alertas/notificaciones'
import type { ResultadoEvaluacion } from '@/lib/alertas/motor'

export interface ResultadoAlerta {
  ok?: boolean
  error?: string
  mensaje?: string
}

/** Marcar una alerta como vista: deja de contar como nueva. */
export async function accionMarcarVista(
  alertaId: string,
): Promise<ResultadoAlerta> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'alertas.ver')

  await db.alerta.updateMany({
    where: { id: alertaId, estado: EstadoAlerta.ABIERTA },
    data: { estado: EstadoAlerta.VISTA },
  })

  revalidatePath('/alertas')
  return { ok: true }
}

/** Descartar con motivo: el problema existe pero se decidió convivir. */
export async function accionDescartar(
  alertaId: string,
  motivo: string,
): Promise<ResultadoAlerta> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'alertas.editar')

  if (!motivo.trim()) {
    return { error: 'Escribí por qué se descarta, así queda registrado.' }
  }

  const alerta = await db.alerta.findUnique({
    where: { id: alertaId },
    select: { detalle: true },
  })

  await db.alerta.update({
    where: { id: alertaId },
    data: {
      estado: EstadoAlerta.DESCARTADA,
      resueltaEn: new Date(),
      resueltaPorId: sesion.usuarioId,
      detalle: `${alerta?.detalle ?? ''}\n\nDescartada por ${sesion.nombre}: ${motivo.trim()}`,
    },
  })

  revalidatePath('/alertas')
  return { ok: true, mensaje: 'Alerta descartada' }
}

/** Correr el motor a mano. */
export async function accionEvaluarAhora(): Promise<ResultadoEvaluacion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'alertas.ver')

  const resultado = await evaluarAlertas()
  await procesarPendientes()

  revalidatePath('/alertas')
  revalidatePath('/inicio')
  return resultado
}

/* ------------------------ CONFIGURACIÓN ----------------------------- */

export async function accionGuardarRegla(
  reglaId: string,
  _previo: ResultadoAlerta,
  datos: FormData,
): Promise<ResultadoAlerta> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.configurar')

  const umbralTexto = String(datos.get('umbral') ?? '').trim()
  const umbral = umbralTexto === '' ? null : Number(umbralTexto)

  if (umbral !== null && (!Number.isFinite(umbral) || umbral < 0)) {
    return { error: 'El umbral tiene que ser un número mayor o igual a cero.' }
  }

  const roles = datos.getAll('rolesDestino').map(String)
  const canales = datos.getAll('canales').map(String)

  await db.reglaAlerta.update({
    where: { id: reglaId },
    data: {
      severidad: String(datos.get('severidad') ?? 'AVISO') as Severidad,
      umbral,
      activa: datos.get('activa') === 'on',
      ...(roles.length > 0 ? { rolesDestino: roles as never } : {}),
      ...(canales.length > 0 ? { canales: canales as never } : {}),
    },
  })

  revalidatePath('/mas/reglas-alerta')
  return { ok: true, mensaje: 'Regla guardada' }
}

export async function accionActivarRegla(
  reglaId: string,
  activa: boolean,
): Promise<ResultadoAlerta> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.configurar')

  await db.reglaAlerta.update({ where: { id: reglaId }, data: { activa } })

  // Al desactivar una regla, sus alertas abiertas se resuelven: no tiene
  // sentido dejar colgando avisos de algo que ya no se controla.
  if (!activa) {
    await db.alerta.updateMany({
      where: {
        reglaId,
        estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
      },
      data: { estado: EstadoAlerta.RESUELTA, resueltaEn: new Date() },
    })
  }

  revalidatePath('/mas/reglas-alerta')
  revalidatePath('/alertas')
  return { ok: true, mensaje: activa ? 'Regla activada' : 'Regla desactivada' }
}

/** El resumen diario, para mirarlo antes de conectar el canal. */
export async function accionVerResumenDiario() {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.ver')
  return armarResumenDiario()
}
