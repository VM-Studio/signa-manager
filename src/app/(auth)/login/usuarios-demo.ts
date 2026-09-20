import 'server-only'

import { db } from '@/lib/db'
import { NOMBRE_ROL } from '@/lib/auth/permisos'

export interface UsuarioDemo {
  nombre: string
  email: string
  rol: string
}

/**
 * Los usuarios que se listan en la sección plegable del login.
 * Solo se usa con MODO_DEMO en true: en producción esta función no se
 * llama nunca.
 */
export async function listarUsuariosDemo(): Promise<UsuarioDemo[]> {
  const usuarios = await db.usuario.findMany({
    where: { activo: true, email: { endsWith: '@signa.demo' } },
    select: { nombre: true, email: true, rol: true },
    orderBy: { rol: 'asc' },
  })

  return usuarios.map((u) => ({
    nombre: u.nombre,
    email: u.email,
    rol: NOMBRE_ROL[u.rol],
  }))
}

export function modoDemo(): boolean {
  return process.env.MODO_DEMO === 'true'
}

/** La contraseña que se muestra en la lista de usuarios de demostración. */
export const CLAVE_DEMO = 'signa2026'
