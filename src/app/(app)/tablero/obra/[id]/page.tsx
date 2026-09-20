import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import {
  armarPeriodo,
  calcularTablero,
  evolucionMensual,
  type ClavePeriodo,
} from '@/lib/calculos/tablero'
import { pedidosDemorados } from '@/server/tablero/queries'
import { horasPorSemana } from '@/lib/calculos/personal'
import { SinPermiso } from '@/components/app/SinPermiso'
import { DetalleObraTablero } from '@/components/tablero/DetalleObraTablero'
import { EncabezadoPantalla } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function PaginaDetalleObra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>
}) {
  const sesion = await sesionConPermiso('tablero.ver')
  if (!sesion) return <SinPermiso titulo="Detalle de obra" />

  const { id } = await params
  const sp = await searchParams
  const periodo = armarPeriodo(
    (sp.periodo as ClavePeriodo) ?? 'este-mes',
    sp.desde,
    sp.hasta,
  )

  const [tablero, evolucion, pedidos, horas] = await Promise.all([
    calcularTablero(periodo),
    evolucionMensual(id, 6),
    pedidosDemorados(id),
    horasPorSemana(id, periodo.desde, periodo.hasta),
  ])

  const obra = tablero.obras.find((o) => o.obraId === id)
  if (!obra) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo={obra.nombre}
        subtitulo={`${obra.codigo} · ${periodo.etiqueta}`}
        volverA="/tablero"
      />
      <DetalleObraTablero
        obra={obra}
        evolucion={evolucion}
        pedidos={pedidos}
        horasPorSemana={horas}
        periodo={{
          desde: periodo.desde.toISOString(),
          hasta: periodo.hasta.toISOString(),
          etiqueta: periodo.etiqueta,
        }}
      />
    </>
  )
}
