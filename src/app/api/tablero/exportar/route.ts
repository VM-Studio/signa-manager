import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { obtenerSesion } from '@/lib/auth/sesion'
import { puede } from '@/lib/auth/permisos'
import {
  armarPeriodo,
  calcularTablero,
  type ClavePeriodo,
} from '@/lib/calculos/tablero'
import { operacionHoy } from '@/server/tablero/queries'
import { armarCsv, nombreArchivo } from '@/lib/csv'

/**
 * El resumen del período en CSV, para abrir en Excel.
 * Una hoja con el total de la empresa, otra por unidad de negocio y otra
 * por obra con el desglose completo del costo.
 */
export async function GET(peticion: NextRequest) {
  const sesion = await obtenerSesion()
  if (!sesion || !puede(sesion, 'tablero.ver')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const parametros = peticion.nextUrl.searchParams
  const periodo = armarPeriodo(
    (parametros.get('periodo') as ClavePeriodo) ?? 'este-mes',
    parametros.get('desde') ?? undefined,
    parametros.get('hasta') ?? undefined,
  )

  const [datos, operacion] = await Promise.all([
    calcularTablero(periodo),
    operacionHoy(periodo.desde, periodo.hasta),
  ])

  const csv = armarCsv([
    {
      titulo: `Signa · resumen ${periodo.etiqueta}`,
      encabezados: [
        'Desde',
        'Hasta',
        'Ingresos',
        'Costo de obras',
        'Resultado de obras',
        'Margen %',
        'Estructura',
        'Resultado neto',
        'Margen neto %',
      ],
      filas: [
        [
          periodo.desde,
          periodo.hasta,
          datos.empresa.ingresos,
          datos.empresa.costoTotal,
          datos.empresa.resultado,
          datos.empresa.margen * 100,
          datos.empresa.estructura.total,
          datos.empresa.resultadoNeto,
          datos.empresa.margenNeto * 100,
        ],
      ],
    },
    {
      titulo: 'Por unidad de negocio',
      encabezados: ['Unidad', 'Obras', 'Ingresos', 'Costo', 'Resultado', 'Margen %'],
      filas: datos.unidades.map((u) => [
        u.nombre,
        u.obras,
        u.ingresos,
        u.costoTotal,
        u.resultado,
        u.margen * 100,
      ]),
    },
    {
      titulo: 'Por obra',
      encabezados: [
        'Código',
        'Obra',
        'Unidad',
        'Estado',
        'Ingresos',
        'Materiales',
        'Subcontratos',
        'Equipos',
        'Mano de obra',
        'Viáticos',
        'Vehículos',
        'Herramientas',
        'Otros',
        'Costo total',
        'Resultado',
        'Margen %',
        'Consumo presupuesto MO %',
      ],
      filas: datos.obras.map((o) => [
        o.codigo,
        o.nombre,
        o.unidadNegocio,
        o.estado,
        o.ingresos,
        o.materiales,
        o.subcontratos,
        o.equipos,
        o.manoObra,
        o.viaticos,
        o.vehiculos,
        o.herramientas,
        o.otrosExternos,
        o.costoTotal,
        o.resultado,
        o.margen * 100,
        o.consumoPresupuesto !== null ? o.consumoPresupuesto * 100 : '',
      ]),
    },
    {
      titulo: 'Estructura',
      encabezados: ['Concepto', 'Monto'],
      filas: datos.empresa.estructura.detalle.map((d) => [d.descripcion, d.monto]),
    },
    {
      titulo: 'Operación',
      encabezados: ['Indicador', 'Valor'],
      filas: [
        ['Personas trabajando', operacion.personasTrabajando],
        ['Obras con gente', operacion.obrasConGente],
        ['Ausentismo %', operacion.ausentismo.porcentaje],
        ['Vehículos en viaje', operacion.vehiculosEnViaje],
        ['Uso de flota %', operacion.usoFlota],
        ['Herramientas en obra', operacion.herramientasEnObra],
        ['Valor de herramientas en obra', operacion.valorHerramientasEnObra],
        ['Compras evitadas', operacion.comprasEvitadas.monto],
        ['Alertas críticas', operacion.alertasCriticas],
      ],
    },
  ])

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nombreArchivo('signa-tablero')}"`,
    },
  })
}
