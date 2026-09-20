'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { iniciarSesion } from '@/lib/auth/sesion'
import {
  limpiarIntentos,
  puedeIntentar,
  registrarFallo,
} from '@/lib/auth/limite-intentos'

const esquema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribí tu email.')
    .email('Ese email no tiene el formato correcto.'),
  contrasena: z.string().min(1, 'Escribí tu contraseña.'),
  volverA: z.string().optional(),
})

export interface EstadoLogin {
  error?: string
  errorEmail?: string
  errorContrasena?: string
}

export async function accionIngresar(
  _previo: EstadoLogin,
  datos: FormData,
): Promise<EstadoLogin> {
  const validado = esquema.safeParse({
    email: datos.get('email'),
    contrasena: datos.get('contrasena'),
    volverA: datos.get('volverA') ?? undefined,
  })

  if (!validado.success) {
    const errores = validado.error.flatten().fieldErrors
    return {
      errorEmail: errores.email?.[0],
      errorContrasena: errores.contrasena?.[0],
    }
  }

  /*
   * Límite de intentos: la clave junta el email con la IP, así se frena
   * tanto al que prueba mil contraseñas contra un email como al que
   * prueba una contra mil emails.
   */
  const encabezados = await headers()
  const ip =
    encabezados.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    encabezados.get('x-real-ip') ??
    'desconocida'
  const clave = `${validado.data.email}|${ip}`

  const estado = puedeIntentar(clave)
  if (estado.bloqueado) {
    return {
      error: `Demasiados intentos fallidos. Probá de nuevo en ${estado.minutosParaReintentar} minutos.`,
    }
  }

  const resultado = await iniciarSesion(
    validado.data.email,
    validado.data.contrasena,
  )

  if (!resultado.ok) {
    const despues = registrarFallo(clave)

    if (despues.bloqueado) {
      return {
        error: `Demasiados intentos fallidos. Probá de nuevo en ${despues.minutosParaReintentar} minutos.`,
      }
    }

    // Se avisa cuando quedan pocos, pero sin decir si el email existe.
    return {
      error:
        despues.intentosRestantes <= 2
          ? `${resultado.mensaje} Te quedan ${despues.intentosRestantes} intentos.`
          : resultado.mensaje,
    }
  }

  limpiarIntentos(clave)

  // Se vuelve a donde quería ir, si venía de una ruta protegida.
  const destino = validado.data.volverA
  const seguro = destino && destino.startsWith('/') && !destino.startsWith('//')
  redirect(seguro ? destino : '/inicio')
}
