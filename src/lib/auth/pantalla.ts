import 'server-only'

import { exigirSesion } from './sesion'
import { puede, type Permiso } from './permisos'
import type { Sesion } from './token'

/**
 * La sesión si tiene el permiso, o null si no.
 *
 * Es para las PANTALLAS: cuando alguien llega a una sección que no le
 * corresponde queremos mostrarle un mensaje claro, no una pantalla de
 * error. En las Server Actions y en las queries se sigue usando
 * `exigirPermiso`, que tira: ahí un error es exactamente lo que
 * corresponde.
 */
export async function sesionConPermiso(
  permiso: Permiso,
): Promise<Sesion | null> {
  const sesion = await exigirSesion()
  return puede(sesion, permiso) ? sesion : null
}
