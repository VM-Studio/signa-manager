import { sesionConPermiso } from '@/lib/auth/pantalla'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioSubcontratista } from '@/components/personal/FormularioSubcontratista'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaNuevoSubcontratista() {
  const sesion = await sesionConPermiso('personal.crear')
  if (!sesion) return <SinPermiso titulo="Nuevo subcontratista" />

  return (
    <>
      <EncabezadoPantalla
        titulo="Nuevo subcontratista"
        volverA="/personal/subcontratistas"
      />
      <FormularioSubcontratista />
    </>
  )
}
