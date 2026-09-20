import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('configuracion.configurar')
  if (!sesion) return <SinPermiso titulo="Unidades de negocio" />

  return (
    <EnConstruccion
      titulo="Unidades de negocio"
      mensaje="La configuración de unidades de negocio se arma en el próximo paso."
    />
  )
}
