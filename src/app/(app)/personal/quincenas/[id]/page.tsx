import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { detalleQuincena } from '@/server/personal/queries'
import { nombreQuincena } from '@/server/personal/reglas'
import { SinPermiso } from '@/components/app/SinPermiso'
import { DetalleQuincena } from '@/components/personal/DetalleQuincena'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaQuincena({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Quincena" />

  const { id } = await params
  const detalle = await detalleQuincena(id)
  if (!detalle) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo={nombreQuincena(detalle.quincena)}
        volverA="/personal/quincenas"
      />
      <DetalleQuincena
        abierta={detalle.abierta}
        empleados={detalle.empleados}
        obras={detalle.obras}
        totales={detalle.totales}
        puedeCerrar={puede(sesion, 'personal.aprobar')}
        quincena={{
          id: detalle.quincena.id,
          anio: detalle.quincena.anio,
          mes: detalle.quincena.mes,
          numero: detalle.quincena.numero,
          desde: detalle.quincena.desde,
          hasta: detalle.quincena.hasta,
          estado: detalle.quincena.estado,
          cerradaEn: detalle.quincena.cerradaEn,
          cerradaPor: detalle.quincena.cerradaPor?.nombre ?? null,
        }}
      />
    </>
  )
}
