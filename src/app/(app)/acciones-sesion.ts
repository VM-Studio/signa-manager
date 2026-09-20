'use server'

import { redirect } from 'next/navigation'
import { cerrarSesion } from '@/lib/auth/sesion'

export async function accionCerrarSesion(): Promise<void> {
  await cerrarSesion()
  redirect('/login')
}
