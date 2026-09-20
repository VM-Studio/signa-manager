import Link from 'next/link'
import { Upload } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { siguienteLegajo } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioEmpleado } from '@/components/personal/FormularioEmpleado'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaNuevoEmpleado() {
  const sesion = await sesionConPermiso('personal.crear')
  if (!sesion) return <SinPermiso titulo="Nuevo empleado" />

  const legajo = await siguienteLegajo()

  return (
    <>
      <EncabezadoPantalla
        titulo="Nuevo empleado"
        volverA="/personal/empleados"
        accion={
          <Link
            href="/personal/empleados/importar"
            aria-label="Cargar varios desde un archivo"
            className="flex size-11 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
          >
            <Upload aria-hidden className="size-4" />
          </Link>
        }
      />
      <FormularioEmpleado legajoSugerido={legajo} />
    </>
  )
}
