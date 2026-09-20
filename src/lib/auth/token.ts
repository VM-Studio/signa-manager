import { SignJWT } from 'jose/jwt/sign'
import { jwtVerify } from 'jose/jwt/verify'
import type { Rol } from '@prisma/client'

/* =====================================================================
   Firma y verificación del JWT de sesión.

   Va aparte de `sesion.ts` a propósito: el middleware corre en el Edge
   Runtime y no puede cargar ni Prisma ni bcrypt. Acá no se importa nada
   más que jose, y por subrutas, para no arrastrar la parte de JWE que
   el Edge Runtime no soporta.
   ===================================================================== */

export const NOMBRE_COOKIE = 'signa_sesion'
export const DIAS_DE_VIGENCIA = 7
export const SEGUNDOS_DE_VIGENCIA = DIAS_DE_VIGENCIA * 24 * 60 * 60

export interface Sesion {
  usuarioId: string
  nombre: string
  email: string
  rol: Rol
  /** Empleado vinculado, si lo tiene: el capataz y el chofer lo usan. */
  empleadoId: string | null
}

function claveSecreta(): Uint8Array {
  const secreto = process.env.AUTH_SECRET
  if (!secreto || secreto.length < 16) {
    throw new Error(
      'Falta AUTH_SECRET o es muy corto. Generá uno con: openssl rand -base64 48',
    )
  }
  return new TextEncoder().encode(secreto)
}

export async function firmarSesion(sesion: Sesion): Promise<string> {
  return new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('signa')
    .setAudience('signa-app')
    .setExpirationTime(`${DIAS_DE_VIGENCIA}d`)
    .sign(claveSecreta())
}

/** La sesión que guarda el token, o null si el token no sirve. */
export async function verificarToken(token: string): Promise<Sesion | null> {
  try {
    const { payload } = await jwtVerify(token, claveSecreta(), {
      issuer: 'signa',
      audience: 'signa-app',
    })

    if (
      typeof payload.usuarioId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.rol !== 'string'
    ) {
      return null
    }

    return {
      usuarioId: payload.usuarioId,
      nombre: typeof payload.nombre === 'string' ? payload.nombre : '',
      email: payload.email,
      rol: payload.rol as Rol,
      empleadoId:
        typeof payload.empleadoId === 'string' ? payload.empleadoId : null,
    }
  } catch {
    // Token vencido, manipulado o firmado con otro secreto.
    return null
  }
}
