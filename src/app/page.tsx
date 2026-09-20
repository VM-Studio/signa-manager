import { redirect } from 'next/navigation'

/**
 * La raíz no tiene pantalla propia: el middleware manda al login si no
 * hay sesión, y si la hay, se entra directo al inicio del rol.
 */
export default function Raiz() {
  redirect('/inicio')
}
