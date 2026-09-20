import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { agendaDelDia } from '@/server/vehiculos/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  EncabezadoPantalla,
  EstadoVacio,
  TituloSeccion,
} from '@/components/ui'
import { TIPO_VEHICULO } from '@/components/vehiculos/estado'
import { fechaConDia, hora, patente, peso, primeraMayuscula } from '@/lib/formato'

/** Las horas que se muestran en la agenda: la jornada de obra. */
const HORA_INICIO = 6
const HORA_FIN = 20

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Agenda" />

  const { fecha: fechaTexto } = await searchParams
  const fecha = fechaTexto ? new Date(`${fechaTexto}T00:00:00`) : new Date()
  if (Number.isNaN(fecha.getTime())) fecha.setTime(Date.now())
  fecha.setHours(0, 0, 0, 0)

  const vehiculos = await agendaDelDia(fecha)

  const otroDia = (dias: number) => {
    const d = new Date(fecha)
    d.setDate(d.getDate() + dias)
    return `/vehiculos/agenda?fecha=${d.toISOString().slice(0, 10)}`
  }

  const totalViajes = vehiculos.reduce((a, v) => a + v.viajes.length, 0)
  const horas = Array.from(
    { length: HORA_FIN - HORA_INICIO + 1 },
    (_, i) => HORA_INICIO + i,
  )

  return (
    <div className="pb-8">
      <EncabezadoPantalla titulo="Agenda" volverA="/vehiculos" />

      <div className="flex items-center justify-between gap-2 border-b border-niebla bg-blanco px-2 py-2">
        <Link
          href={otroDia(-1)}
          aria-label="Día anterior"
          className="flex size-11 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <p className="text-base font-medium text-negro">
          {primeraMayuscula(fechaConDia(fecha))}
        </p>
        <Link
          href={otroDia(1)}
          aria-label="Día siguiente"
          className="flex size-11 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
        >
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      </div>

      {totalViajes === 0 ? (
        <EstadoVacio
          titulo="No hay viajes este día"
          mensaje="Asigná una solicitud o creá un viaje directo."
          accion={{ texto: 'Ver solicitudes', href: '/vehiculos/solicitudes' }}
        />
      ) : (
        <>
          <TituloSeccion>
            {totalViajes} viaje{totalViajes === 1 ? '' : 's'}
          </TituloSeccion>

          {/* Los vehículos en filas y sus viajes como bloques en el horario.
              Se desplaza de costado dentro de su contenedor, no arrastra la
              página. */}
          <div className="scroll-lateral border-y border-niebla bg-blanco">
            <div className="min-w-[640px]">
              {/* Regla de horas */}
              <div className="flex border-b border-niebla">
                <div className="w-[104px] shrink-0 px-3 py-1.5 text-micro text-acero">
                  Vehículo
                </div>
                {horas.map((h) => (
                  <div
                    key={h}
                    className="cifras flex-1 border-l border-niebla px-1 py-1.5 text-center text-micro text-acero"
                  >
                    {h}
                  </div>
                ))}
              </div>

              {vehiculos.map((v) => (
                <div key={v.id} className="flex border-b border-niebla">
                  <div className="w-[104px] shrink-0 px-3 py-2">
                    <p className="cifras truncate text-menor font-medium text-negro">
                      {patente(v.patente)}
                    </p>
                    <p className="truncate text-micro text-acero">
                      {v.capacidadCargaKg ? peso(v.capacidadCargaKg) : TIPO_VEHICULO[v.tipo]}
                    </p>
                  </div>

                  <div className="relative flex flex-1">
                    {horas.map((h) => (
                      <div key={h} className="flex-1 border-l border-niebla" />
                    ))}

                    {v.viajes.map((viaje) => {
                      const salida = viaje.salidaReal ?? viaje.salidaPrevista
                      const horaDecimal =
                        salida.getHours() + salida.getMinutes() / 60
                      const inicio = Math.max(
                        0,
                        ((horaDecimal - HORA_INICIO) / (HORA_FIN - HORA_INICIO + 1)) * 100,
                      )
                      // Un viaje ocupa unas 3 horas si no terminó.
                      const fin = viaje.llegadaReal
                        ? viaje.llegadaReal.getHours() +
                          viaje.llegadaReal.getMinutes() / 60
                        : horaDecimal + 3
                      const ancho = Math.min(
                        100 - inicio,
                        ((fin - horaDecimal) / (HORA_FIN - HORA_INICIO + 1)) * 100,
                      )

                      return (
                        <Link
                          key={viaje.id}
                          href={`/vehiculos/viajes/${viaje.id}`}
                          title={`${hora(salida)} · ${viaje.destino} · ${viaje.chofer.nombre} ${viaje.chofer.apellido}`}
                          className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded-[4px] border px-1.5 py-1 ${
                            viaje.estado === 'EN_CURSO'
                              ? 'border-[color-mix(in_srgb,var(--color-correcto)_35%,transparent)] bg-[var(--color-correcto-suave)]'
                              : viaje.estado === 'CANCELADO'
                                ? 'border-niebla bg-hueso opacity-60'
                                : 'border-niebla bg-niebla'
                          }`}
                          style={{
                            left: `${inicio}%`,
                            width: `${Math.max(ancho, 8)}%`,
                          }}
                        >
                          <span className="block truncate text-micro leading-tight font-medium text-negro">
                            {viaje.destino}
                          </span>
                          <span className="block truncate text-micro leading-tight text-grafito">
                            {hora(salida)}
                            {viaje.obra ? ` · ${viaje.obra.codigo}` : ''}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="px-4 pt-3 text-menor text-acero">
            Deslizá la tabla de costado para ver todo el día. Tocá un bloque
            para abrir el viaje.
          </p>
        </>
      )}
    </div>
  )
}
