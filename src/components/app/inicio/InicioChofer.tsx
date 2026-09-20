import Link from 'next/link'
import { Truck } from 'lucide-react'
import type { InicioChofer as Datos } from '@/server/nucleo/inicio'
import {
  Dato,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  ListaDatos,
  Tarjeta,
  TituloSeccion,
} from '@/components/ui'
import {
  fechaRelativaCorta,
  hora,
  kilometros,
  patente,
  textoEnum,
} from '@/lib/formato'

export function InicioChofer({ datos }: { datos: Datos }) {
  const deHoy = datos.viajes.filter((v) => v.esDeHoy)
  const proximos = datos.viajes.filter((v) => !v.esDeHoy)

  return (
    <>
      {datos.vehiculo && (
        <>
          <TituloSeccion>Tu vehículo</TituloSeccion>
          <Tarjeta className="mx-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="cifras text-grande font-medium text-negro">
                  {patente(datos.vehiculo.patente)}
                </p>
                <p className="text-menor text-grafito">
                  {datos.vehiculo.marca} {datos.vehiculo.modelo}
                </p>
              </div>
              <Insignia
                tono={
                  datos.vehiculo.estado === 'DISPONIBLE'
                    ? 'correcto'
                    : datos.vehiculo.estado === 'EN_VIAJE'
                      ? 'neutro'
                      : 'aviso'
                }
              >
                {textoEnum(datos.vehiculo.estado)}
              </Insignia>
            </div>
            <ListaDatos className="mt-2 px-0">
              <Dato etiqueta="Kilómetros">{kilometros(datos.vehiculo.kmActual)}</Dato>
            </ListaDatos>
          </Tarjeta>
        </>
      )}

      <TituloSeccion>Tus viajes de hoy</TituloSeccion>
      {deHoy.length === 0 ? (
        <EstadoVacio
          titulo="No tenés viajes para hoy"
          mensaje="Si logística te asigna uno, te va a aparecer acá."
          icono={<Truck className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {deHoy.map((v) => (
            <FilaLista
              key={v.id}
              titulo={v.destino}
              subtitulo={`Desde ${v.origen}`}
              detalle={v.descripcionCarga ?? undefined}
              derecha={hora(v.salidaPrevista)}
              debajoDerecha={
                <Insignia tono={v.estado === 'EN_CURSO' ? 'correcto' : 'neutro'}>
                  {v.estado === 'EN_CURSO' ? 'En viaje' : 'Programado'}
                </Insignia>
              }
              href={`/vehiculos/mis-viajes/${v.id}`}
            />
          ))}
        </Lista>
      )}

      {proximos.length > 0 && (
        <>
          <TituloSeccion>Próximos</TituloSeccion>
          <Lista>
            {proximos.map((v) => (
              <FilaLista
                key={v.id}
                titulo={v.destino}
                subtitulo={`${fechaRelativaCorta(v.salidaPrevista)} ${hora(v.salidaPrevista)}`}
                detalle={v.descripcionCarga ?? undefined}
                href={`/vehiculos/mis-viajes/${v.id}`}
              />
            ))}
          </Lista>
        </>
      )}

      <div className="px-4 pt-5">
        <Link
          href="/vehiculos/mis-viajes"
          className="flex min-h-[52px] items-center justify-center rounded-[var(--radius-control)] border border-niebla bg-blanco text-base font-medium text-negro active:bg-hueso"
        >
          Ver todos mis viajes
        </Link>
      </div>
    </>
  )
}
