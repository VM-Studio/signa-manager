import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('obras.ver')
  if (!sesion) return <SinPermiso titulo="Obras" />

  return (
    <EnConstruccion
      titulo="Obras"
      mensaje="El módulo de obras se arma en el próximo paso."
    />
  )
}
