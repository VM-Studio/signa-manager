import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Personal" />

  return (
    <EnConstruccion
      titulo="Personal"
      mensaje="El módulo de personal se arma más adelante."
    />
  )
}
