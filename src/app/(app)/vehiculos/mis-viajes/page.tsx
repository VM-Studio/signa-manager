import { sesionConPermiso } from '@/lib/auth/pantalla'
import { viajesDelChofer } from '@/server/vehiculos/queries'
import { db } from '@/lib/db'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PantallaChofer } from '@/components/vehiculos/PantallaChofer'
import { EncabezadoPantalla, EstadoVacio } from '@/components/ui'

export default async function PaginaMisViajes() {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Mis viajes" />

  if (!sesion.empleadoId) {
    return (
      <>
        <EncabezadoPantalla titulo="Mis viajes" volverA="/vehiculos" />
        <EstadoVacio
          titulo="Tu usuario no está vinculado a un empleado"
          mensaje="Pedile a administración que vincule tu usuario con tu legajo para ver tus viajes."
        />
      </>
    )
  }

  const [viajes, obras] = await Promise.all([
    viajesDelChofer(sesion.empleadoId),
    db.obra.findMany({
      where: { estado: 'EN_CURSO' },
      select: { id: true, codigo: true, nombre: true },
      orderBy: { codigo: 'desc' },
    }),
  ])

  return (
    <>
      <EncabezadoPantalla titulo="Mis viajes" volverA="/vehiculos" />
      <PantallaChofer viajes={viajes} obras={obras} />
    </>
  )
}
