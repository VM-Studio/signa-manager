'use server'

import { revalidatePath } from 'next/cache'
import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { sincronizar } from '@/lib/integracion/sincronizar'
import { registrarAuditoria } from './auditoria'
import type { ResultadoSync } from '@/lib/integracion/sincronizar'

/**
 * El botón "Sincronizar ahora" de la pantalla de sincronización.
 * Es la misma función que corre el cron: no hay dos caminos distintos
 * para traer los datos.
 */
export async function accionSincronizarAhora(): Promise<ResultadoSync> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'configuracion.ver')

  const resultado = await sincronizar()

  await registrarAuditoria({
    usuarioId: sesion.usuarioId,
    accion: 'SINCRONIZAR',
    entidad: 'RegistroSync',
    entidadId: resultado.registroId,
    despues: {
      ok: resultado.ok,
      obras: resultado.obras,
      movimientos: resultado.movimientos,
      pedidos: resultado.pedidos,
    },
  })

  revalidatePath('/mas/sincronizacion')
  revalidatePath('/obras')
  revalidatePath('/tablero')

  return resultado
}
