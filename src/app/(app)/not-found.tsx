import { EstadoVacio } from '@/components/ui'

export default function NoEncontrado() {
  return (
    <EstadoVacio
      titulo="Esta pantalla no existe"
      mensaje="Puede que el enlace esté viejo o que la sección se haya movido."
      accion={{ texto: 'Volver al inicio', href: '/inicio' }}
    />
  )
}
