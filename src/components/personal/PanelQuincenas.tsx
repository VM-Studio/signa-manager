'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange, Plus } from 'lucide-react'
import { EstadoQuincena } from '@prisma/client'
import {
  accionAbrirQuincenaActual,
} from '@/server/personal/quincenas'
import {
  Boton,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
  type TonoInsignia,
} from '@/components/ui'
import { nombreQuincena } from '@/server/personal/reglas'
import { fechaCorta, plural } from '@/lib/formato'

export const ESTADO_QUINCENA: Record<
  EstadoQuincena,
  { texto: string; tono: TonoInsignia }
> = {
  ABIERTA: { texto: 'Abierta', tono: 'correcto' },
  CERRADA: { texto: 'Cerrada', tono: 'neutro' },
  ENVIADA_AL_ESTUDIO: { texto: 'En el estudio', tono: 'neutro' },
  PAGADA: { texto: 'Pagada', tono: 'neutro' },
}

export interface QuincenaDeLista {
  id: string
  anio: number
  mes: number
  numero: number
  desde: Date
  hasta: Date
  estado: EstadoQuincena
  lineas: number
  cerradaPor: string | null
}

export function PanelQuincenas({
  quincenas,
  hayActual,
  puedeCerrar,
}: {
  quincenas: QuincenaDeLista[]
  hayActual: boolean
  puedeCerrar: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const abrir = () => {
    empezar(async () => {
      const r = await accionAbrirQuincenaActual()
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Listo')
        if (r.id) router.push(`/personal/quincenas/${r.id}`)
      }
    })
  }

  const abiertas = quincenas.filter((q) => q.estado === EstadoQuincena.ABIERTA)
  const cerradas = quincenas.filter((q) => q.estado !== EstadoQuincena.ABIERTA)

  const fila = (q: QuincenaDeLista) => (
    <FilaLista
      key={q.id}
      titulo={nombreQuincena(q)}
      subtitulo={`${fechaCorta(q.desde)} al ${fechaCorta(q.hasta)}`}
      detalle={
        q.estado === EstadoQuincena.ABIERTA
          ? 'Se va sumando a medida que se aprueban los partes'
          : `${plural(q.lineas, 'línea')}${q.cerradaPor ? ` · cerró ${q.cerradaPor}` : ''}`
      }
      debajoDerecha={
        <Insignia tono={ESTADO_QUINCENA[q.estado].tono}>
          {ESTADO_QUINCENA[q.estado].texto}
        </Insignia>
      }
      href={`/personal/quincenas/${q.id}`}
    />
  )

  return (
    <div className="pb-8">
      {quincenas.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay quincenas"
          mensaje="Abrí la quincena en curso para empezar a acumular horas."
          icono={<CalendarRange className="size-8" strokeWidth={1.5} />}
          accion={puedeCerrar ? { texto: 'Abrir la quincena actual', alTocar: abrir } : undefined}
        />
      ) : (
        <>
          {abiertas.length > 0 && (
            <>
              <TituloSeccion>En curso</TituloSeccion>
              <Lista>{abiertas.map(fila)}</Lista>
            </>
          )}

          {!hayActual && puedeCerrar && (
            <div className="px-4 pt-4">
              <Boton
                ancho
                cargando={pendiente}
                iconoIzquierda={<Plus aria-hidden className="size-4" />}
                onClick={abrir}
              >
                Abrir la quincena de este período
              </Boton>
            </div>
          )}

          {cerradas.length > 0 && (
            <>
              <TituloSeccion>Anteriores</TituloSeccion>
              <Lista>{cerradas.map(fila)}</Lista>
            </>
          )}
        </>
      )}
    </div>
  )
}
