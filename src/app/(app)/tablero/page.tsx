import { sesionConPermiso } from '@/lib/auth/pantalla'
import { EnConstruccion } from '@/components/app/EnConstruccion'
import { SinPermiso } from '@/components/app/SinPermiso'

export default async function Pagina() {
  const sesion = await sesionConPermiso('tablero.ver')
  if (!sesion) return <SinPermiso titulo="Tablero" />

  return (
    <EnConstruccion
      titulo="Tablero"
      mensaje="El tablero del dueño se arma al final, cuando todos los módulos carguen datos."
    />
  )
}
