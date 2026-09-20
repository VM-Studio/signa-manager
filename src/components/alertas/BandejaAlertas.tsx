'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, BellOff, CheckCircle2, Eye, RefreshCw } from 'lucide-react'
import { EstadoAlerta, Severidad } from '@prisma/client'
import {
  accionDescartar,
  accionEvaluarAhora,
  accionMarcarVista,
} from '@/server/alertas/acciones'
import type { AlertaDeLista } from '@/server/alertas/queries'
import {
  Boton,
  CampoTextoLargo,
  ChipsFiltro,
  EstadoVacio,
  HojaInferior,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
  type TonoInsignia,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { fechaCorta, haceCuanto, plural } from '@/lib/formato'

const TONO_SEVERIDAD: Record<Severidad, TonoInsignia> = {
  CRITICA: 'critico',
  AVISO: 'aviso',
  INFO: 'neutro',
}

const TEXTO_SEVERIDAD: Record<Severidad, string> = {
  CRITICA: 'Crítica',
  AVISO: 'Aviso',
  INFO: 'Info',
}

const NOMBRE_MODULO: Record<string, string> = {
  herramientas: 'Herramientas',
  personal: 'Personal',
  vehiculos: 'Vehículos',
  compras: 'Compras',
  obras: 'Obras',
  sistema: 'Sistema',
}

export function BandejaAlertas({
  alertas,
  historial,
  obras,
  puedeDescartar,
}: {
  alertas: AlertaDeLista[]
  historial: AlertaDeLista[]
  obras: Array<{ id: string; codigo: string }>
  puedeDescartar: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const [modulos, setModulos] = useState<string[]>([])
  const [obrasElegidas, setObras] = useState<string[]>([])
  const [verHistorial, setVerHistorial] = useState(false)
  const [descartando, setDescartando] = useState<AlertaDeLista | null>(null)
  const [detalle, setDetalle] = useState<AlertaDeLista | null>(null)

  const visibles = useMemo(() => {
    const lista = verHistorial ? historial : alertas
    return lista.filter((a) => {
      if (modulos.length > 0 && !modulos.includes(a.modulo)) return false
      if (obrasElegidas.length > 0) {
        if (!a.obra || !obrasElegidas.includes(a.obra.id)) return false
      }
      return true
    })
  }, [alertas, historial, verHistorial, modulos, obrasElegidas])

  const criticas = visibles.filter((a) => a.severidad === Severidad.CRITICA)
  const resto = visibles.filter((a) => a.severidad !== Severidad.CRITICA)

  const modulosPresentes = [
    ...new Set([...alertas, ...historial].map((a) => a.modulo)),
  ]

  const marcarVista = (alerta: AlertaDeLista) => {
    if (alerta.estado !== EstadoAlerta.ABIERTA) return
    empezar(async () => {
      await accionMarcarVista(alerta.id)
      router.refresh()
    })
  }

  const descartar = (datos: FormData) => {
    if (!descartando) return
    empezar(async () => {
      const r = await accionDescartar(
        descartando.id,
        String(datos.get('motivo') ?? ''),
      )
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Descartada')
        setDescartando(null)
        router.refresh()
      }
    })
  }

  const evaluar = () => {
    empezar(async () => {
      const r = await accionEvaluarAhora()
      avisos.correcto(
        `${plural(r.nuevas, 'alerta nueva', 'alertas nuevas')} · ${plural(r.resueltas, 'resuelta')}`,
      )
      router.refresh()
    })
  }

  const fila = (a: AlertaDeLista) => {
    const resuelta =
      a.estado === EstadoAlerta.RESUELTA || a.estado === EstadoAlerta.DESCARTADA

    return (
      <div
        key={a.id}
        className={cn(
          'bg-blanco',
          !resuelta && a.severidad === Severidad.CRITICA && 'border-l-2 border-l-critico',
          !resuelta && a.severidad === Severidad.AVISO && 'border-l-2 border-l-aviso',
        )}
      >
        <button
          type="button"
          onClick={() => {
            setDetalle(a)
            marcarVista(a)
          }}
          className="flex w-full min-h-[var(--toque-minimo)] items-start gap-3 px-4 py-3 text-left active:bg-hueso"
        >
          <span className="mt-0.5 shrink-0">
            {resuelta ? (
              <CheckCircle2 aria-hidden className="size-4 text-correcto" />
            ) : a.severidad === Severidad.CRITICA ? (
              <AlertTriangle aria-hidden className="size-4 text-critico" />
            ) : (
              <AlertTriangle aria-hidden className="size-4 text-aviso" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block text-base text-negro',
                a.estado === EstadoAlerta.ABIERTA && 'font-medium',
              )}
            >
              {a.titulo}
            </span>
            <span className="mt-0.5 block text-chico text-grafito line-clamp-2">
              {a.detalle}
            </span>
            <span className="mt-1 block text-micro text-metadato">
              {[
                NOMBRE_MODULO[a.modulo] ?? a.modulo,
                a.obra?.codigo,
                resuelta
                  ? `resuelta ${haceCuanto(a.resueltaEn ?? a.creadaEn)}`
                  : `desde ${haceCuanto(a.creadaEn)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>

          <span className="flex shrink-0 flex-col items-end gap-1">
            <Insignia tono={resuelta ? 'correcto' : TONO_SEVERIDAD[a.severidad]}>
              {resuelta
                ? a.estado === EstadoAlerta.DESCARTADA
                  ? 'Descartada'
                  : 'Resuelta'
                : TEXTO_SEVERIDAD[a.severidad]}
            </Insignia>
            {a.estado === EstadoAlerta.VISTA && (
              <span className="flex items-center gap-1 text-micro text-metadato">
                <Eye aria-hidden className="size-3" />
                Vista
              </span>
            )}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <ChipsFiltro
        chips={modulosPresentes.map((m) => ({
          valor: m,
          texto: NOMBRE_MODULO[m] ?? m,
        }))}
        activos={modulos}
        alCambiar={setModulos}
        textoTodos="Todos los módulos"
        multiple
      />

      {obras.length > 1 && (
        <ChipsFiltro
          chips={obras.map((o) => ({ valor: o.id, texto: o.codigo }))}
          activos={obrasElegidas}
          alCambiar={setObras}
          textoTodos="Todas las obras"
          multiple
          className="pt-0"
        />
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => setVerHistorial((v) => !v)}
          className="text-menor text-grafito underline"
        >
          {verHistorial ? 'Ver abiertas' : 'Ver historial'}
        </button>
        <button
          type="button"
          onClick={evaluar}
          disabled={pendiente}
          className="flex items-center gap-1 text-menor text-grafito underline disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden
            className={cn('size-3', pendiente && 'animate-spin')}
          />
          Revisar ahora
        </button>
      </div>

      {/* ------------- Lista a la izquierda, detalle a la derecha -------------

          En el celular se toca una alerta y se abre la hoja. En
          escritorio la lista queda a la izquierda y el detalle a la
          derecha, fijo: se recorren diez alertas sin abrir y cerrar. */}
      <div className="lg:flex lg:items-start lg:gap-6">
        <div className="min-w-0 lg:flex-1">
          {visibles.length === 0 ? (
            <EstadoVacio
              titulo={verHistorial ? 'Sin historial' : 'No hay alertas abiertas'}
              mensaje={
                verHistorial
                  ? 'Acá van a aparecer las alertas que se resolvieron.'
                  : 'Está todo en orden. El sistema revisa cada hora y avisa si algo se traba.'
              }
              icono={<BellOff className="size-8" strokeWidth={1.5} />}
            />
          ) : (
            <>
              {criticas.length > 0 && (
                <>
                  <TituloSeccion>
                    {plural(criticas.length, 'crítica', 'críticas')}
                  </TituloSeccion>
                  <Lista>{criticas.map(fila)}</Lista>
                </>
              )}

              {resto.length > 0 && (
                <>
                  <TituloSeccion>
                    {criticas.length > 0
                      ? 'Avisos'
                      : plural(resto.length, 'alerta')}
                  </TituloSeccion>
                  <Lista>{resto.map(fila)}</Lista>
                </>
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-[calc(var(--alto-barra-superior)+16px)] lg:block lg:w-[420px] lg:shrink-0 lg:overflow-hidden lg:rounded-[var(--radius-panel)] lg:border lg:border-niebla lg:bg-blanco">
          {detalle ? (
            <>
              <header className="border-b border-niebla px-4 py-3">
                <h2 className="text-titulo font-medium text-negro">
                  {detalle.titulo}
                </h2>
                <p className="text-menor text-grafito">
                  {NOMBRE_MODULO[detalle.modulo] ?? detalle.modulo}
                  {detalle.obra ? ` · ${detalle.obra.codigo}` : ''}
                </p>
              </header>

              <div className="px-4 py-4">
                <DetalleAlerta alerta={detalle} />
              </div>

              {detalle.estado !== EstadoAlerta.RESUELTA &&
                detalle.estado !== EstadoAlerta.DESCARTADA && (
                  <div className="flex gap-2 border-t border-niebla px-4 py-3">
                    {puedeDescartar && (
                      <Boton
                        variante="secundario"
                        ancho
                        onClick={() => setDescartando(detalle)}
                      >
                        Descartar
                      </Boton>
                    )}
                    {detalle.enlace && (
                      <Link
                        href={detalle.enlace}
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[var(--radius-control)] bg-negro px-4 text-base font-medium text-blanco transition-colors hover:bg-carbon"
                      >
                        Ir a resolverla
                      </Link>
                    )}
                  </div>
                )}
            </>
          ) : (
            <p className="px-4 py-10 text-center text-chico text-metadato">
              Elegí una alerta de la lista para ver el detalle.
            </p>
          )}
        </aside>
      </div>

      {/* Detalle de una alerta. En escritorio lo muestra el panel de la
          derecha, así que la hoja se esconde. */}
      <div className="lg:hidden">
      <HojaInferior
        abierta={detalle !== null}
        alCerrar={() => setDetalle(null)}
        titulo={detalle?.titulo ?? ''}
        descripcion={
          detalle
            ? `${NOMBRE_MODULO[detalle.modulo] ?? detalle.modulo}${detalle.obra ? ` · ${detalle.obra.codigo}` : ''}`
            : undefined
        }
        pie={
          detalle && detalle.estado !== EstadoAlerta.RESUELTA && detalle.estado !== EstadoAlerta.DESCARTADA ? (
            <div className="flex gap-2">
              {puedeDescartar && (
                <Boton
                  variante="secundario"
                  ancho
                  onClick={() => {
                    const a = detalle
                    setDetalle(null)
                    setDescartando(a)
                  }}
                >
                  Descartar
                </Boton>
              )}
              {detalle.enlace && (
                <Link
                  href={detalle.enlace}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[var(--radius-control)] bg-negro px-4 text-base font-medium text-blanco active:bg-carbon"
                >
                  Ir a resolverla
                </Link>
              )}
            </div>
          ) : undefined
        }
      >
        {detalle && <DetalleAlerta alerta={detalle} />}
      </HojaInferior>
      </div>

      {/* Descartar */}
      <HojaInferior
        abierta={descartando !== null}
        alCerrar={() => setDescartando(null)}
        titulo="Descartar la alerta"
        descripcion={descartando?.titulo}
      >
        <form action={descartar} className="space-y-4">
          <CampoTextoLargo
            name="motivo"
            etiqueta="¿Por qué se descarta?"
            required
            rows={3}
            placeholder="Ya se habló con el proveedor, entrega el lunes."
            ayuda="Queda registrado con tu nombre. Si el problema vuelve a aparecer, la alerta se abre de nuevo."
          />
          <Boton type="submit" ancho cargando={pendiente}>
            Descartar
          </Boton>
        </form>
      </HojaInferior>
    </div>
  )
}

/* ---------------------------------------------------------------------
   El cuerpo del detalle de una alerta.

   Lo usan la hoja inferior del celular y el panel de la derecha de
   escritorio: el mismo contenido, en dos contenedores distintos.
   --------------------------------------------------------------------- */

function DetalleAlerta({ alerta }: { alerta: AlertaDeLista }) {
  return (
    <div className="space-y-3">
      <Insignia tono={TONO_SEVERIDAD[alerta.severidad]}>
        {TEXTO_SEVERIDAD[alerta.severidad]}
      </Insignia>

      <p className="text-base whitespace-pre-line text-grafito">
        {alerta.detalle}
      </p>

      <div className="border-t border-niebla pt-3 text-menor text-metadato">
        <p>Regla: {alerta.nombreRegla}</p>
        <p>Abierta el {fechaCorta(alerta.creadaEn)}</p>
        {alerta.resueltaEn && (
          <p>
            {alerta.estado === EstadoAlerta.DESCARTADA
              ? 'Descartada'
              : 'Resuelta'}{' '}
            el {fechaCorta(alerta.resueltaEn)}
          </p>
        )}
      </div>
    </div>
  )
}
