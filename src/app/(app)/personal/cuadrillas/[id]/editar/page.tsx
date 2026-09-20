import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import {
  empleadosParaCuadrilla,
  obtenerCuadrilla,
} from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioCuadrilla } from '@/components/personal/FormularioCuadrilla'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaEditarCuadrilla({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('personal.editar')
  if (!sesion) return <SinPermiso titulo="Editar cuadrilla" />

  const { id } = await params
  const [cuadrilla, empleados] = await Promise.all([
    obtenerCuadrilla(id),
    empleadosParaCuadrilla(),
  ])
  if (!cuadrilla) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo="Editar cuadrilla"
        subtitulo={cuadrilla.nombre}
        volverA="/personal/cuadrillas"
      />
      <FormularioCuadrilla
        empleados={empleados}
        valores={{
          id: cuadrilla.id,
          nombre: cuadrilla.nombre,
          capatazId: cuadrilla.capatazId,
          miembros: cuadrilla.miembros,
        }}
      />
    </>
  )
}
