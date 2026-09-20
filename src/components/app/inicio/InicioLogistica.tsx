import Link from 'next/link'
import { CalendarClock, Truck } from 'lucide-react'
import type { InicioLogistica as Datos } from '@/server/nucleo/inicio'
import {
  EstadoVacio,
  FilaLista,
  GrillaResumen,
  Insignia,
  Lista,
  NumeroResumen,
  TituloSeccion,
} from '@/components/ui'
import {
  fechaCorta,
  hora,
  numero,
  peso,
  textoEnum,
  textoVencimiento,
} from '@/lib/formato'

export function InicioLogistica({ datos }: { datos: Datos }) {
  return (
    <>
      <TituloSeccion>Estado de la flota</TituloSeccion>
      <GrillaResumen columnas={3}>
        <NumeroResumen
          etiqueta="Disponibles"
          valor={numero(datos.flota.disponibles)}
          href="/vehiculos?estado=DISPONIBLE"
        />
        <NumeroResumen
          etiqueta="En viaje"
          valor={numero(datos.flota.enViaje)}
          href="/vehiculos/ahora"
        />
        <NumeroResumen
          etiqueta="En taller"
          valor={numero(datos.flota.enTaller)}
          tono={datos.flota.enTaller > 0 ? 'aviso' : 'neutro'}
          href="/vehiculos?estado=EN_TALLER"
        />
      </GrillaResumen>

      <TituloSeccion
        accion={
          <Link
            href="/vehiculos/solicitudes"
            className="text-menor text-grafito underline"
          >
            Ver todas
          </Link>
        }
      >
        Solicitudes sin asignar
      </TituloSeccion>

      {datos.solicitudesSinAsignar.length === 0 ? (
        <EstadoVacio
          titulo="No hay solicitudes sin asignar"
          mensaje="Cuando una obra pida un viaje, aparece acá."
          icono={<Truck className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {datos.solicitudesSinAsignar.map((s) => (
            <FilaLista
              key={s.id}
              titulo={s.destino}
              subtitulo={`${s.obra} · ${fechaCorta(s.fechaHoraNecesaria)} ${hora(s.fechaHoraNecesaria)}`}
              detalle={s.pesoEstimadoKg ? peso(s.pesoEstimadoKg) : undefined}
              tono={s.prioridad === 'URGENTE' ? 'critico' : s.prioridad === 'ALTA' ? 'aviso' : 'neutro'}
              debajoDerecha={
                s.prioridad === 'URGENTE' || s.prioridad === 'ALTA' ? (
                  <Insignia tono={s.prioridad === 'URGENTE' ? 'critico' : 'aviso'}>
                    {textoEnum(s.prioridad)}
                  </Insignia>
                ) : undefined
              }
              href={`/vehiculos/solicitudes/${s.id}`}
            />
          ))}
        </Lista>
      )}

      <TituloSeccion
        accion={
          <Link href="/vehiculos/agenda" className="text-menor text-grafito underline">
            Ver agenda
          </Link>
        }
      >
        Viajes de hoy
      </TituloSeccion>

      {datos.viajesDeHoy.length === 0 ? (
        <EstadoVacio
          titulo="No hay viajes programados para hoy"
          mensaje="Asigná una solicitud o creá un viaje directo."
          icono={<CalendarClock className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {datos.viajesDeHoy.map((v) => (
            <FilaLista
              key={v.id}
              titulo={v.destino}
              subtitulo={`${v.vehiculo} · ${v.chofer}`}
              derecha={hora(v.salidaPrevista)}
              debajoDerecha={
                <Insignia tono={v.estado === 'EN_CURSO' ? 'correcto' : 'neutro'}>
                  {v.estado === 'EN_CURSO' ? 'En viaje' : 'Programado'}
                </Insignia>
              }
              href={`/vehiculos/viajes/${v.id}`}
            />
          ))}
        </Lista>
      )}

      <TituloSeccion>Vencimientos próximos</TituloSeccion>
      {datos.vencimientosProximos.length === 0 ? (
        <EstadoVacio
          titulo="Toda la documentación al día"
          mensaje="No hay nada por vencer en los próximos 15 días."
        />
      ) : (
        <Lista>
          {datos.vencimientosProximos.map((d) => (
            <FilaLista
              key={d.id}
              titulo={textoEnum(d.tipo)}
              subtitulo={d.patente}
              tono={d.diasRestantes < 0 ? 'critico' : 'aviso'}
              debajoDerecha={
                <Insignia tono={d.diasRestantes < 0 ? 'critico' : 'aviso'}>
                  {textoVencimiento(d.vencimiento)}
                </Insignia>
              }
              href="/vehiculos?vencimientos=1"
            />
          ))}
        </Lista>
      )}
    </>
  )
}
