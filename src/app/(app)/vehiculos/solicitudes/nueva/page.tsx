import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarObras } from '@/server/obras/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioSolicitudViaje } from '@/components/vehiculos/FormularioSolicitudViaje'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaPedirViaje() {
  const sesion = await sesionConPermiso('vehiculos.crear')
  if (!sesion) return <SinPermiso titulo="Pedir un viaje" />

  const obras = await listarObras(sesion, { estado: 'EN_CURSO' })

  return (
    <>
      <EncabezadoPantalla titulo="Pedir un viaje" volverA="/vehiculos/solicitudes" />
      <FormularioSolicitudViaje
        obras={obras.map((o) => ({ id: o.id, codigo: o.codigo, nombre: o.nombre }))}
      />
    </>
  )
}
