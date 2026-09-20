import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { asistenciaDelMes, obtenerEmpleado } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FichaEmpleado } from '@/components/personal/FichaEmpleado'
import { EncabezadoPantalla } from '@/components/ui'
import { nombreNatural } from '@/lib/formato'

export default async function PaginaEmpleado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Empleado" />

  const { id } = await params
  const empleado = await obtenerEmpleado(id)
  if (!empleado) notFound()

  const hoy = new Date()
  const asistencia = await asistenciaDelMes(
    id,
    hoy.getFullYear(),
    hoy.getMonth() + 1,
  )

  return (
    <>
      <EncabezadoPantalla
        titulo={nombreNatural(empleado)}
        subtitulo={`Legajo ${empleado.legajo}`}
        volverA="/personal/empleados"
      />
      <FichaEmpleado empleado={empleado} asistencia={asistencia} />
    </>
  )
}
