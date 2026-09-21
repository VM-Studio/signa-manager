import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import {
  NOMBRE_COOKIE,
  SEGUNDOS_DE_VIGENCIA,
  firmarSesion,
  verificarToken,
  type Sesion,
} from './token'

export { NOMBRE_COOKIE, firmarSesion, verificarToken }
export type { Sesion }

/* =====================================================================
   Entrar, salir y leer la sesión. Todo lo que necesita la base de datos
   o bcrypt vive acá; la firma del token está en `token.ts` porque el
   middleware también la usa.
   ===================================================================== */

export type ResultadoIngreso =
  | { ok: true; sesion: Sesion }
  | { ok: false; mensaje: string }

/**
 * Verifica email y contraseña y deja la cookie de sesión.
 * El mensaje de error es siempre el mismo: si dijera "ese email no
 * existe", cualquiera podría averiguar quién trabaja en la empresa.
 */
export async function iniciarSesion(
  email: string,
  contrasena: string,
): Promise<ResultadoIngreso> {
  const ERROR_GENERICO = 'El email o la contraseña no son correctos.'

  const usuario = await db.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      passwordHash: true,
      activo: true,
      empleadoId: true,
    },
  })

  if (!usuario) {
    // Se compara igual contra un hash inválido para que entrar con un
    // email que no existe tarde lo mismo que con uno que sí.
    await bcrypt.compare(
      contrasena,
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    )
    return { ok: false, mensaje: ERROR_GENERICO }
  }

  const coincide = await bcrypt.compare(contrasena, usuario.passwordHash)
  if (!coincide) return { ok: false, mensaje: ERROR_GENERICO }

  if (!usuario.activo) {
    return {
      ok: false,
      mensaje: 'Tu usuario está desactivado. Hablá con administración.',
    }
  }

  const sesion: Sesion = {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    empleadoId: usuario.empleadoId,
  }

  const token = await firmarSesion(sesion)
  const almacen = await cookies()

  almacen.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEGUNDOS_DE_VIGENCIA,
  })

  await db.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  })

  return { ok: true, sesion }
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies()
  almacen.delete(NOMBRE_COOKIE)
}

/** La sesión actual, o null si no hay. No tira error. */
/**
 * El estado actual del usuario del token: si sigue existiendo, si sigue
 * activo y qué accesos tiene puestos a mano.
 *
 * Va envuelto en `cache` de React: una misma pantalla pregunta por la
 * sesión en el layout, en la página y en cada query, y sin esto serían
 * cinco consultas iguales por request. Con cache es una sola.
 */
const estadoDelUsuario = cache(async (usuarioId: string) => {
  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      activo: true,
      accesos: { select: { modulo: true, permitido: true } },
    },
  })
  if (!usuario) return null

  return {
    activo: usuario.activo,
    accesos: Object.fromEntries(
      usuario.accesos.map((a) => [a.modulo, a.permitido]),
    ) as Record<string, boolean>,
  }
})

export async function obtenerSesion(): Promise<Sesion | null> {
  const almacen = await cookies()
  const token = almacen.get(NOMBRE_COOKIE)?.value
  if (!token) return null

  const sesion = await verificarToken(token)
  if (!sesion) return null

  /*
   * El token dice quién es, pero no si todavía puede entrar.
   *
   * Sin esta consulta, una cookie firmada sigue valiendo siete días
   * aunque a la persona la hayan desactivado o borrado: seguiría
   * entrando a todo. Y lo mismo con los accesos: sacarle un módulo a
   * alguien tiene que tener efecto ya, no cuando se le venza la sesión.
   *
   * Es una sola consulta por request gracias al cache de arriba.
   */
  const estado = await estadoDelUsuario(sesion.usuarioId)
  if (!estado || !estado.activo) return null

  return { ...sesion, accesos: estado.accesos }
}

/**
 * La sesión actual, o error. Va en cada Server Action y en cada query
 * del servidor: el middleware protege las rutas, pero una action se
 * puede llamar sin pasar por una ruta.
 */
export async function exigirSesion(): Promise<Sesion> {
  const sesion = await obtenerSesion()
  if (!sesion) {
    throw new Error('Necesitás iniciar sesión para hacer esto.')
  }
  return sesion
}
