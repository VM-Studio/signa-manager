import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { db } from '@/lib/db'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelDepositos } from '@/components/configuracion/PanelDepositos'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaDepositos() {
  const sesion = await sesionConPermiso('configuracion.ver')
  if (!sesion) return <SinPermiso titulo="Depósitos" />

  const [depositos, responsables] = await Promise.all([
    db.deposito.findMany({
      select: {
        id: true,
        nombre: true,
        direccion: true,
        activo: true,
        responsableId: true,
        responsable: { select: { nombre: true } },
        _count: { select: { herramientas: true } },
        herramientas: { select: { valorCompra: true } },
      },
      orderBy: { nombre: 'asc' },
    }),
    db.usuario.findMany({
      where: { activo: true, rol: { in: ['PANOLERO', 'LOGISTICA', 'ADMINISTRACION', 'DUENO'] } },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    }),
  ])

  return (
    <>
      <EncabezadoPantalla titulo="Depósitos" volverA="/mas" />
      <PanelDepositos
        puedeEditar={puede(sesion, 'configuracion.editar')}
        responsables={responsables}
        depositos={depositos.map((d) => ({
          id: d.id,
          nombre: d.nombre,
          direccion: d.direccion,
          activo: d.activo,
          responsableId: d.responsableId,
          responsable: d.responsable?.nombre ?? null,
          herramientas: d._count.herramientas,
          valor: d.herramientas.reduce(
            (total, h) => total + Number(h.valorCompra ?? 0),
            0,
          ),
        }))}
      />
    </>
  )
}
