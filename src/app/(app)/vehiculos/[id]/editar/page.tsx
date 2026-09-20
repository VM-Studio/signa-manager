import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { choferesActivos, obtenerVehiculo } from '@/server/vehiculos/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioVehiculo } from '@/components/vehiculos/FormularioVehiculo'
import { EncabezadoPantalla } from '@/components/ui'
import { patente } from '@/lib/formato'

export default async function PaginaEditarVehiculo({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('vehiculos.aprobar')
  if (!sesion) return <SinPermiso titulo="Editar vehículo" />

  const { id } = await params
  const [v, choferes] = await Promise.all([
    obtenerVehiculo(id),
    choferesActivos(),
  ])
  if (!v) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo="Editar vehículo"
        subtitulo={patente(v.patente)}
        volverA={`/vehiculos/${v.id}`}
      />
      <FormularioVehiculo
        choferes={choferes}
        valores={{
          id: v.id,
          patente: v.patente,
          interno: v.interno,
          tipo: v.tipo,
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          combustible: v.combustible,
          capacidadCargaKg: v.capacidadCargaKg,
          volumenM3: v.volumenM3 ? Number(v.volumenM3) : null,
          cantidadPasajeros: v.cantidadPasajeros,
          kmActual: v.kmActual,
          horasActual: v.horasActual,
          costoKmEstimado: v.costoKmEstimado ? Number(v.costoKmEstimado) : null,
          tieneGps: v.tieneGps,
          choferHabitualId: v.choferHabitualId,
          notas: v.notas,
        }}
      />
    </>
  )
}
