'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { iniciarSesion } from '@/lib/auth/sesion'

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

  const resultado = await iniciarSesion(
    validado.data.email,
    validado.data.contrasena,
  )

  if (!resultado.ok) {
    return { error: resultado.mensaje }
  }

  // Se vuelve a donde quería ir, si venía de una ruta protegida.
  const destino = validado.data.volverA
  const seguro = destino && destino.startsWith('/') && !destino.startsWith('//')
  redirect(seguro ? destino : '/inicio')
}
