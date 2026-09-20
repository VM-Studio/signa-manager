import { redirect } from 'next/navigation'

// Provisorio: en el prompt 3 esta ruta pasa a ser el splash de inicio.
export default function Raiz() {
  redirect('/estilo')
}
