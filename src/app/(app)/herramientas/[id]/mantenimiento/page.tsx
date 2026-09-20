import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { db } from '@/lib/db'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioMantenimiento } from '@/components/herramientas/FormularioMantenimiento'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaRegistrarMantenimiento({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('herramientas.editar')
  if (!sesion) return <SinPermiso titulo="Mantenimiento" />

  const { id } = await params
  const herramienta = await db.herramienta.findUnique({
    where: { id },
    select: { id: true, codigo: true, nombre: true, mantenimientoCadaDias: true },
  })
  if (!herramienta) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo="Registrar mantenimiento"
        subtitulo={`${herramienta.codigo} · ${herramienta.nombre}`}
        volverA={`/herramientas/${herramienta.id}`}
      />
      <FormularioMantenimiento
        herramientaId={herramienta.id}
        cadaDias={herramienta.mantenimientoCadaDias}
      />
    </>
  )
}
