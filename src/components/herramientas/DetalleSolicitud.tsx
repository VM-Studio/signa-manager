'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, PackageCheck, ShoppingCart, X } from 'lucide-react'
import { EstadoSolicitudHerramienta } from '@prisma/client'
import {
  accionCerrarSolicitud,
  accionResolverConStock,
} from '@/server/herramientas/acciones'
import {
  AvisoFijo,
  Boton,
  CampoSelect,
  CampoTextoLargo,
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
import { ESTADO_SOLICITUD } from './PanelSolicitudes'
import { fechaCorta, moneda, numero, plural, textoEnum } from '@/lib/formato'

export interface Candidata {
  id: string
  codigo: string
  nombre: string
  marca: string | null
  condicion: string
  valorCompra: number
  donde: string
  /** Por qué se la propone: está libre, quedó en una obra terminada, etc. */
  motivo: string
  tono: 'correcto' | 'aviso'
}

export function DetalleSolicitud({
  solicitud,
  candidatas,
  empleados,
  puedeResolver,
}: {
  solicitud: {
    id: string
    descripcion: string
    cantidad: number
    fechaNecesaria: Date
    prioridad: string
    estado: EstadoSolicitudHerramienta
    obra: string
    obraNombre: string
    categoria: string | null
    solicitante: string
    creadaEn: Date
    resolucionNota: string | null
    resueltaPor: string | null
    resueltaEn: Date | null
    entregadas: Array<{ id: string; codigo: string; nombre: string }>
  }
  candidatas: Candidata[]
  empleados: Array<{ id: string; nombre: string; apellido: string; legajo: string }>
  puedeResolver: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const [elegidas, setElegidas] = useState<string[]>([])
  const [resolviendo, setResolviendo] = useState(false)
  const [cerrando, setCerrando] = useState<'DERIVADA_A_COMPRA' | 'RECHAZADA' | null>(null)

  const estaPendiente = solicitud.estado === EstadoSolicitudHerramienta.PENDIENTE
  const estado = ESTADO_SOLICITUD[solicitud.estado]

  const valorEvitado = candidatas
    .filter((c) => elegidas.includes(c.id))
    .reduce((a, c) => a + c.valorCompra, 0)

  const alternar = (id: string) =>
    setElegidas((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const resolver = (datos: FormData) => {
    empezar(async () => {
      const r = await accionResolverConStock(
        solicitud.id,
        elegidas,
        String(datos.get('empleadoId') ?? '') || null,
        String(datos.get('nota') ?? ''),
      )
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Resuelta')
        setResolviendo(false)
        router.refresh()
      }
    })
  }

  const cerrar = (datos: FormData) => {
    if (!cerrando) return
    empezar(async () => {
      const r = await accionCerrarSolicitud(
        solicitud.id,
        cerrando,
        String(datos.get('nota') ?? ''),
      )
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Listo')
        setCerrando(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <Insignia tono={estado.tono}>{estado.texto}</Insignia>
        {estaPendiente && solicitud.prioridad !== 'NORMAL' && (
          <Insignia
            tono={solicitud.prioridad === 'URGENTE' ? 'critico' : 'aviso'}
          >
            {textoEnum(solicitud.prioridad)}
          </Insignia>
        )}
      </div>

      <TituloSeccion>Qué piden</TituloSeccion>
      <div className="border-y border-niebla bg-blanco px-4 py-3">
        <p className="text-titulo font-medium text-negro">
          {solicitud.descripcion}
        </p>
        <ListaDatos className="mt-2 px-0">
          <Dato etiqueta="Obra">
            {solicitud.obra} · {solicitud.obraNombre}
          </Dato>
          {solicitud.categoria && (
            <Dato etiqueta="Categoría">{solicitud.categoria}</Dato>
          )}
          <Dato etiqueta="Cantidad">{numero(solicitud.cantidad)}</Dato>
          <Dato etiqueta="La necesitan el">
            {fechaCorta(solicitud.fechaNecesaria)}
          </Dato>
          <Dato etiqueta="Pidió">{solicitud.solicitante}</Dato>
          <Dato etiqueta="Fecha del pedido">
            {fechaCorta(solicitud.creadaEn)}
          </Dato>
        </ListaDatos>
      </div>

      {/* Ya resuelta */}
      {!estaPendiente && (
        <>
          <TituloSeccion>Cómo se resolvió</TituloSeccion>
          <div className="border-y border-niebla bg-blanco px-4 py-3">
            <p className="text-base text-grafito">
              {solicitud.resolucionNota ?? 'Sin nota.'}
            </p>
            {solicitud.resueltaPor && (
              <p className="mt-2 text-menor text-acero">
                {solicitud.resueltaPor} · {fechaCorta(solicitud.resueltaEn)}
              </p>
            )}
          </div>

          {solicitud.entregadas.length > 0 && (
            <>
              <TituloSeccion>Herramientas entregadas</TituloSeccion>
              <Lista>
                {solicitud.entregadas.map((h) => (
                  <FilaLista
                    key={h.id}
                    titulo={h.nombre}
                    subtitulo={h.codigo}
                    href={`/herramientas/${h.id}`}
                  />
                ))}
              </Lista>
            </>
          )}
        </>
      )}

      {/* Lo que la empresa YA tiene: el freno a la compra duplicada */}
      {estaPendiente && puedeResolver && (
        <>
          <TituloSeccion>Lo que ya tenemos</TituloSeccion>

          {candidatas.length === 0 ? (
            <>
              <EstadoVacio
                titulo="No hay nada parecido disponible"
                mensaje="Revisá si conviene comprarla o alquilarla."
                icono={<AlertTriangle className="size-8" strokeWidth={1.5} />}
              />
            </>
          ) : (
            <>
              <p className="px-4 pb-2 text-menor text-grafito">
                Antes de comprar: estas {plural(candidatas.length, 'herramienta')}{' '}
                de la empresa podrían servir. Tocá las que vas a mandar.
              </p>

              <Lista>
                {candidatas.map((c) => {
                  const elegida = elegidas.includes(c.id)
                  return (
                    <FilaLista
                      key={c.id}
                      titulo={c.nombre}
                      subtitulo={`${c.codigo}${c.marca ? ` · ${c.marca}` : ''}`}
                      detalle={`${c.donde} · condición ${c.condicion.toLowerCase()}`}
                      tono={elegida ? 'correcto' : c.tono === 'aviso' ? 'aviso' : 'neutro'}
                      izquierda={
                        <span
                          aria-hidden
                          className={`flex size-6 shrink-0 items-center justify-center rounded-[4px] border-2 ${
                            elegida
                              ? 'border-negro bg-negro text-blanco'
                              : 'border-acero'
                          }`}
                        >
                          {elegida && <PackageCheck className="size-3.5" />}
                        </span>
                      }
                      debajoDerecha={
                        <Insignia tono={c.tono}>{c.motivo}</Insignia>
                      }
                      alTocar={() => alternar(c.id)}
                      flecha={false}
                    />
                  )
                })}
              </Lista>

              {elegidas.length > 0 && (
                <div className="px-4 pt-4">
                  <AvisoFijo tono="correcto" titulo="Compra evitada">
                    Mandando {plural(elegidas.length, 'herramienta')} que ya
                    tenemos, se dejan de gastar{' '}
                    <strong>{moneda(valorEvitado)}</strong>.
                  </AvisoFijo>
                </div>
              )}
            </>
          )}

          <div className="space-y-2 px-4 pt-5">
            <Boton
              ancho
              tamano="grande"
              disabled={elegidas.length === 0}
              iconoIzquierda={<PackageCheck aria-hidden className="size-5" />}
              onClick={() => setResolviendo(true)}
            >
              Resolver con stock propio
            </Boton>
            <div className="grid grid-cols-2 gap-2">
              <Boton
                variante="secundario"
                ancho
                tamano="chico"
                iconoIzquierda={<ShoppingCart aria-hidden className="size-4" />}
                onClick={() => setCerrando('DERIVADA_A_COMPRA')}
              >
                Derivar a compra
              </Boton>
              <Boton
                variante="secundario"
                ancho
                tamano="chico"
                iconoIzquierda={<X aria-hidden className="size-4" />}
                onClick={() => setCerrando('RECHAZADA')}
              >
                Rechazar
              </Boton>
            </div>
          </div>
        </>
      )}

      {/* Hoja: resolver con stock */}
      <HojaInferior
        abierta={resolviendo}
        alCerrar={() => setResolviendo(false)}
        titulo="Resolver con stock propio"
        descripcion={`${plural(elegidas.length, 'herramienta')} a ${solicitud.obra}`}
      >
        <form action={resolver} className="space-y-4">
          <AvisoFijo tono="correcto">
            Se generan los movimientos de entrega y la obra las recibe. Compra
            evitada: <strong>{moneda(valorEvitado)}</strong>.
          </AvisoFijo>
          <CampoSelect
            name="empleadoId"
            etiqueta="Quién las recibe en la obra"
            vacio="Sin responsable"
            opciones={empleados.map((e) => ({
              valor: e.id,
              texto: `${e.apellido}, ${e.nombre} · ${e.legajo}`,
            }))}
          />
          <CampoTextoLargo
            name="nota"
            etiqueta="Nota para la obra"
            rows={2}
            placeholder="Van las dos que estaban en el depósito de Pilar."
          />
          <Boton type="submit" ancho tamano="grande" cargando={pendiente}>
            Entregar y cerrar la solicitud
          </Boton>
        </form>
      </HojaInferior>

      {/* Hoja: derivar o rechazar */}
      <HojaInferior
        abierta={cerrando !== null}
        alCerrar={() => setCerrando(null)}
        titulo={
          cerrando === 'DERIVADA_A_COMPRA'
            ? 'Derivar a compra'
            : 'Rechazar la solicitud'
        }
      >
        <form action={cerrar} className="space-y-4">
          <CampoTextoLargo
            name="nota"
            etiqueta={
              cerrando === 'DERIVADA_A_COMPRA'
                ? '¿Por qué hay que comprarla?'
                : '¿Por qué se rechaza?'
            }
            required
            rows={3}
            placeholder={
              cerrando === 'DERIVADA_A_COMPRA'
                ? 'No hay ninguna libre: las dos que tenemos están en obra.'
                : 'Para esta tarea alcanza con lo que ya está en la obra.'
            }
            ayuda="La obra ve esta nota. Explicá la decisión."
          />
          <Boton
            type="submit"
            ancho
            tamano="grande"
            variante={cerrando === 'RECHAZADA' ? 'peligro' : 'primario'}
            cargando={pendiente}
          >
            {cerrando === 'DERIVADA_A_COMPRA' ? 'Derivar a compra' : 'Rechazar'}
          </Boton>
        </form>
      </HojaInferior>
    </div>
  )
}
