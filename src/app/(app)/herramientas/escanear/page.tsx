import { sesionConPermiso } from '@/lib/auth/pantalla'
import { empleadosActivos, obrasAbiertas } from '@/server/herramientas/queries'
import { buscarEscaneada } from '@/server/herramientas/escaneo'
import { SinPermiso } from '@/components/app/SinPermiso'
import { Escaner } from '@/components/herramientas/Escaner'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaEscanear() {
  const sesion = await sesionConPermiso('herramientas.crear')
  if (!sesion) return <SinPermiso titulo="Escanear" />

  const [obras, empleados] = await Promise.all([
    obrasAbiertas(),
    empleadosActivos(),
  ])

  return (
    <>
      <EncabezadoPantalla titulo="Escanear" volverA="/herramientas" />
      <Escaner obras={obras} empleados={empleados} buscar={buscarEscaneada} />
    </>
  )
}
