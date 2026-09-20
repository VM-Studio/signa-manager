'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { EstadoSync } from '@prisma/client'
import { accionSincronizarAhora } from '@/server/nucleo/sincronizacion'
import type { ResultadoSync } from '@/lib/integracion/sincronizar'
import {
  AvisoFijo,
  Boton,
  Dato,
  EstadoVacio,
  FilaLista,
  HojaInferior,
  Insignia,
  Lista,
  ListaDatos,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { fechaYHora, haceCuanto, numero, plural } from '@/lib/formato'

export interface RegistroVista {
  id: string
  fuente: string
  inicio: Date
  fin: Date | null
  estado: EstadoSync
  obras: number
  movimientos: number
  pedidos: number
  error: string | null
}

export function PanelSincronizacion({
  fuente,
  nombreFuente,
  ultimo,
  historial,
  puedeSincronizar,
  horasDesdeLaUltima,
}: {
  fuente: string
  nombreFuente: string
  ultimo: RegistroVista | null
  historial: RegistroVista[]
  puedeSincronizar: boolean
  horasDesdeLaUltima: number | null
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()
  const [resultado, setResultado] = useState<ResultadoSync | null>(null)
  const [detalle, setDetalle] = useState<RegistroVista | null>(null)

  const sincronizar = () => {
    empezar(async () => {
      const r = await accionSincronizarAhora()
      setResultado(r)
      if (r.ok) {
        avisos.correcto(
          `Se trajeron ${plural(r.movimientos, 'movimiento')} y ${plural(r.pedidos, 'pedido')}`,
        )
      } else {
        avisos.error('La sincronización falló')
      }
      router.refresh()
    })
  }

  // Un tablero con datos viejos es peor que no tener tablero.
  const atrasada = horasDesdeLaUltima !== null && horasDesdeLaUltima > 6
  const nuncaCorrio = ultimo === null

  return (
    <div className="pb-8">
      {/* Estado de la conexión */}
      <div className="border-b border-niebla bg-blanco px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-menor text-grafito">Sistema base conectado</p>
            <p className="mt-0.5 text-titulo font-medium text-negro">
              {nombreFuente}
            </p>
            {fuente === 'mock' && (
              <p className="mt-1 text-menor text-metadato">
                Datos de ejemplo. Cuando se decida entre Lebane y Sorby, se
                cambia la variable SISTEMA_BASE y no hace falta tocar nada más.
              </p>
            )}
          </div>
          <IconoEstado estado={ultimo?.estado} />
        </div>
      </div>

      {(atrasada || nuncaCorrio) && (
        <div className="px-4 pt-4">
          <AvisoFijo
            tono={nuncaCorrio ? 'aviso' : 'critico'}
            titulo={
              nuncaCorrio
                ? 'Todavía no se sincronizó nunca'
                : 'La sincronización está atrasada'
            }
          >
            {nuncaCorrio
              ? 'Tocá "Sincronizar ahora" para traer las obras, los movimientos y los pedidos del sistema base.'
              : `La última corrida fue ${haceCuanto(ultimo.inicio)}. Los números del tablero pueden estar desactualizados.`}
          </AvisoFijo>
        </div>
      )}

      {ultimo?.estado === EstadoSync.ERROR && ultimo.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico" titulo="La última sincronización falló">
            {ultimo.error}
          </AvisoFijo>
        </div>
      )}

      {ultimo && (
        <>
          <TituloSeccion>Última sincronización</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Cuándo">{fechaYHora(ultimo.inicio)}</Dato>
              <Dato etiqueta="Hace">{haceCuanto(ultimo.inicio)}</Dato>
              <Dato etiqueta="Obras">{numero(ultimo.obras)}</Dato>
              <Dato etiqueta="Movimientos">{numero(ultimo.movimientos)}</Dato>
              <Dato etiqueta="Pedidos de compra">{numero(ultimo.pedidos)}</Dato>
              {ultimo.fin && (
                <Dato etiqueta="Duración">
                  {((ultimo.fin.getTime() - ultimo.inicio.getTime()) / 1000).toFixed(1)} s
                </Dato>
              )}
            </ListaDatos>
          </div>
        </>
      )}

      {puedeSincronizar && (
        <div className="px-4 pt-5">
          <Boton
            ancho
            tamano="grande"
            cargando={pendiente}
            onClick={sincronizar}
            iconoIzquierda={<RefreshCw aria-hidden className="size-5" />}
          >
            {pendiente ? 'Sincronizando…' : 'Sincronizar ahora'}
          </Boton>
          <p className="mt-2 text-center text-menor text-metadato">
            También corre sola cada hora.
          </p>
        </div>
      )}

      <TituloSeccion>Historial</TituloSeccion>
      {historial.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay sincronizaciones"
          mensaje="Cuando corra la primera, queda registrada acá."
        />
      ) : (
        <Lista>
          {historial.map((r) => (
            <FilaLista
              key={r.id}
              titulo={fechaYHora(r.inicio)}
              subtitulo={`${numero(r.obras)} obras · ${numero(r.movimientos)} movimientos · ${numero(r.pedidos)} pedidos`}
              detalle={r.fuente}
              tono={
                r.estado === EstadoSync.ERROR
                  ? 'critico'
                  : r.error
                    ? 'aviso'
                    : 'neutro'
              }
              debajoDerecha={
                <Insignia
                  tono={
                    r.estado === EstadoSync.OK
                      ? r.error
                        ? 'aviso'
                        : 'correcto'
                      : r.estado === EstadoSync.ERROR
                        ? 'critico'
                        : 'neutro'
                  }
                >
                  {r.estado === EstadoSync.OK
                    ? r.error
                      ? 'Con avisos'
                      : 'Correcta'
                    : r.estado === EstadoSync.ERROR
                      ? 'Falló'
                      : 'En curso'}
                </Insignia>
              }
              alTocar={r.error ? () => setDetalle(r) : undefined}
              flecha={Boolean(r.error)}
            />
          ))}
        </Lista>
      )}

      {/* Detalle de una corrida con avisos o errores */}
      <HojaInferior
        abierta={detalle !== null}
        alCerrar={() => setDetalle(null)}
        titulo={
          detalle?.estado === EstadoSync.ERROR
            ? 'Por qué falló'
            : 'Cosas para revisar'
        }
        descripcion={detalle ? fechaYHora(detalle.inicio) : undefined}
      >
        <p className="text-base whitespace-pre-line text-grafito">
          {detalle?.error}
        </p>
      </HojaInferior>

      {/* Resultado de la corrida que se acaba de disparar a mano */}
      <HojaInferior
        abierta={resultado !== null}
        alCerrar={() => setResultado(null)}
        titulo={resultado?.ok ? 'Sincronización terminada' : 'La sincronización falló'}
        pie={
          <Boton ancho onClick={() => setResultado(null)}>
            Entendido
          </Boton>
        }
      >
        {resultado?.ok ? (
          <>
            <ListaDatos className="px-0">
              <Dato etiqueta="Obras">{numero(resultado.obras)}</Dato>
              <Dato etiqueta="Movimientos">{numero(resultado.movimientos)}</Dato>
              <Dato etiqueta="Pedidos de compra">{numero(resultado.pedidos)}</Dato>
              <Dato etiqueta="Tardó">{(resultado.duracion / 1000).toFixed(1)} s</Dato>
            </ListaDatos>
            {resultado.advertencias.length > 0 && (
              <div className="mt-4">
                <AvisoFijo tono="aviso" titulo="Para revisar">
                  <ul className="list-inside list-disc space-y-1">
                    {resultado.advertencias.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </AvisoFijo>
              </div>
            )}
          </>
        ) : (
          <AvisoFijo tono="critico">{resultado?.error}</AvisoFijo>
        )}
      </HojaInferior>
    </div>
  )
}

function IconoEstado({ estado }: { estado?: EstadoSync }) {
  if (estado === EstadoSync.OK) {
    return <CheckCircle2 aria-hidden className="size-6 shrink-0 text-correcto" />
  }
  if (estado === EstadoSync.ERROR) {
    return <XCircle aria-hidden className="size-6 shrink-0 text-critico" />
  }
  return <AlertTriangle aria-hidden className="size-6 shrink-0 text-metadato" />
}
