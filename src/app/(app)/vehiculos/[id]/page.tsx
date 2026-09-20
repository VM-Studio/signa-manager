import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import {
  choferesActivos,
  indicadoresVehiculo,
  obtenerVehiculo,
} from '@/server/vehiculos/queries'
import { obrasParaSelector } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FichaVehiculo } from '@/components/vehiculos/FichaVehiculo'
import { EncabezadoPantalla } from '@/components/ui'
import { patente } from '@/lib/formato'

export default async function PaginaVehiculo({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Vehículo" />

  const { id } = await params
  const [vehiculo, indicadores, obras, choferes] = await Promise.all([
    obtenerVehiculo(id),
    indicadoresVehiculo(id),
    obrasParaSelector(),
    choferesActivos(),
  ])
  if (!vehiculo) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo={patente(vehiculo.patente)}
        subtitulo={`${vehiculo.marca} ${vehiculo.modelo}`}
        volverA="/vehiculos"
      />
      <FichaVehiculo
        vehiculo={vehiculo}
        indicadores={indicadores}
        obras={obras}
        choferes={choferes}
        puedeGestionar={puede(sesion, 'vehiculos.aprobar')}
        puedeCargarCombustible={puede(sesion, 'vehiculos.editar')}
      />
    </>
  )
}
