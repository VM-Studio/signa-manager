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
  TablaAdaptable,
  type ColumnaTabla,
  GrillaResumen,
  HojaInferior,
  Insignia,
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

  /*
   * La quincena en escritorio: todas las columnas de horas y costos a
   * la vista, sin desplazarse. Es la pantalla contra la que
   * administración discute cada quincena, y tener que abrir fila por
   * fila para ver las extras hacía imposible compararlas.
   */
  const columnasEmpleados: Array<ColumnaTabla<EmpleadoQuincena>> = [
    {
      clave: 'legajo',
      titulo: 'Legajo',
      ancho: '90px',
      comparar: (a, b) => a.legajo.localeCompare(b.legajo, 'es'),
      celda: (e) => <span className="cifras text-grafito">{e.legajo}</span>,
    },
    {
      clave: 'nombre',
      titulo: 'Empleado',
      comparar: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      celda: (e) => <span className="font-medium text-negro">{e.nombre}</span>,
    },
    {
      clave: 'obras',
      titulo: 'Obras',
      soloAncho: true,
      celda: (e) => (
        <span className="text-grafito">{e.obras.join(', ') || '—'}</span>
      ),
    },
    {
      clave: 'dias',
      titulo: 'Días',
      alineacion: 'derecha',
      ancho: '70px',
      comparar: (a, b) => a.dias - b.dias,
      celda: (e) => numero(e.dias),
    },
    {
      clave: 'normales',
      titulo: 'Normales',
      alineacion: 'derecha',
      ancho: '95px',
      comparar: (a, b) => a.horasNormales - b.horasNormales,
      celda: (e) => horas(e.horasNormales),
    },
    {
      clave: 'extra50',
      titulo: 'Al 50%',
      alineacion: 'derecha',
      ancho: '85px',
      comparar: (a, b) => a.horasExtra50 - b.horasExtra50,
      celda: (e) =>
        e.horasExtra50 > 0 ? (
          <span className="text-aviso">{horas(e.horasExtra50)}</span>
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'extra100',
      titulo: 'Al 100%',
      alineacion: 'derecha',
      ancho: '90px',
      comparar: (a, b) => a.horasExtra100 - b.horasExtra100,
      celda: (e) =>
        e.horasExtra100 > 0 ? (
          <span className="text-aviso">{horas(e.horasExtra100)}</span>
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'ausencias',
      titulo: 'Ausencias',
      alineacion: 'derecha',
      ancho: '95px',
      soloAncho: true,
      comparar: (a, b) => a.ausencias - b.ausencias,
      celda: (e) =>
        e.ausencias > 0 ? (
          <span className="text-critico">{numero(e.ausencias)}</span>
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'costo',
      titulo: 'Mano de obra',
      alineacion: 'derecha',
      ancho: '130px',
      comparar: (a, b) => a.costo - b.costo,
      celda: (e) => moneda(e.costo),
    },
    {
      clave: 'novedades',
      titulo: 'Novedades',
      alineacion: 'derecha',
      ancho: '120px',
      comparar: (a, b) => a.novedades - b.novedades,
      celda: (e) =>
        e.novedades !== 0 ? (
          moneda(e.novedades)
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'neto',
      titulo: 'Neto',
      alineacion: 'derecha',
      ancho: '130px',
      comparar: (a, b) => a.neto - b.neto,
      celda: (e) => <span className="font-medium text-negro">{moneda(e.neto)}</span>,
    },
    ...(abierta
      ? []
      : [
          {
            clave: 'cobro',
            titulo: 'Pago',
            ancho: '110px',
            comparar: (a: EmpleadoQuincena, b: EmpleadoQuincena) =>
              Number(a.cobro) - Number(b.cobro),
            celda: (e: EmpleadoQuincena) => (
              <Insignia tono={e.cobro ? 'correcto' : 'aviso'}>
                {e.cobro ? 'Cobró' : 'Sin pagar'}
              </Insignia>
            ),
          },
        ]),
  ]

  const columnasObras: Array<ColumnaTabla<ObraQuincena>> = [
    {
      clave: 'obra',
      titulo: 'Obra',
      comparar: (a, b) => a.obra.localeCompare(b.obra, 'es'),
      celda: (o) => <span className="font-medium text-negro">{o.obra}</span>,
    },
    {
      clave: 'personas',
      titulo: 'Personas',
      alineacion: 'derecha',
      ancho: '110px',
      comparar: (a, b) => a.personas - b.personas,
      celda: (o) => numero(o.personas),
    },
    {
      clave: 'horas',
      titulo: 'Horas',
      alineacion: 'derecha',
      ancho: '110px',
      comparar: (a, b) => a.horas - b.horas,
      celda: (o) => horas(o.horas),
    },
    {
      clave: 'costo',
      titulo: 'Mano de obra',
      alineacion: 'derecha',
      ancho: '150px',
      comparar: (a, b) => a.costo - b.costo,
      celda: (o) => <span className="font-medium text-negro">{moneda(o.costo)}</span>,
    },
  ]

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
        <TablaAdaptable
          datos={empleados}
          columnas={columnasEmpleados}
          claveFila={(e) => e.empleadoId}
          href={(e) => `/personal/empleados/${e.empleadoId}`}
          ordenInicial={{ clave: 'nombre' }}
          porPagina={100}
          filaMovil={(e) => (
            <FilaLista
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
          )}
        />
      ) : (
        <TablaAdaptable
          datos={obras}
          columnas={columnasObras}
          claveFila={(o) => o.obraId}
          href={(o) => `/obras/${o.obraId}?pestana=personal`}
          ordenInicial={{ clave: 'costo', descendente: true }}
          porPagina={100}
          filaMovil={(o) => (
            <FilaLista
              titulo={o.obra}
              subtitulo={`${plural(o.personas, 'persona')} · ${horas(o.horas)}`}
              derecha={moneda(o.costo)}
              href={`/obras/${o.obraId}?pestana=personal`}
            />
          )}
        />
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
                <p className="py-2 text-menor text-metadato">
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
