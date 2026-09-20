'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'
import {
  EstadoVehiculo,
  TipoDocumentoVehiculo,
  TipoIncidenteVehiculo,
  TipoMantenimiento,
} from '@prisma/client'
import {
  accionCambiarEstadoVehiculo,
  accionCargarCombustible,
  accionGuardarDocumentoVehiculo,
  accionRegistrarIncidente,
  accionRegistrarService,
  type ResultadoViaje,
} from '@/server/vehiculos/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  HojaInferior,
  useAvisos,
} from '@/components/ui'
import { kilometros, textoEnum } from '@/lib/formato'

/* =====================================================================
   Los formularios cortos de la ficha del vehículo.

   Prompt 7: combustible, service, documentos e incidentes se cargan
   desde la misma ficha, sin cambiar de pantalla. Logística carga tres
   vencimientos seguidos y el chofer carga la nafta desde la ruta.
   ===================================================================== */

export type HojaVehiculo =
  | 'combustible'
  | 'service'
  | 'documento'
  | 'incidente'
  | 'estado'

const hoyTexto = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function HojasVehiculo({
  hoja,
  alCerrar,
  vehiculo,
  obras,
  choferes,
}: {
  hoja: HojaVehiculo | null
  alCerrar: () => void
  vehiculo: {
    id: string
    patente: string
    kmActual: number
    estado: EstadoVehiculo
  }
  obras: Array<{ id: string; codigo: string; nombre: string }>
  choferes: Array<{ id: string; nombre: string; apellido: string }>
}) {
  return (
    <>
      <HojaCombustible
        abierta={hoja === 'combustible'}
        alCerrar={alCerrar}
        vehiculo={vehiculo}
        obras={obras}
      />
      <HojaService
        abierta={hoja === 'service'}
        alCerrar={alCerrar}
        vehiculo={vehiculo}
      />
      <HojaDocumento
        abierta={hoja === 'documento'}
        alCerrar={alCerrar}
        vehiculoId={vehiculo.id}
      />
      <HojaIncidente
        abierta={hoja === 'incidente'}
        alCerrar={alCerrar}
        vehiculoId={vehiculo.id}
        choferes={choferes}
      />
      <HojaEstado
        abierta={hoja === 'estado'}
        alCerrar={alCerrar}
        vehiculo={vehiculo}
      />
    </>
  )
}

/* --------------------------- envoltorio ----------------------------- */

function HojaFormulario({
  abierta,
  alCerrar,
  titulo,
  descripcion,
  textoGuardar = 'Guardar',
  accion,
  children,
}: {
  abierta: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  textoGuardar?: string
  accion: (previo: ResultadoViaje, datos: FormData) => Promise<ResultadoViaje>
  children: (errores: Record<string, string>) => ReactNode
}) {
  const avisos = useAvisos()
  const router = useRouter()

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (previo, datos) => {
      const r = await accion(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  if (!abierta) return null

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo={titulo}
      descripcion={descripcion}
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}
        {children(estado.errores ?? {})}
        <div className="flex gap-2 pt-1">
          <Boton variante="secundario" ancho type="button" onClick={alCerrar}>
            Cancelar
          </Boton>
          <BotonGuardar texto={textoGuardar} />
        </div>
      </form>
    </HojaInferior>
  )
}

function BotonGuardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      {texto}
    </Boton>
  )
}

/* --------------------------- COMBUSTIBLE ---------------------------- */

function HojaCombustible({
  abierta,
  alCerrar,
  vehiculo,
  obras,
}: {
  abierta: boolean
  alCerrar: () => void
  vehiculo: { id: string; kmActual: number }
  obras: Array<{ id: string; codigo: string; nombre: string }>
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Cargar combustible"
      textoGuardar="Registrar carga"
      accion={(previo, datos) => {
        datos.set('vehiculoId', vehiculo.id)
        return accionCargarCombustible(previo, datos)
      }}
    >
      {(e) => (
        <>
          <CampoNumero
            name="litros"
            etiqueta="Litros"
            sufijo="L"
            step="0.01"
            required
            error={e.litros}
            autoFocus
          />
          <CampoNumero
            name="monto"
            etiqueta="Cuánto pagaste"
            prefijo="$"
            required
            error={e.monto}
          />
          <CampoNumero
            name="km"
            etiqueta="Kilómetros del tablero"
            sufijo="km"
            defaultValue={vehiculo.kmActual}
            ayuda={`Último registrado: ${kilometros(vehiculo.kmActual)}. Sin esto no se puede calcular el consumo.`}
          />
          <CampoTexto
            name="estacion"
            etiqueta="Estación"
            placeholder="YPF Panamericana km 34"
          />
          <CampoSelect
            name="obraId"
            etiqueta="Obra"
            vacio="Sin obra"
            opciones={obras.map((o) => ({
              valor: o.id,
              texto: `${o.codigo} · ${o.nombre}`,
            }))}
            ayuda="Si es para una obra puntual, se le carga a esa obra."
          />
        </>
      )}
    </HojaFormulario>
  )
}

/* ----------------------------- SERVICE ------------------------------ */

function HojaService({
  abierta,
  alCerrar,
  vehiculo,
}: {
  abierta: boolean
  alCerrar: () => void
  vehiculo: { id: string; kmActual: number }
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Registrar mantenimiento"
      descripcion="Al guardarlo se recalcula cuándo toca el próximo."
      textoGuardar="Registrar"
      accion={(previo, datos) => {
        datos.set('vehiculoId', vehiculo.id)
        return accionRegistrarService(previo, datos)
      }}
    >
      {(e) => (
        <>
          <CampoSelect
            name="tipo"
            etiqueta="Tipo"
            defaultValue={TipoMantenimiento.PREVENTIVO}
            opciones={[
              {
                valor: TipoMantenimiento.PREVENTIVO,
                texto: 'Preventivo (service programado)',
              },
              {
                valor: TipoMantenimiento.CORRECTIVO,
                texto: 'Correctivo (se rompió)',
              },
            ]}
            ayuda="Solo el preventivo agenda el próximo."
          />
          <CampoTextoLargo
            name="descripcion"
            etiqueta="Qué se le hizo"
            rows={2}
            required
            error={e.descripcion}
            placeholder="Cambio de aceite y filtros"
            autoFocus
          />
          <CampoNumero
            name="km"
            etiqueta="Kilómetros"
            sufijo="km"
            defaultValue={vehiculo.kmActual}
          />
          <CampoTexto name="taller" etiqueta="Taller" />
          <CampoNumero name="costo" etiqueta="Costo" prefijo="$" />
          <CampoFecha name="fecha" etiqueta="Fecha" defaultValue={hoyTexto()} />

          <div className="grid grid-cols-2 gap-3">
            <CampoNumero
              name="cadaKm"
              etiqueta="Próximo cada"
              sufijo="km"
              defaultValue={10000}
            />
            <CampoNumero
              name="cadaDias"
              etiqueta="O cada"
              sufijo="días"
              defaultValue={180}
            />
          </div>
        </>
      )}
    </HojaFormulario>
  )
}

/* ---------------------------- DOCUMENTO ----------------------------- */

function HojaDocumento({
  abierta,
  alCerrar,
  vehiculoId,
}: {
  abierta: boolean
  alCerrar: () => void
  vehiculoId: string
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Cargar documento"
      descripcion="Con el seguro o la VTV vencidos el sistema no deja asignar viajes."
      accion={(previo, datos) => {
        datos.set('vehiculoId', vehiculoId)
        return accionGuardarDocumentoVehiculo(previo, datos)
      }}
    >
      {(e) => (
        <>
          <CampoSelect
            name="tipo"
            etiqueta="Qué documento es"
            defaultValue={TipoDocumentoVehiculo.SEGURO}
            opciones={Object.values(TipoDocumentoVehiculo).map((t) => ({
              valor: t,
              texto: textoEnum(t),
            }))}
          />
          <CampoFecha
            name="vencimiento"
            etiqueta="Vence el"
            required
            error={e.vencimiento}
          />
          <CampoTexto
            name="descripcion"
            etiqueta="Detalle"
            placeholder="Nº de póliza, compañía…"
          />
          <CampoNumero
            name="costo"
            etiqueta="Costo"
            prefijo="$"
            ayuda="Lo que salió renovarlo. Entra en el costo de la flota."
          />
        </>
      )}
    </HojaFormulario>
  )
}

/* ---------------------------- INCIDENTE ----------------------------- */

function HojaIncidente({
  abierta,
  alCerrar,
  vehiculoId,
  choferes,
}: {
  abierta: boolean
  alCerrar: () => void
  vehiculoId: string
  choferes: Array<{ id: string; nombre: string; apellido: string }>
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Registrar incidente"
      descripcion="Multas, siniestros, roturas y robos."
      textoGuardar="Registrar"
      accion={(previo, datos) => {
        datos.set('vehiculoId', vehiculoId)
        return accionRegistrarIncidente(previo, datos)
      }}
    >
      {(e) => (
        <>
          <CampoSelect
            name="tipo"
            etiqueta="Qué pasó"
            defaultValue={TipoIncidenteVehiculo.ROTURA}
            opciones={Object.values(TipoIncidenteVehiculo).map((t) => ({
              valor: t,
              texto: textoEnum(t),
            }))}
          />
          <CampoTextoLargo
            name="descripcion"
            etiqueta="Contá qué pasó"
            rows={3}
            required
            error={e.descripcion}
            autoFocus
          />
          <CampoFecha name="fecha" etiqueta="Cuándo" defaultValue={hoyTexto()} />
          <CampoSelect
            name="choferId"
            etiqueta="Quién manejaba"
            vacio="No se sabe o no aplica"
            opciones={choferes.map((c) => ({
              valor: c.id,
              texto: `${c.apellido}, ${c.nombre}`,
            }))}
          />
          <CampoNumero
            name="monto"
            etiqueta="Costo"
            prefijo="$"
            ayuda="Lo de la multa o lo que salió arreglarlo, si ya se sabe."
          />
        </>
      )}
    </HojaFormulario>
  )
}

/* ------------------------------ ESTADO ------------------------------ */

const ESTADOS_MANUALES: Array<{ valor: EstadoVehiculo; texto: string }> = [
  { valor: EstadoVehiculo.DISPONIBLE, texto: 'Disponible' },
  { valor: EstadoVehiculo.EN_TALLER, texto: 'En el taller' },
  { valor: EstadoVehiculo.FUERA_DE_SERVICIO, texto: 'Fuera de servicio' },
  { valor: EstadoVehiculo.VENDIDO, texto: 'Vendido o dado de baja' },
]

function HojaEstado({
  abierta,
  alCerrar,
  vehiculo,
}: {
  abierta: boolean
  alCerrar: () => void
  vehiculo: { id: string; estado: EstadoVehiculo }
}) {
  const avisos = useAvisos()
  const router = useRouter()

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (_previo, datos) => {
      const nuevo = String(datos.get('estado') ?? '') as EstadoVehiculo
      const r = await accionCambiarEstadoVehiculo(vehiculo.id, nuevo)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  if (!abierta) return null

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo="Cambiar estado"
      descripcion="Mientras no esté disponible, el sistema no lo ofrece para viajes."
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}
        <CampoSelect
          name="estado"
          etiqueta="Estado"
          defaultValue={
            vehiculo.estado === EstadoVehiculo.EN_VIAJE
              ? EstadoVehiculo.DISPONIBLE
              : vehiculo.estado
          }
          opciones={ESTADOS_MANUALES}
        />
        <div className="flex gap-2 pt-1">
          <Boton variante="secundario" ancho type="button" onClick={alCerrar}>
            Cancelar
          </Boton>
          <BotonGuardar texto="Cambiar estado" />
        </div>
      </form>
    </HojaInferior>
  )
}
