import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('alertas.ver')
  if (!sesion) return <SinPermiso titulo="Alertas" />

  return (
    <EnConstruccion
      titulo="Alertas"
      mensaje="El motor de alertas se arma más adelante."
    />
  )
}
