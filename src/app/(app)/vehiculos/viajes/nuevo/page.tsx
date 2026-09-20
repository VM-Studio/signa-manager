import { sesionConPermiso } from '@/lib/auth/pantalla'
import { db } from '@/lib/db'
import { choferesActivos } from '@/server/vehiculos/queries'
import { obrasParaSelector } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioViajeDirecto } from '@/components/vehiculos/FormularioViajeDirecto'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaViajeDirecto() {
  const sesion = await sesionConPermiso('vehiculos.aprobar')
  if (!sesion) return <SinPermiso titulo="Nuevo viaje" />

  const [vehiculos, choferes, obras] = await Promise.all([
    db.vehiculo.findMany({
      where: { estado: { in: ['DISPONIBLE', 'EN_VIAJE'] } },
      select: {
        id: true,
        patente: true,
        marca: true,
        modelo: true,
        capacidadCargaKg: true,
      },
      orderBy: { patente: 'asc' },
    }),
    choferesActivos(),
    obrasParaSelector(),
  ])

  return (
    <>
      <EncabezadoPantalla
        titulo="Nuevo viaje"
        subtitulo="Sin solicitud previa"
        volverA="/vehiculos/agenda"
      />
      <FormularioViajeDirecto
        vehiculos={vehiculos}
        choferes={choferes}
        obras={obras}
      />
    </>
  )
}
