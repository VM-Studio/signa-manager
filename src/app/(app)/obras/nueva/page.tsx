import { sesionConPermiso } from '@/lib/auth/pantalla'
import { jefesDeObraDisponibles, unidadesActivas } from '@/server/obras/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioObra } from '@/components/obras/FormularioObra'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaNuevaObra() {
  const sesion = await sesionConPermiso('obras.crear')
  if (!sesion) return <SinPermiso titulo="Nueva obra" />

  const [unidades, jefes] = await Promise.all([
    unidadesActivas(),
    jefesDeObraDisponibles(),
  ])

  return (
    <>
      <EncabezadoPantalla titulo="Nueva obra" volverA="/obras" />
      <FormularioObra unidades={unidades} jefes={jefes} />
    </>
  )
}
