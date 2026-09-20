import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('configuracion.configurar')
  if (!sesion) return <SinPermiso titulo="Reglas de alerta" />

  return (
    <EnConstruccion
      titulo="Reglas de alerta"
      mensaje="La configuración de alertas se arma junto con el motor."
    />
  )
}
