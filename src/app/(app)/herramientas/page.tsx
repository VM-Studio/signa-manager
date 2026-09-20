import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('herramientas.ver')
  if (!sesion) return <SinPermiso titulo="Herramientas" />

  return (
    <EnConstruccion
      titulo="Herramientas"
      mensaje="El módulo de herramientas se arma en el próximo paso."
    />
  )
}
