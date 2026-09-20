'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Truck, X } from 'lucide-react'
import {
  accionAsignarViaje,
  accionRechazarSolicitudViaje,
} from '@/server/vehiculos/acciones'
import type { Bloqueo } from '@/server/vehiculos/reglas'
import {
  AvisoFijo,
  Boton,
  CampoFechaHora,
  CampoTextoLargo,
  Dato,
  FilaLista,
  HojaInferior,
  Insignia,
  Lista,
  ListaDatos,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { TIPO_VEHICULO } from './estado'
import { fechaYHora, moneda, patente, peso, plural, textoEnum } from '@/lib/formato'

/* =====================================================================
   Asignación de un viaje.

   El sistema propone los vehículos que sirven, ordenados del más chico
   que alcanza al más grande: no tiene sentido mandar un camión de
   15.000 kg a llevar 300 kg.

   Los que no sirven también se muestran, con el motivo: así logística
   entiende por qué no está el camión que esperaba.
   ===================================================================== */

export interface PropuestaVista {
  id: string
  patente: string
  tipo: string
  marca: string
  modelo: string
  capacidadCargaKg: number | null
  cantidadPasajeros: number | null
  costoKmEstimado: number | null
  sirve: boolean
  sobraKg: number | null
  bloqueos: Bloqueo[]
}

export interface ChoferVista {
  id: string
  nombre: string
  apellido: string
  licenciaVence: Date | null
  bloqueos: Bloqueo[]
  sirve: boolean
}

export function AsignarViaje({
  solicitud,
  propuestas,
  choferes,
}: {
  solicitud: {
    id: string
    tipo: string
    origen: string
    destino: string
    descripcionCarga: string | null
    pesoEstimadoKg: number | null
    cantidadPersonas: number | null
    fechaHoraNecesaria: Date
    prioridad: string
    obra: string
    obraNombre: string
    solicitante: string
  }
  propuestas: PropuestaVista[]
  choferes: ChoferVista[]
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const [vehiculoId, setVehiculoId] = useState<string | null>(null)
  const [choferId, setChoferId] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [rechazando, setRechazando] = useState(false)

  const sirven = propuestas.filter((p) => p.sirve)
  const noSirven = propuestas.filter((p) => !p.sirve)
  const choferesQueSirven = choferes.filter((c) => c.sirve)
  const choferesBloqueados = choferes.filter((c) => !c.sirve)

  const elegido = propuestas.find((p) => p.id === vehiculoId)
  const choferElegido = choferes.find((c) => c.id === choferId)

  const asignar = (datos: FormData) => {
    if (!vehiculoId || !choferId) return
    datos.set('vehiculoId', vehiculoId)
    datos.set('choferId', choferId)

    empezar(async () => {
      const r = await accionAsignarViaje(solicitud.id, {}, datos)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Asignado')
        setConfirmando(false)
        router.push('/vehiculos/solicitudes')
      }
    })
  }

  const rechazar = (datos: FormData) => {
    empezar(async () => {
      const r = await accionRechazarSolicitudViaje(
        solicitud.id,
        String(datos.get('motivo') ?? ''),
      )
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Rechazada')
        router.push('/vehiculos/solicitudes')
      }
    })
  }

  return (
    <div className="pb-8">
      {/* Qué se pidió */}
      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <Insignia
          tono={
            solicitud.prioridad === 'URGENTE'
              ? 'critico'
              : solicitud.prioridad === 'ALTA'
                ? 'aviso'
                : 'neutro'
          }
        >
          {textoEnum(solicitud.prioridad)}
        </Insignia>
        <Insignia tono="neutro">{textoEnum(solicitud.tipo)}</Insignia>
      </div>

      <TituloSeccion>El pedido</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Obra">
            {solicitud.obra} · {solicitud.obraNombre}
          </Dato>
          <Dato etiqueta="Desde">{solicitud.origen}</Dato>
          <Dato etiqueta="Hasta">{solicitud.destino}</Dato>
          <Dato etiqueta="Para">{fechaYHora(solicitud.fechaHoraNecesaria)}</Dato>
          {solicitud.pesoEstimadoKg && (
            <Dato etiqueta="Peso">{peso(solicitud.pesoEstimadoKg)}</Dato>
          )}
          {solicitud.cantidadPersonas && (
            <Dato etiqueta="Personas">
              {plural(solicitud.cantidadPersonas, 'persona')}
            </Dato>
          )}
          <Dato etiqueta="Pidió">{solicitud.solicitante}</Dato>
        </ListaDatos>
        {solicitud.descripcionCarga && (
          <p className="pb-4 text-chico text-grafito">
            {solicitud.descripcionCarga}
          </p>
        )}
      </div>

      {/* Vehículos que sirven */}
      <TituloSeccion>
        {sirven.length === 0 ? 'Ningún vehículo sirve' : 'Vehículos que sirven'}
      </TituloSeccion>

      {sirven.length === 0 ? (
        <div className="px-4">
          <AvisoFijo tono="critico" titulo="No hay con qué mandarlo">
            Ninguno de los vehículos está libre, con la documentación al día y
            con capacidad suficiente para este pedido. Mirá los motivos más
            abajo.
          </AvisoFijo>
        </div>
      ) : (
        <>
          <p className="px-4 pb-2 text-menor text-grafito">
            Ordenados del más chico que alcanza al más grande, para no mandar
            un camión grande a llevar poco.
          </p>
          <Lista>
            {sirven.map((p) => (
              <FilaLista
                key={p.id}
                titulo={patente(p.patente)}
                subtitulo={`${TIPO_VEHICULO[p.tipo as keyof typeof TIPO_VEHICULO] ?? p.tipo} · ${p.marca} ${p.modelo}`}
                detalle={
                  [
                    p.capacidadCargaKg ? `Lleva ${peso(p.capacidadCargaKg)}` : null,
                    p.sobraKg !== null ? `sobran ${peso(p.sobraKg)}` : null,
                    p.costoKmEstimado ? `${moneda(p.costoKmEstimado)}/km` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined
                }
                izquierda={
                  <span
                    aria-hidden
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      vehiculoId === p.id
                        ? 'border-negro bg-negro text-blanco'
                        : 'border-acero'
                    }`}
                  >
                    {vehiculoId === p.id && <Check className="size-3.5" />}
                  </span>
                }
                tono={vehiculoId === p.id ? 'correcto' : 'neutro'}
                alTocar={() => setVehiculoId(p.id)}
                flecha={false}
              />
            ))}
          </Lista>
        </>
      )}

      {/* Los que no sirven, con el motivo */}
      {noSirven.length > 0 && (
        <>
          <TituloSeccion>Los que no se pueden usar</TituloSeccion>
          <Lista>
            {noSirven.map((p) => (
              <FilaLista
                key={p.id}
                titulo={patente(p.patente)}
                subtitulo={`${p.marca} ${p.modelo}`}
                detalle={p.bloqueos.map((b) => b.mensaje).join(' ')}
                izquierda={
                  <AlertTriangle
                    aria-hidden
                    className="size-4 shrink-0 text-metadato"
                  />
                }
                flecha={false}
              />
            ))}
          </Lista>
        </>
      )}

      {/* Choferes */}
      <TituloSeccion>Chofer</TituloSeccion>
      {choferesQueSirven.length === 0 ? (
        <div className="px-4">
          <AvisoFijo tono="critico">
            Ningún chofer está libre y con la licencia al día en ese horario.
          </AvisoFijo>
        </div>
      ) : (
        <Lista>
          {choferesQueSirven.map((c) => (
            <FilaLista
              key={c.id}
              titulo={`${c.apellido}, ${c.nombre}`}
              izquierda={
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    choferId === c.id
                      ? 'border-negro bg-negro text-blanco'
                      : 'border-acero'
                  }`}
                >
                  {choferId === c.id && <Check className="size-3.5" />}
                </span>
              }
              tono={choferId === c.id ? 'correcto' : 'neutro'}
              alTocar={() => setChoferId(c.id)}
              flecha={false}
            />
          ))}
        </Lista>
      )}

      {choferesBloqueados.length > 0 && (
        <>
          <TituloSeccion>Choferes que no pueden</TituloSeccion>
          <Lista>
            {choferesBloqueados.map((c) => (
              <FilaLista
                key={c.id}
                titulo={`${c.apellido}, ${c.nombre}`}
                detalle={c.bloqueos.map((b) => b.mensaje).join(' ')}
                izquierda={
                  <AlertTriangle aria-hidden className="size-4 shrink-0 text-metadato" />
                }
                flecha={false}
              />
            ))}
          </Lista>
        </>
      )}

      {/* Confirmar */}
      <div className="space-y-2 px-4 pt-6">
        <Boton
          ancho
          tamano="grande"
          disabled={!vehiculoId || !choferId}
          iconoIzquierda={<Truck aria-hidden className="size-5" />}
          onClick={() => setConfirmando(true)}
        >
          Asignar el viaje
        </Boton>
        <Boton
          variante="secundario"
          ancho
          iconoIzquierda={<X aria-hidden className="size-4" />}
          onClick={() => setRechazando(true)}
        >
          Rechazar la solicitud
        </Boton>
      </div>

      <HojaInferior
        abierta={confirmando}
        alCerrar={() => setConfirmando(false)}
        titulo="Confirmar el viaje"
        descripcion={
          elegido && choferElegido
            ? `${patente(elegido.patente)} · ${choferElegido.nombre} ${choferElegido.apellido}`
            : undefined
        }
      >
        <form action={asignar} className="space-y-4">
          <ListaDatos className="px-0">
            <Dato etiqueta="Destino">{solicitud.destino}</Dato>
            <Dato etiqueta="Obra">{solicitud.obra}</Dato>
            {solicitud.pesoEstimadoKg && (
              <Dato etiqueta="Carga">{peso(solicitud.pesoEstimadoKg)}</Dato>
            )}
          </ListaDatos>

          <CampoFechaHora
            name="salidaPrevista"
            etiqueta="Hora de salida"
            defaultValue={aValorFechaHora(solicitud.fechaHoraNecesaria)}
            required
            ayuda="Por defecto, la hora que pidió la obra."
          />

          <Boton type="submit" ancho tamano="grande" cargando={pendiente}>
            Confirmar
          </Boton>
        </form>
      </HojaInferior>

      <HojaInferior
        abierta={rechazando}
        alCerrar={() => setRechazando(false)}
        titulo="Rechazar la solicitud"
      >
        <form action={rechazar} className="space-y-4">
          <CampoTextoLargo
            name="motivo"
            etiqueta="¿Por qué?"
            required
            rows={3}
            placeholder="El proveedor entrega con flete propio sin costo."
            ayuda="La obra ve esta nota."
          />
          <Boton type="submit" variante="peligro" ancho cargando={pendiente}>
            Rechazar
          </Boton>
        </form>
      </HojaInferior>
    </div>
  )
}

function aValorFechaHora(f: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}T${p(f.getHours())}:${p(f.getMinutes())}`
}
