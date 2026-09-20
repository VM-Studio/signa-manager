import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { listarQuincenas } from '@/server/personal/queries'
import { quincenaDe } from '@/server/personal/reglas'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelQuincenas } from '@/components/personal/PanelQuincenas'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaQuincenas() {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Quincenas" />

  const quincenas = await listarQuincenas()
  const hoy = new Date()
  const rango = quincenaDe(hoy)

  const hayActual = quincenas.some(
    (q) => q.anio === rango.anio && q.mes === rango.mes && q.numero === rango.numero,
  )

  return (
    <>
      <EncabezadoPantalla titulo="Quincenas" volverA="/personal" />
      <PanelQuincenas
        hayActual={hayActual}
        puedeCerrar={puede(sesion, 'personal.aprobar')}
        quincenas={quincenas.map((q) => ({
          id: q.id,
          anio: q.anio,
          mes: q.mes,
          numero: q.numero,
          desde: q.desde,
          hasta: q.hasta,
          estado: q.estado,
          lineas: q._count.lineas,
          cerradaPor: q.cerradaPor?.nombre ?? null,
        }))}
      />
    </>
  )
}
