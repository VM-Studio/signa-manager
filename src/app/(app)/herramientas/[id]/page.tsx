import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import {
  depositosActivos,
  empleadosActivos,
  obrasAbiertas,
  obtenerHerramienta,
} from '@/server/herramientas/queries'
import { qrDataUrl } from '@/lib/qr'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FichaHerramienta } from '@/components/herramientas/FichaHerramienta'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaHerramienta({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('herramientas.ver')
  if (!sesion) return <SinPermiso titulo="Herramienta" />

  const { id } = await params
  const herramienta = await obtenerHerramienta(id)
  if (!herramienta) notFound()

  const [qr, obras, depositos, empleados] = await Promise.all([
    qrDataUrl(herramienta.id),
    obrasAbiertas(),
    depositosActivos(),
    empleadosActivos(),
  ])

  return (
    <>
      <EncabezadoPantalla
        titulo={herramienta.nombre}
        subtitulo={herramienta.codigo}
        volverA="/herramientas"
      />
      <FichaHerramienta
        herramienta={herramienta}
        qr={qr}
        opciones={{ obras, depositos, empleados }}
        puedeOperar={puede(sesion, 'herramientas.crear')}
        puedeEditar={puede(sesion, 'herramientas.editar')}
      />
    </>
  )
}
