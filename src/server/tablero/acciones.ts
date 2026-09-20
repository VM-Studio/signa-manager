'use server'

import { exigirSesion } from '@/lib/auth/sesion'
import { exigirPermiso } from '@/lib/auth/permisos'
import { explicarCifra, type Explicacion, type TipoCifra } from './queries'

/** El "¿de dónde sale este número?" de cada cifra del tablero. */
export async function accionExplicar(
  tipo: TipoCifra,
  obraId: string | null,
  desdeTexto: string,
  hastaTexto: string,
): Promise<Explicacion> {
  const sesion = await exigirSesion()
  exigirPermiso(sesion, 'tablero.ver')

  return explicarCifra(
    tipo,
    obraId,
    new Date(desdeTexto),
    new Date(hastaTexto),
  )
}
