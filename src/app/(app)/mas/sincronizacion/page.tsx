import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('configuracion.ver')
  if (!sesion) return <SinPermiso titulo="Sincronización" />

  return (
    <EnConstruccion
      titulo="Sincronización"
      mensaje="La pantalla de sincronización se arma en el próximo paso."
    />
  )
}
