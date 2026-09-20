import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { listarSolicitudes } from '@/server/herramientas/queries'
import { comprasEvitadas } from '@/lib/calculos/herramientas'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelSolicitudes } from '@/components/herramientas/PanelSolicitudes'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaSolicitudes() {
  const sesion = await sesionConPermiso('herramientas.ver')
  if (!sesion) return <SinPermiso titulo="Solicitudes" />

  const ahora = new Date()
  const inicioDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [solicitudes, evitadas] = await Promise.all([
    listarSolicitudes(),
    comprasEvitadas(inicioDelMes, ahora),
  ])

  return (
    <>
      <EncabezadoPantalla titulo="Solicitudes" volverA="/herramientas" />
      <PanelSolicitudes
        puedeCrear={puede(sesion, 'herramientas.crear')}
        comprasEvitadas={evitadas}
        solicitudes={solicitudes.map((s) => ({
          id: s.id,
          descripcion: s.descripcion,
          cantidad: s.cantidad,
          fechaNecesaria: s.fechaNecesaria,
          prioridad: s.prioridad,
          estado: s.estado,
          obra: s.obra.codigo,
          solicitante: s.solicitante.nombre,
          creadaEn: s.creadaEn,
          herramientasEntregadas: s.movimientos.length,
        }))}
      />
    </>
  )
}
