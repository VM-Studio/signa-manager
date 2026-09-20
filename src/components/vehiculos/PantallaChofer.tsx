'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Fuel, Play, Square, Truck } from 'lucide-react'
import { EstadoViaje } from '@prisma/client'
import {
  accionCargarCombustible,
  accionFinalizarViaje,
  accionIniciarViaje,
  type ResultadoViaje,
} from '@/server/vehiculos/acciones'
import {
  AvisoFijo,
  Boton,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  Dato,
  EstadoVacio,
  HojaInferior,
  ListaDatos,
  Tarjeta,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { InsigniaEstadoViaje } from './estado'
import {
  fechaRelativaCorta,
  hora,
  kilometros,
  moneda,
  patente,
  peso,
} from '@/lib/formato'

/* =====================================================================
   La pantalla del chofer.

   La usa parado al lado del camión, muchas veces con el motor en marcha.
   Dos botones grandes: iniciar y finalizar. Nada más.
   ===================================================================== */

export interface ViajeDelChofer {
  id: string
  tipo: string
  estado: EstadoViaje
  origen: string
  destino: string
  descripcionCarga: string | null
  pesoCargaKg: number | null
  salidaPrevista: Date
  salidaReal: Date | null
  llegadaReal: Date | null
  kmSalida: number | null
  kmLlegada: number | null
  costoCalculado: number | null
  esDeHoy: boolean
  vehiculo: {
    id: string
    patente: string
    marca: string
    modelo: string
    kmActual: number
  }
  obra: { id: string; codigo: string; nombre: string } | null
}

export function PantallaChofer({
  viajes,
  obras,
}: {
  viajes: ViajeDelChofer[]
  obras: Array<{ id: string; codigo: string; nombre: string }>
}) {
  const [iniciando, setIniciando] = useState<ViajeDelChofer | null>(null)
  const [finalizando, setFinalizando] = useState<ViajeDelChofer | null>(null)
  const [cargando, setCargando] = useState<ViajeDelChofer | null>(null)

  const enCurso = viajes.filter((v) => v.estado === EstadoViaje.EN_CURSO)
  const hoy = viajes.filter(
    (v) => v.esDeHoy && v.estado === EstadoViaje.PROGRAMADO,
  )
  const proximos = viajes.filter(
    (v) => !v.esDeHoy && v.estado === EstadoViaje.PROGRAMADO,
  )
  const terminados = viajes.filter((v) => v.estado === EstadoViaje.FINALIZADO)

  if (viajes.length === 0) {
    return (
      <EstadoVacio
        titulo="No tenés viajes"
        mensaje="Cuando logística te asigne uno, te va a aparecer acá."
        icono={<Truck className="size-8" strokeWidth={1.5} />}
      />
    )
  }

  const tarjeta = (v: ViajeDelChofer, principal: boolean) => (
    <Tarjeta key={v.id} className="mx-4 mb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-titulo font-medium text-negro">{v.destino}</p>
          <p className="mt-0.5 text-menor text-grafito">Desde {v.origen}</p>
        </div>
        <InsigniaEstadoViaje estado={v.estado} />
      </div>

      <ListaDatos className="mt-2 px-0">
        <Dato etiqueta="Vehículo">
          {patente(v.vehiculo.patente)} · {v.vehiculo.marca} {v.vehiculo.modelo}
        </Dato>
        <Dato etiqueta="Sale">
          {fechaRelativaCorta(v.salidaPrevista)} {hora(v.salidaPrevista)}
        </Dato>
        {v.obra && <Dato etiqueta="Obra">{v.obra.codigo}</Dato>}
        {v.pesoCargaKg && <Dato etiqueta="Carga">{peso(v.pesoCargaKg)}</Dato>}
        {v.estado === EstadoViaje.EN_CURSO && v.kmSalida && (
          <Dato etiqueta="Salió con">{kilometros(v.kmSalida)}</Dato>
        )}
        {v.estado === EstadoViaje.FINALIZADO && (
          <>
            <Dato etiqueta="Recorrió">
              {kilometros((v.kmLlegada ?? 0) - (v.kmSalida ?? 0))}
            </Dato>
            {v.costoCalculado !== null && (
              <Dato etiqueta="Costo">{moneda(v.costoCalculado)}</Dato>
            )}
          </>
        )}
      </ListaDatos>

      {v.descripcionCarga && (
        <p className="mt-2 text-chico text-grafito">{v.descripcionCarga}</p>
      )}

      {principal && v.estado === EstadoViaje.PROGRAMADO && (
        <Boton
          ancho
          tamano="grande"
          className="mt-3"
          iconoIzquierda={<Play aria-hidden className="size-5" />}
          onClick={() => setIniciando(v)}
        >
          Iniciar viaje
        </Boton>
      )}

      {v.estado === EstadoViaje.EN_CURSO && (
        <div className="mt-3 space-y-2">
          <Boton
            ancho
            tamano="grande"
            iconoIzquierda={<Square aria-hidden className="size-5" />}
            onClick={() => setFinalizando(v)}
          >
            Finalizar viaje
          </Boton>
          <Boton
            variante="secundario"
            ancho
            iconoIzquierda={<Fuel aria-hidden className="size-4" />}
            onClick={() => setCargando(v)}
          >
            Cargar combustible
          </Boton>
        </div>
      )}
    </Tarjeta>
  )

  return (
    <div className="pb-8">
      {enCurso.length > 0 && (
        <>
          <TituloSeccion>Viaje en curso</TituloSeccion>
          {enCurso.map((v) => tarjeta(v, true))}
        </>
      )}

      {hoy.length > 0 && (
        <>
          <TituloSeccion>Hoy</TituloSeccion>
          {hoy.map((v) => tarjeta(v, enCurso.length === 0))}
        </>
      )}

      {proximos.length > 0 && (
        <>
          <TituloSeccion>Próximos</TituloSeccion>
          {proximos.map((v) => tarjeta(v, false))}
        </>
      )}

      {terminados.length > 0 && (
        <>
          <TituloSeccion>Terminados hoy</TituloSeccion>
          {terminados.map((v) => tarjeta(v, false))}
        </>
      )}

      {/* Sin viaje en curso, igual se puede cargar combustible. */}
      {enCurso.length === 0 && viajes.length > 0 && (
        <div className="px-4 pt-4">
          <Boton
            variante="secundario"
            ancho
            iconoIzquierda={<Fuel aria-hidden className="size-4" />}
            onClick={() => setCargando(viajes[0])}
          >
            Cargar combustible
          </Boton>
        </div>
      )}

      {iniciando && (
        <HojaIniciar viaje={iniciando} alCerrar={() => setIniciando(null)} />
      )}
      {finalizando && (
        <HojaFinalizar viaje={finalizando} alCerrar={() => setFinalizando(null)} />
      )}
      {cargando && (
        <HojaCombustible
          viaje={cargando}
          obras={obras}
          alCerrar={() => setCargando(null)}
        />
      )}
    </div>
  )
}

/* ------------------------------ INICIAR ----------------------------- */

function HojaIniciar({
  viaje,
  alCerrar,
}: {
  viaje: ViajeDelChofer
  alCerrar: () => void
}) {
  const router = useRouter()
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (previo, datos) => {
      const r = await accionIniciarViaje(viaje.id, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Viaje iniciado')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo="Iniciar viaje"
      descripcion={`${patente(viaje.vehiculo.patente)} · a ${viaje.destino}`}
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

        <CampoNumero
          name="kmSalida"
          etiqueta="¿Cuántos kilómetros marca el tablero?"
          defaultValue={viaje.vehiculo.kmActual}
          sufijo="km"
          required
          error={estado.errores?.kmSalida}
          ayuda={`La última vez marcaba ${kilometros(viaje.vehiculo.kmActual)}.`}
        />

        <Confirmar texto="Salir" />
      </form>
    </HojaInferior>
  )
}

/* ----------------------------- FINALIZAR ---------------------------- */

function HojaFinalizar({
  viaje,
  alCerrar,
}: {
  viaje: ViajeDelChofer
  alCerrar: () => void
}) {
  const router = useRouter()
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (previo, datos) => {
      const r = await accionFinalizarViaje(viaje.id, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Viaje finalizado')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo="Finalizar viaje"
      descripcion={`${patente(viaje.vehiculo.patente)} · ${viaje.destino}`}
      alto="alto"
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

        <CampoNumero
          name="kmLlegada"
          etiqueta="¿Cuántos kilómetros marca ahora?"
          defaultValue={viaje.kmSalida ?? undefined}
          sufijo="km"
          required
          error={estado.errores?.kmLlegada}
          ayuda={
            viaje.kmSalida
              ? `Saliste con ${kilometros(viaje.kmSalida)}.`
              : undefined
          }
        />

        <CampoNumero
          name="peajes"
          etiqueta="Peajes"
          prefijo="$"
          defaultValue={0}
          ayuda="Lo que pagaste de peaje en este viaje."
        />

        <CampoTextoLargo
          name="observaciones"
          etiqueta="Observaciones"
          rows={2}
          placeholder="Demora en la descarga, tránsito cortado…"
        />

        <Confirmar texto="Cerrar el viaje" />
      </form>
    </HojaInferior>
  )
}

/* ---------------------------- COMBUSTIBLE --------------------------- */

function HojaCombustible({
  viaje,
  obras,
  alCerrar,
}: {
  viaje: ViajeDelChofer
  obras: Array<{ id: string; codigo: string; nombre: string }>
  alCerrar: () => void
}) {
  const router = useRouter()
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (previo, datos) => {
      datos.set('vehiculoId', viaje.vehiculo.id)
      const r = await accionCargarCombustible(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Carga registrada')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo="Cargar combustible"
      descripcion={patente(viaje.vehiculo.patente)}
      alto="alto"
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

        <CampoNumero
          name="litros"
          etiqueta="Litros"
          sufijo="L"
          step={0.01}
          required
          error={estado.errores?.litros}
        />
        <CampoNumero
          name="monto"
          etiqueta="Cuánto pagaste"
          prefijo="$"
          required
          error={estado.errores?.monto}
        />
        <CampoNumero
          name="km"
          etiqueta="Kilómetros del tablero"
          sufijo="km"
          defaultValue={viaje.vehiculo.kmActual}
          ayuda="Sirve para calcular el consumo del vehículo."
        />
        <CampoTexto name="estacion" etiqueta="Estación" placeholder="YPF Panamericana" />
        <CampoSelect
          name="obraId"
          etiqueta="¿Para qué obra?"
          defaultValue={viaje.obra?.id ?? ''}
          vacio="Sin obra"
          opciones={obras.map((o) => ({
            valor: o.id,
            texto: `${o.codigo} · ${o.nombre}`,
          }))}
        />

        <Confirmar texto="Registrar la carga" />
      </form>
    </HojaInferior>
  )
}

function Confirmar({ texto }: { texto: string }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho tamano="grande" cargando={pending}>
      {texto}
    </Boton>
  )
}
