'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Download, Lock, Send, Wallet } from 'lucide-react'
import { EstadoQuincena } from '@prisma/client'
import {
  accionCerrarQuincena,
  accionMarcarEnviadaAlEstudio,
  accionMarcarPagada,
  revisarAntesDeCerrar,
  type Pendiente,
} from '@/server/personal/quincenas'
import {
  AvisoFijo,
  Boton,
  Dato,
  FilaLista,
  GrillaResumen,
  HojaInferior,
  Insignia,
  Lista,
  ListaDatos,
  NumeroResumen,
  Pestanas,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { ESTADO_QUINCENA } from './PanelQuincenas'
import { nombreQuincena } from '@/server/personal/reglas'
import { fechaCorta, horas, moneda, monedaCorta, numero, plural } from '@/lib/formato'

interface EmpleadoQuincena {
  empleadoId: string
  nombre: string
  legajo: string
  dias: number
  horasNormales: number
  horasExtra50: number
  horasExtra100: number
  ausencias: number
  costo: number
  obras: string[]
  novedades: number
  neto: number
  cobro: boolean
}

interface ObraQuincena {
  obraId: string
  obra: string
  personas: number
  horas: number
  costo: number
}

export function DetalleQuincena({
  quincena,
  abierta,
  empleados,
  obras,
  totales,
  puedeCerrar,
}: {
  quincena: {
    id: string
    anio: number
    mes: number
    numero: number
    desde: Date
    hasta: Date
    estado: EstadoQuincena
    cerradaEn: Date | null
    cerradaPor: string | null
  }
  abierta: boolean
  empleados: EmpleadoQuincena[]
  obras: ObraQuincena[]
  totales: { costo: number; horas: number; personas: number }
  puedeCerrar: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const [vista, setVista] = useState<'empleados' | 'obras'>('empleados')
  const [revisando, setRevisando] = useState(false)
  const [pendientes, setPendientes] = useState<Pendiente[] | null>(null)

  const abrirRevision = () => {
    setRevisando(true)
    setPendientes(null)
    empezar(async () => {
      setPendientes(await revisarAntesDeCerrar(quincena.id))
    })
  }

  const cerrar = () => {
    empezar(async () => {
      const r = await accionCerrarQuincena(quincena.id)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Cerrada')
        setRevisando(false)
        router.refresh()
      }
    })
  }

  const marcar = (accion: 'estudio' | 'pagada') => {
    empezar(async () => {
      const r =
        accion === 'estudio'
          ? await accionMarcarEnviadaAlEstudio(quincena.id)
          : await accionMarcarPagada(quincena.id)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Listo')
        router.refresh()
      }
    })
  }

  const sinCobrar = empleados.filter((e) => !e.cobro).length

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <Insignia tono={ESTADO_QUINCENA[quincena.estado].tono}>
          {ESTADO_QUINCENA[quincena.estado].texto}
        </Insignia>
        <span className="text-menor text-grafito">
          {fechaCorta(quincena.desde)} al {fechaCorta(quincena.hasta)}
        </span>
      </div>

      {abierta && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="neutro">
            Esta quincena está abierta: los números se van actualizando a
            medida que el jefe de obra aprueba los partes.
          </AvisoFijo>
        </div>
      )}

      <GrillaResumen columnas={3}>
        <NumeroResumen etiqueta="Personas" valor={numero(totales.personas)} />
        <NumeroResumen etiqueta="Horas" valor={numero(totales.horas)} />
        <NumeroResumen
          etiqueta="Costo"
          valor={monedaCorta(totales.costo)}
          detalle="mano de obra"
        />
      </GrillaResumen>

      {/* Acciones */}
      <div className="space-y-2 px-4 pt-2">
        {puedeCerrar && abierta && (
          <Boton
            ancho
            tamano="grande"
            iconoIzquierda={<Lock aria-hidden className="size-5" />}
            onClick={abrirRevision}
          >
            Cerrar la quincena
          </Boton>
        )}

        {!abierta && (
          <a
            href={`/api/quincenas/${quincena.id}/exportar`}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-negro text-titulo font-medium text-blanco active:bg-carbon"
          >
            <Download aria-hidden className="size-5" />
            Exportar para el estudio
          </a>
        )}

        {puedeCerrar && quincena.estado === EstadoQuincena.CERRADA && (
          <Boton
            variante="secundario"
            ancho
            cargando={pendiente}
            iconoIzquierda={<Send aria-hidden className="size-4" />}
            onClick={() => marcar('estudio')}
          >
            Marcar como enviada al estudio
          </Boton>
        )}

        {puedeCerrar && quincena.estado === EstadoQuincena.ENVIADA_AL_ESTUDIO && (
          <Boton
            variante="secundario"
            ancho
            cargando={pendiente}
            iconoIzquierda={<Wallet aria-hidden className="size-4" />}
            onClick={() => marcar('pagada')}
          >
            Marcar como pagada
          </Boton>
        )}
      </div>

      {!abierta && sinCobrar > 0 && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="aviso" titulo="Pagos pendientes">
            {plural(sinCobrar, 'persona', 'personas')} sin pago registrado en
            esta quincena.
          </AvisoFijo>
        </div>
      )}

      <Pestanas
        activa={vista}
        alCambiar={(id) => setVista(id as 'empleados' | 'obras')}
        pestanas={[
          { id: 'empleados', texto: 'Por empleado', cantidad: empleados.length },
          { id: 'obras', texto: 'Por obra', cantidad: obras.length },
        ]}
        className="mt-5"
      />

      {vista === 'empleados' ? (
        <Lista>
          {empleados.map((e) => (
            <FilaLista
              key={e.empleadoId}
              titulo={e.nombre}
              subtitulo={`Legajo ${e.legajo} · ${plural(e.dias, 'día')} · ${horas(e.horasNormales + e.horasExtra50 + e.horasExtra100)}`}
              detalle={
                [
                  e.obras.join(', '),
                  e.horasExtra50 + e.horasExtra100 > 0
                    ? `${horas(e.horasExtra50 + e.horasExtra100)} extra`
                    : null,
                  e.ausencias > 0 ? plural(e.ausencias, 'ausencia') : null,
                  e.novedades !== 0 ? `Novedades ${moneda(e.novedades)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              derecha={moneda(e.neto)}
              debajoDerecha={
                !abierta ? (
                  <Insignia tono={e.cobro ? 'correcto' : 'aviso'}>
                    {e.cobro ? 'Cobró' : 'Sin pagar'}
                  </Insignia>
                ) : undefined
              }
              href={`/personal/empleados/${e.empleadoId}`}
            />
          ))}
        </Lista>
      ) : (
        <Lista>
          {obras.map((o) => (
            <FilaLista
              key={o.obraId}
              titulo={o.obra}
              subtitulo={`${plural(o.personas, 'persona')} · ${horas(o.horas)}`}
              derecha={moneda(o.costo)}
              href={`/obras/${o.obraId}?pestana=personal`}
            />
          ))}
        </Lista>
      )}

      {!abierta && (
        <>
          <TituloSeccion>Cierre</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Cerrada el">{fechaCorta(quincena.cerradaEn)}</Dato>
              <Dato etiqueta="Por">{quincena.cerradaPor ?? '—'}</Dato>
            </ListaDatos>
          </div>
        </>
      )}

      {/* Revisión antes de cerrar */}
      <HojaInferior
        abierta={revisando}
        alCerrar={() => setRevisando(false)}
        titulo="Antes de cerrar"
        descripcion={nombreQuincena(quincena)}
        alto="alto"
        pie={
          <div className="flex gap-2">
            <Boton variante="secundario" ancho onClick={() => setRevisando(false)}>
              Cancelar
            </Boton>
            <Boton ancho cargando={pendiente} onClick={cerrar}>
              Cerrar igual
            </Boton>
          </div>
        }
      >
        {pendientes === null ? (
          <p className="text-base text-grafito">Revisando el período…</p>
        ) : pendientes.length === 0 ? (
          <AvisoFijo tono="correcto" titulo="Está todo en orden">
            Todos los partes del período están aprobados y no falta ningún día
            hábil. Al cerrar se genera la foto por empleado y obra, y los
            partes de estas fechas quedan bloqueados.
          </AvisoFijo>
        ) : (
          <div className="space-y-3">
            <AvisoFijo
              tono="aviso"
              titulo={`${plural(pendientes.length, 'cosa', 'cosas')} sin resolver`}
            >
              Si cerrás igual, estas horas no van a entrar en la liquidación.
            </AvisoFijo>
            <div className="divide-y divide-niebla">
              {pendientes.slice(0, 30).map((p, i) => (
                <div key={i} className="flex items-start gap-2 py-2.5">
                  <AlertTriangle
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-aviso"
                  />
                  <div className="min-w-0">
                    <p className="text-base text-negro">{p.obra}</p>
                    <p className="text-menor text-grafito">{p.detalle}</p>
                  </div>
                </div>
              ))}
              {pendientes.length > 30 && (
                <p className="py-2 text-menor text-acero">
                  y {pendientes.length - 30} más…
                </p>
              )}
            </div>
          </div>
        )}
      </HojaInferior>
    </div>
  )
}
