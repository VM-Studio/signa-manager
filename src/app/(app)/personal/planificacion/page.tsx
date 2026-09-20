import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { db } from '@/lib/db'
import { planificacionSemanal } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { Planificacion } from '@/components/personal/Planificacion'
import { EncabezadoPantalla } from '@/components/ui'

/** El lunes de la semana de una fecha. */
function lunesDe(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  const dia = d.getDay()
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  return d
}

export default async function PaginaPlanificacion({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>
}) {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Planificación" />

  const { desde: desdeTexto } = await searchParams
  const base = desdeTexto ? new Date(`${desdeTexto}T00:00:00`) : new Date()
  const desde = lunesDe(Number.isNaN(base.getTime()) ? new Date() : base)
  const hasta = new Date(desde)
  hasta.setDate(hasta.getDate() + 6)

  const [plan, empleados, cuadrillas, subcontratistas] = await Promise.all([
    planificacionSemanal(sesion, desde, hasta),
    db.empleado.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, apellido: true, legajo: true },
      orderBy: { apellido: 'asc' },
    }),
    db.cuadrilla.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    }),
    db.subcontratista.findMany({
      where: { activo: true },
      select: { id: true, razonSocial: true },
      orderBy: { razonSocial: 'asc' },
    }),
  ])

  return (
    <>
      <EncabezadoPantalla
        titulo="Planificación"
        subtitulo="Quién trabaja en qué obra"
        volverA="/personal"
      />
      <Planificacion
        obras={plan.obras}
        sinAsignar={plan.sinAsignar}
        superpuestos={plan.superpuestos}
        desde={desde}
        hasta={hasta}
        empleados={empleados}
        cuadrillas={cuadrillas}
        subcontratistas={subcontratistas}
        puedeAsignar={puede(sesion, 'personal.crear')}
        asignaciones={plan.asignaciones.map((a) => ({
          id: a.id,
          obraId: a.obraId,
          desde: a.desde,
          hasta: a.hasta,
          tarea: a.tarea,
          empleado: a.empleado,
          cuadrilla: a.cuadrilla
            ? {
                id: a.cuadrilla.id,
                nombre: a.cuadrilla.nombre,
                miembros: a.cuadrilla._count.miembros,
              }
            : null,
          subcontratista: a.subcontratista,
        }))}
      />
    </>
  )
}
