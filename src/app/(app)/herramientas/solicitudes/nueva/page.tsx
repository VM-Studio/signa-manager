import { sesionConPermiso } from '@/lib/auth/pantalla'
import { categorias } from '@/server/herramientas/queries'
import { listarObras } from '@/server/obras/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioSolicitud } from '@/components/herramientas/FormularioSolicitud'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaNuevaSolicitud() {
  const sesion = await sesionConPermiso('herramientas.crear')
  if (!sesion) return <SinPermiso titulo="Pedir una herramienta" />

  // Solo las obras que le corresponden a quien pide.
  const [obras, cats] = await Promise.all([
    listarObras(sesion, { estado: 'EN_CURSO' }),
    categorias(),
  ])

  return (
    <>
      <EncabezadoPantalla
        titulo="Pedir una herramienta"
        volverA="/herramientas/solicitudes"
      />
      <FormularioSolicitud
        obras={obras.map((o) => ({ id: o.id, codigo: o.codigo, nombre: o.nombre }))}
        categorias={cats}
      />
    </>
  )
}
