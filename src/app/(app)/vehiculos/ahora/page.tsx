import { MapPin, Truck, Wrench } from 'lucide-react'
import { EstadoVehiculo } from '@prisma/client'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { queHaceCadaUno } from '@/server/vehiculos/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  EncabezadoPantalla,
  FilaLista,
  Lista,
  TituloSeccion,
} from '@/components/ui'
import { InsigniaEstadoVehiculo, TIPO_VEHICULO } from '@/components/vehiculos/estado'
import { hora, kilometros, patente, plural } from '@/lib/formato'

/*
 * PUNTO DE EXTENSIÓN · posición por GPS
 * -------------------------------------------------------------------
 * Cuando se contrate un proveedor de rastreo, acá va la llamada a su
 * API para traer la última posición de cada vehículo con tieneGps=true,
 * y debajo de cada fila se muestra dónde está y a qué hora se reportó.
 *
 * La interfaz sería algo así:
 *
 *   interface ProveedorGps {
 *     posiciones(patentes: string[]): Promise<Map<string, {
 *       latitud: number
 *       longitud: number
 *       reportadoEn: Date
 *       velocidadKmh: number | null
 *     }>>
 *   }
 *
 * Se resuelve igual que la capa de integración del sistema base: una
 * interfaz nuestra y un adaptador por proveedor, en
 * src/lib/integracion/gps/. Nada de esta pantalla cambia salvo agregar
 * la línea de posición.
 */

export const dynamic = 'force-dynamic'

export default async function PaginaAhora() {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="En este momento" />

  const vehiculos = await queHaceCadaUno()

  const enViaje = vehiculos.filter((v) => v.estado === EstadoVehiculo.EN_VIAJE)
  const disponibles = vehiculos.filter(
    (v) => v.estado === EstadoVehiculo.DISPONIBLE,
  )
  const parados = vehiculos.filter(
    (v) =>
      v.estado === EstadoVehiculo.EN_TALLER ||
      v.estado === EstadoVehiculo.FUERA_DE_SERVICIO,
  )

  return (
    <div className="pb-8">
      <EncabezadoPantalla
        titulo="En este momento"
        subtitulo={`${plural(enViaje.length, 'vehículo en viaje', 'vehículos en viaje')}`}
        volverA="/vehiculos"
      />

      {enViaje.length > 0 && (
        <>
          <TituloSeccion>En viaje</TituloSeccion>
          <Lista>
            {enViaje.map((v) => {
              const viaje = v.viajes[0]
              return (
                <FilaLista
                  key={v.id}
                  titulo={patente(v.patente)}
                  subtitulo={
                    viaje
                      ? `Hacia ${viaje.destino}${viaje.obra ? ` · ${viaje.obra.codigo}` : ''}`
                      : `${v.marca} ${v.modelo}`
                  }
                  detalle={
                    viaje
                      ? [
                          `Salió ${hora(viaje.salidaReal ?? viaje.salidaPrevista)}`,
                          `${viaje.chofer.nombre} ${viaje.chofer.apellido}`,
                          viaje.descripcionCarga,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : undefined
                  }
                  izquierda={
                    <Truck aria-hidden className="size-5 text-correcto" strokeWidth={1.75} />
                  }
                  debajoDerecha={<InsigniaEstadoVehiculo estado={v.estado} />}
                  href={viaje ? `/vehiculos/viajes/${viaje.id}` : `/vehiculos/${v.id}`}
                />
              )
            })}
          </Lista>
        </>
      )}

      <TituloSeccion>En el depósito</TituloSeccion>
      {disponibles.length === 0 ? (
        <p className="px-4 text-chico text-grafito">
          No hay ningún vehículo libre ahora mismo.
        </p>
      ) : (
        <Lista>
          {disponibles.map((v) => (
            <FilaLista
              key={v.id}
              titulo={patente(v.patente)}
              subtitulo={`${TIPO_VEHICULO[v.tipo]} · ${v.marca} ${v.modelo}`}
              detalle={
                [
                  v.choferHabitual
                    ? `${v.choferHabitual.nombre} ${v.choferHabitual.apellido}`
                    : null,
                  kilometros(v.kmActual),
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              izquierda={
                <MapPin aria-hidden className="size-5 text-metadato" strokeWidth={1.75} />
              }
              debajoDerecha={<InsigniaEstadoVehiculo estado={v.estado} />}
              href={`/vehiculos/${v.id}`}
            />
          ))}
        </Lista>
      )}

      {parados.length > 0 && (
        <>
          <TituloSeccion>Parados</TituloSeccion>
          <Lista>
            {parados.map((v) => (
              <FilaLista
                key={v.id}
                titulo={patente(v.patente)}
                subtitulo={`${v.marca} ${v.modelo}`}
                detalle={
                  v.mantenimientos[0]
                    ? [v.mantenimientos[0].descripcion, v.mantenimientos[0].taller]
                        .filter(Boolean)
                        .join(' · ')
                    : undefined
                }
                izquierda={
                  <Wrench aria-hidden className="size-5 text-aviso" strokeWidth={1.75} />
                }
                tono="aviso"
                debajoDerecha={<InsigniaEstadoVehiculo estado={v.estado} />}
                href={`/vehiculos/${v.id}`}
              />
            ))}
          </Lista>
        </>
      )}

      <p className="px-4 pt-5 text-menor text-metadato">
        Esta pantalla se arma con los viajes cargados en la app. Si más
        adelante se contrata un servicio de rastreo, acá se va a poder ver
        también la posición real de cada vehículo.
      </p>
    </div>
  )
}
