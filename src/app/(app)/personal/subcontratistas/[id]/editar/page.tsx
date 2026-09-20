import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { obtenerSubcontratista } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioSubcontratista } from '@/components/personal/FormularioSubcontratista'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaEditarSubcontratista({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('personal.editar')
  if (!sesion) return <SinPermiso titulo="Editar subcontratista" />

  const { id } = await params
  const s = await obtenerSubcontratista(id)
  if (!s) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo="Editar datos"
        subtitulo={s.razonSocial}
        volverA={`/personal/subcontratistas/${s.id}`}
      />
      <FormularioSubcontratista
        valores={{
          id: s.id,
          razonSocial: s.razonSocial,
          cuit: s.cuit,
          rubro: s.rubro,
          contacto: s.contacto,
          telefono: s.telefono,
          email: s.email,
          notas: s.notas,
        }}
      />
    </>
  )
}
