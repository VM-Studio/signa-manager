import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('configuracion.ver')
  if (!sesion) return <SinPermiso titulo="Usuarios" />

  return (
    <EnConstruccion
      titulo="Usuarios"
      mensaje="La administración de usuarios se arma en el próximo paso."
    />
  )
}
