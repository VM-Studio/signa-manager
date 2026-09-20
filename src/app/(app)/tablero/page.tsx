import { sesionConPermiso } from '@/lib/auth/pantalla'
import { armarPeriodo, calcularTablero, type ClavePeriodo } from '@/lib/calculos/tablero'
import { operacionHoy } from '@/server/tablero/queries'
import { db } from '@/lib/db'
import { SinPermiso } from '@/components/app/SinPermiso'
import { Tablero } from '@/components/tablero/Tablero'
import { EncabezadoPantalla } from '@/components/ui'

export const dynamic = 'force-dynamic'

const CLAVES: ClavePeriodo[] = [
  'este-mes',
  'mes-anterior',
  'ultimos-3-meses',
  'este-ano',
  'personalizado',
]

export default async function PaginaTablero({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string
    unidad?: string
    desde?: string
    hasta?: string
  }>
}) {
  const sesion = await sesionConPermiso('tablero.ver')
  if (!sesion) return <SinPermiso titulo="Tablero" />

  const params = await searchParams
  const clave = CLAVES.includes(params.periodo as ClavePeriodo)
    ? (params.periodo as ClavePeriodo)
    : 'este-mes'

  const periodo = armarPeriodo(clave, params.desde, params.hasta)
  const unidadFiltrada = params.unidad ?? null

  const [datos, operacion, unidades] = await Promise.all([
    calcularTablero(periodo, unidadFiltrada ?? undefined),
    operacionHoy(periodo.desde, periodo.hasta),
    db.unidadNegocio.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { orden: 'asc' },
    }),
  ])

  return (
    <>
      <EncabezadoPantalla titulo="Tablero" sinVolver />
      <Tablero
        datos={datos}
        operacion={operacion}
        unidades={unidades}
        periodoClave={clave}
        unidadFiltrada={unidadFiltrada}
      />
    </>
  )
}
