import { sesionConPermiso } from '@/lib/auth/pantalla'
import { empleadosParaCuadrilla } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioCuadrilla } from '@/components/personal/FormularioCuadrilla'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaNuevaCuadrilla() {
  const sesion = await sesionConPermiso('personal.crear')
  if (!sesion) return <SinPermiso titulo="Nueva cuadrilla" />

  const empleados = await empleadosParaCuadrilla()

  return (
    <>
      <EncabezadoPantalla
        titulo="Nueva cuadrilla"
        subtitulo="Capataz y gente fija"
        volverA="/personal/cuadrillas"
      />
      <FormularioCuadrilla empleados={empleados} />
    </>
  )
}
