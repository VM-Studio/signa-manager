import { sesionConPermiso } from '@/lib/auth/pantalla'
import { choferesActivos } from '@/server/vehiculos/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioVehiculo } from '@/components/vehiculos/FormularioVehiculo'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaNuevoVehiculo() {
  const sesion = await sesionConPermiso('vehiculos.aprobar')
  if (!sesion) return <SinPermiso titulo="Nuevo vehículo" />

  const choferes = await choferesActivos()

  return (
    <>
      <EncabezadoPantalla titulo="Nuevo vehículo" volverA="/vehiculos" />
      <FormularioVehiculo choferes={choferes} />
    </>
  )
}
