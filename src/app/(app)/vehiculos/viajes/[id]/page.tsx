import { notFound } from 'next/navigation'
import Link from 'next/link'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { obtenerViaje } from '@/server/vehiculos/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  Dato,
  EncabezadoPantalla,
  ListaDatos,
  TituloSeccion,
} from '@/components/ui'
import { InsigniaEstadoViaje } from '@/components/vehiculos/estado'
import {
  fechaYHora,
  kilometros,
  moneda,
  patente,
  peso,
  textoEnum,
} from '@/lib/formato'

export default async function PaginaViaje({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Viaje" />

  const { id } = await params
  const viaje = await obtenerViaje(id)
  if (!viaje) notFound()

  const recorridos =
    viaje.kmSalida !== null && viaje.kmLlegada !== null
      ? viaje.kmLlegada - viaje.kmSalida
      : null

  return (
    <div className="pb-8">
      <EncabezadoPantalla
        titulo={viaje.destino}
        subtitulo={textoEnum(viaje.tipo)}
        volverA="/vehiculos/agenda"
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <InsigniaEstadoViaje estado={viaje.estado} />
      </div>

      <TituloSeccion>El viaje</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Desde">{viaje.origen}</Dato>
          <Dato etiqueta="Hasta">{viaje.destino}</Dato>
          <Dato etiqueta="Obra">
            {viaje.obra ? (
              <Link href={`/obras/${viaje.obra.id}`} className="underline">
                {viaje.obra.codigo}
              </Link>
            ) : (
              'Sin obra'
            )}
          </Dato>
          <Dato etiqueta="Salida prevista">{fechaYHora(viaje.salidaPrevista)}</Dato>
          {viaje.salidaReal && (
            <Dato etiqueta="Salió">{fechaYHora(viaje.salidaReal)}</Dato>
          )}
          {viaje.llegadaReal && (
            <Dato etiqueta="Llegó">{fechaYHora(viaje.llegadaReal)}</Dato>
          )}
          {viaje.pesoCargaKg && (
            <Dato etiqueta="Carga">{peso(viaje.pesoCargaKg)}</Dato>
          )}
        </ListaDatos>
        {viaje.descripcionCarga && (
          <p className="pb-4 text-chico text-grafito">{viaje.descripcionCarga}</p>
        )}
      </div>

      <TituloSeccion>Vehículo y chofer</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Vehículo">
            <Link href={`/vehiculos/${viaje.vehiculo.id}`} className="underline">
              {patente(viaje.vehiculo.patente)}
            </Link>{' '}
            · {viaje.vehiculo.marca} {viaje.vehiculo.modelo}
          </Dato>
          <Dato etiqueta="Chofer">
            <Link href={`/personal/empleados/${viaje.chofer.id}`} className="underline">
              {viaje.chofer.nombre} {viaje.chofer.apellido}
            </Link>
          </Dato>
        </ListaDatos>
      </div>

      {(viaje.kmSalida !== null || viaje.costoCalculado !== null) && (
        <>
          <TituloSeccion>Kilómetros y costo</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              {viaje.kmSalida !== null && (
                <Dato etiqueta="Salió con">{kilometros(viaje.kmSalida)}</Dato>
              )}
              {viaje.kmLlegada !== null && (
                <Dato etiqueta="Llegó con">{kilometros(viaje.kmLlegada)}</Dato>
              )}
              {recorridos !== null && (
                <Dato etiqueta="Recorrió">{kilometros(recorridos)}</Dato>
              )}
              {viaje.peajes && (
                <Dato etiqueta="Peajes">{moneda(viaje.peajes)}</Dato>
              )}
              {viaje.costoCalculado && (
                <Dato etiqueta="Costo imputado a la obra">
                  {moneda(viaje.costoCalculado)}
                </Dato>
              )}
            </ListaDatos>
            {viaje.costoCalculado && recorridos !== null && (
              <p className="pb-4 text-menor text-acero">
                {kilometros(recorridos)} ×{' '}
                {moneda(
                  Number(viaje.vehiculo.costoKmEstimado ?? 0),
                )}
                /km
                {viaje.peajes ? ` + ${moneda(viaje.peajes)} de peajes` : ''}
              </p>
            )}
          </div>
        </>
      )}

      {viaje.observaciones && (
        <>
          <TituloSeccion>Observaciones</TituloSeccion>
          <p className="border-y border-niebla bg-blanco px-4 py-3 text-base text-grafito">
            {viaje.observaciones}
          </p>
        </>
      )}
    </div>
  )
}
