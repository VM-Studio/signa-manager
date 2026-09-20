import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Vehículos" />

  return (
    <EnConstruccion
      titulo="Vehículos"
      mensaje="El módulo de vehículos se arma más adelante."
    />
  )
}
