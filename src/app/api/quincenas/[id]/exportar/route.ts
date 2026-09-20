import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth/sesion'
import { puede } from '@/lib/auth/permisos'
import { detalleQuincena } from '@/server/personal/queries'
import { nombreQuincena } from '@/server/personal/reglas'
import { armarCsv, nombreArchivo } from '@/lib/csv'

/**
 * El resumen de la quincena para el estudio contable, en CSV.
 * Una hoja por empleado y otra por obra, que es lo que pidieron.
 */
export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await obtenerSesion()
  if (!sesion || !puede(sesion, 'personal.ver')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const detalle = await detalleQuincena(id)
  if (!detalle) {
    return NextResponse.json({ error: 'No existe' }, { status: 404 })
  }

  const nombre = nombreQuincena(detalle.quincena)

  const csv = armarCsv([
    {
      titulo: `Resumen · ${nombre}`,
      encabezados: ['Desde', 'Hasta', 'Estado', 'Personas', 'Horas', 'Costo total'],
      filas: [
        [
          detalle.quincena.desde,
          detalle.quincena.hasta,
          detalle.quincena.estado,
          detalle.totales.personas,
          detalle.totales.horas,
          detalle.totales.costo,
        ],
      ],
    },
    {
      titulo: 'Por empleado',
      encabezados: [
        'Legajo',
        'Empleado',
        'Días trabajados',
        'Horas normales',
        'Horas extra 50%',
        'Horas extra 100%',
        'Ausencias',
        'Costo',
        'Novedades',
        'Neto de referencia',
        'Obras',
      ],
      filas: detalle.empleados.map((e) => [
        e.legajo,
        e.nombre,
        e.dias,
        e.horasNormales,
        e.horasExtra50,
        e.horasExtra100,
        e.ausencias,
        e.costo,
        e.novedades,
        e.neto,
        e.obras.join(' / '),
      ]),
    },
    {
      titulo: 'Por obra',
      encabezados: ['Obra', 'Personas', 'Horas', 'Costo'],
      filas: detalle.obras.map((o) => [o.obra, o.personas, o.horas, o.costo]),
    },
  ])

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nombreArchivo(
        `quincena-${detalle.quincena.anio}-${String(detalle.quincena.mes).padStart(2, '0')}-${detalle.quincena.numero}`,
      )}"`,
    },
  })
}
