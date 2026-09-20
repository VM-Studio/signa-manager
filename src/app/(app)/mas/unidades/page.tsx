import { sesionConPermiso } from '@/lib/auth/pantalla'
import { db } from '@/lib/db'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelUnidades } from '@/components/configuracion/PanelUnidades'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaUnidades() {
  const sesion = await sesionConPermiso('configuracion.configurar')
  if (!sesion) return <SinPermiso titulo="Unidades de negocio" />

  const unidades = await db.unidadNegocio.findMany({
    select: {
      id: true,
      nombre: true,
      codigo: true,
      orden: true,
      activa: true,
      _count: { select: { obras: true } },
    },
    orderBy: { orden: 'asc' },
  })

  return (
    <>
      <EncabezadoPantalla titulo="Unidades de negocio" volverA="/mas" />
      <PanelUnidades
        puedeConfigurar
        unidades={unidades.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          codigo: u.codigo,
          orden: u.orden,
          activa: u.activa,
          obras: u._count.obras,
        }))}
      />
    </>
  )
}
