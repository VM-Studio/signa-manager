'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { EstadoViaje } from '@prisma/client'
import {
  accionCancelarViaje,
  type ResultadoViaje,
} from '@/server/vehiculos/acciones'
import {
  AvisoFijo,
  Boton,
  CampoTextoLargo,
  HojaInferior,
  useAvisos,
} from '@/components/ui'

/* =====================================================================
   Cancelar un viaje.

   Si venía de una solicitud, esta vuelve a quedar pendiente: el pedido
   de la obra sigue existiendo aunque el viaje se caiga.
   ===================================================================== */

export function CancelarViaje({
  viajeId,
  estado,
  vieneDeSolicitud,
}: {
  viajeId: string
  estado: EstadoViaje
  vieneDeSolicitud: boolean
}) {
  const [abierta, setAbierta] = useState(false)
  const avisos = useAvisos()
  const router = useRouter()

  const [resultado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (_previo, datos) => {
      const r = await accionCancelarViaje(
        viajeId,
        String(datos.get('motivo') ?? ''),
      )
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Viaje cancelado')
        setAbierta(false)
        router.refresh()
      }
      return r
    },
    {},
  )

  // Un viaje terminado o ya cancelado no se toca.
  if (
    estado === EstadoViaje.FINALIZADO ||
    estado === EstadoViaje.CANCELADO
  ) {
    return null
  }

  return (
    <>
      <div className="border-b border-niebla bg-blanco px-4 py-3">
        <Boton
          tamano="chico"
          variante="secundario"
          onClick={() => setAbierta(true)}
        >
          Cancelar viaje
        </Boton>
      </div>

      <HojaInferior
        abierta={abierta}
        alCerrar={() => setAbierta(false)}
        titulo="Cancelar el viaje"
      >
        <form action={ejecutar} className="space-y-4">
          {resultado.error && (
            <AvisoFijo tono="critico">{resultado.error}</AvisoFijo>
          )}

          <p className="text-base text-grafito">
            {estado === EstadoViaje.EN_CURSO
              ? 'El viaje ya arrancó. Al cancelarlo el vehículo vuelve a quedar disponible.'
              : 'El viaje sale de la agenda y el vehículo queda libre.'}
            {vieneDeSolicitud
              ? ' La solicitud de la obra vuelve a quedar pendiente para asignarla a otro.'
              : ''}
          </p>

          <CampoTextoLargo
            name="motivo"
            etiqueta="Por qué se cancela"
            rows={3}
            placeholder="Se suspendió la descarga en obra"
            ayuda="Queda escrito en el viaje. Sirve cuando después preguntan por qué no llegó."
          />

          <div className="flex gap-2 pt-1">
            <Boton
              variante="secundario"
              ancho
              type="button"
              onClick={() => setAbierta(false)}
            >
              No cancelar
            </Boton>
            <Confirmar />
          </div>
        </form>
      </HojaInferior>
    </>
  )
}

function Confirmar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho variante="peligro" cargando={pending}>
      Cancelar viaje
    </Boton>
  )
}
