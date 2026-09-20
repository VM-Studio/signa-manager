import { sesionConPermiso } from '@/lib/auth/pantalla'
import { SinPermiso } from '@/components/app/SinPermiso'
import { AltaMasivaEmpleados } from '@/components/personal/AltaMasivaEmpleados'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaImportarEmpleados() {
  const sesion = await sesionConPermiso('personal.crear')
  if (!sesion) return <SinPermiso titulo="Carga masiva" />

  return (
    <>
      <EncabezadoPantalla
        titulo="Cargar desde un archivo"
        subtitulo="Para dar de alta a todo el personal de una"
        volverA="/personal/empleados/nuevo"
      />
      <AltaMasivaEmpleados />
    </>
  )
}
