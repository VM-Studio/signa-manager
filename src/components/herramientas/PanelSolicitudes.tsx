'use client'

import { useState } from 'react'
import { Inbox, Plus } from 'lucide-react'
import { EstadoSolicitudHerramienta } from '@prisma/client'
import {
  BotonFlotante,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  Tarjeta,
  TituloSeccion,
  type TonoInsignia,
} from '@/components/ui'
import { fechaRelativaCorta, moneda, numero, plural, textoEnum } from '@/lib/formato'

export const ESTADO_SOLICITUD: Record<
  EstadoSolicitudHerramienta,
  { texto: string; tono: TonoInsignia }
> = {
  PENDIENTE: { texto: 'Pendiente', tono: 'aviso' },
  RESUELTA_CON_STOCK: { texto: 'Resuelta con stock', tono: 'correcto' },
  DERIVADA_A_COMPRA: { texto: 'Derivada a compra', tono: 'neutro' },
  RECHAZADA: { texto: 'Rechazada', tono: 'neutro' },
  CANCELADA: { texto: 'Cancelada', tono: 'neutro' },
}

export interface SolicitudDeLista {
  id: string
  descripcion: string
  cantidad: number
  fechaNecesaria: Date
  prioridad: string
  estado: EstadoSolicitudHerramienta
  obra: string
  solicitante: string
  creadaEn: Date
  herramientasEntregadas: number
}

export function PanelSolicitudes({
  solicitudes,
  comprasEvitadas,
  puedeCrear,
}: {
  solicitudes: SolicitudDeLista[]
  comprasEvitadas: { cantidad: number; monto: number }
  puedeCrear: boolean
}) {
  const [filtro, setFiltro] = useState<string[]>([])

  const visibles =
    filtro.length === 0
      ? solicitudes
      : solicitudes.filter((s) => filtro.includes(s.estado))

  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE')

  return (
    <div className="pb-24">
      {/* El número que le importa al dueño: cuánto se dejó de comprar
          porque la herramienta ya estaba en algún lado. */}
      <div className="px-4 pt-4">
        <Tarjeta className="border-[color-mix(in_srgb,var(--color-correcto)_25%,transparent)] bg-[var(--color-correcto-suave)]">
          <p className="text-menor text-correcto">Compras evitadas este mes</p>
          <p className="cifras mt-1 text-cifra font-medium text-correcto">
            {moneda(comprasEvitadas.monto)}
          </p>
          <p className="mt-0.5 text-menor text-correcto">
            {plural(
              comprasEvitadas.cantidad,
              'solicitud resuelta',
              'solicitudes resueltas',
            )}{' '}
            con herramientas que ya teníamos.
          </p>
        </Tarjeta>
      </div>

      <ChipsFiltro
        chips={[
          { valor: 'PENDIENTE', texto: 'Pendientes', cantidad: pendientes.length },
          { valor: 'RESUELTA_CON_STOCK', texto: 'Resueltas con stock' },
          { valor: 'DERIVADA_A_COMPRA', texto: 'A compra' },
          { valor: 'RECHAZADA', texto: 'Rechazadas' },
        ]}
        activos={filtro}
        alCambiar={setFiltro}
        textoTodos="Todas"
        multiple
      />

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo="No hay solicitudes"
          mensaje={
            filtro.length > 0
              ? 'Probá sacando algún filtro.'
              : 'Cuando una obra pida una herramienta, aparece acá.'
          }
          icono={<Inbox className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <>
          <TituloSeccion>{plural(visibles.length, 'solicitud', 'solicitudes')}</TituloSeccion>
          <Lista>
            {visibles.map((s) => {
              const estado = ESTADO_SOLICITUD[s.estado]
              const urgente = s.prioridad === 'URGENTE' && s.estado === 'PENDIENTE'
              const alta = s.prioridad === 'ALTA' && s.estado === 'PENDIENTE'

              return (
                <FilaLista
                  key={s.id}
                  titulo={s.descripcion}
                  subtitulo={`${s.obra} · pide ${s.solicitante}`}
                  detalle={`Para el ${fechaRelativaCorta(s.fechaNecesaria).toLowerCase()}${s.cantidad > 1 ? ` · ${numero(s.cantidad)} unidades` : ''}`}
                  tono={urgente ? 'critico' : alta ? 'aviso' : 'neutro'}
                  debajoDerecha={
                    <div className="flex flex-col items-end gap-1">
                      <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                      {(urgente || alta) && (
                        <Insignia tono={urgente ? 'critico' : 'aviso'}>
                          {textoEnum(s.prioridad)}
                        </Insignia>
                      )}
                    </div>
                  }
                  href={`/herramientas/solicitudes/${s.id}`}
                />
              )
            })}
          </Lista>
        </>
      )}

      {puedeCrear && (
        <BotonFlotante
          href="/herramientas/solicitudes/nueva"
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Pedir una herramienta"
        >
          Pedir
        </BotonFlotante>
      )}
    </div>
  )
}
