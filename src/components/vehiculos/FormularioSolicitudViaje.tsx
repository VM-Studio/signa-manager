'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Prioridad, TipoViaje } from '@prisma/client'
import { accionPedirViaje, type ResultadoViaje } from '@/server/vehiculos/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFechaHora,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  useAvisos,
} from '@/components/ui'

export function FormularioSolicitudViaje({
  obras,
}: {
  obras: Array<{ id: string; codigo: string; nombre: string }>
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [tipo, setTipo] = useState<TipoViaje>(TipoViaje.ENTREGA_MATERIALES)

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (previo, datos) => {
      const r = await accionPedirViaje(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Viaje pedido')
        router.push('/vehiculos/solicitudes')
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}
  const esTrasladoDePersonas = tipo === TipoViaje.TRASLADO_PERSONAL

  return (
    <form action={ejecutar} className="space-y-4 px-4 pt-4 pb-8">
      {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

      <CampoSelect
        name="obraId"
        etiqueta="Para qué obra"
        vacio="Elegí una obra…"
        required
        error={e.obraId}
        opciones={obras.map((o) => ({
          valor: o.id,
          texto: `${o.codigo} · ${o.nombre}`,
        }))}
      />

      <CampoSelect
        name="tipo"
        etiqueta="Qué tipo de viaje"
        value={tipo}
        onChange={(ev) => setTipo(ev.target.value as TipoViaje)}
        required
        error={e.tipo}
        opciones={[
          { valor: TipoViaje.ENTREGA_MATERIALES, texto: 'Llevar materiales a la obra' },
          { valor: TipoViaje.RETIRO_EN_PROVEEDOR, texto: 'Retirar en un proveedor' },
          { valor: TipoViaje.TRASLADO_HERRAMIENTAS, texto: 'Trasladar herramientas' },
          { valor: TipoViaje.TRASLADO_PERSONAL, texto: 'Trasladar personal' },
          { valor: TipoViaje.RETIRO_ESCOMBROS, texto: 'Retirar escombros' },
          { valor: TipoViaje.TRAMITE, texto: 'Trámite' },
          { valor: TipoViaje.OTRO, texto: 'Otro' },
        ]}
      />

      <CampoTexto
        name="origen"
        etiqueta="Desde dónde sale"
        placeholder="Hierromat · Munro"
        required
        error={e.origen}
      />

      <CampoTexto
        name="destino"
        etiqueta="A dónde va"
        placeholder="Obra Santa Rita · Benavídez"
        required
        error={e.destino}
      />

      <CampoTextoLargo
        name="descripcionCarga"
        etiqueta="Qué hay que llevar"
        rows={2}
        placeholder="Hierro del 10 y del 16 para las vigas del sector B."
      />

      {esTrasladoDePersonas ? (
        <CampoNumero
          name="cantidadPersonas"
          etiqueta="Cuántas personas"
          min={1}
          ayuda="El sistema propone vehículos con lugar suficiente."
        />
      ) : (
        <CampoNumero
          name="pesoEstimadoKg"
          etiqueta="Peso estimado"
          sufijo="kg"
          ayuda="Aunque sea aproximado: sirve para no mandar un camión de 15 toneladas a llevar 300 kg."
        />
      )}

      <CampoFechaHora
        name="fechaHoraNecesaria"
        etiqueta="Para cuándo lo necesitás"
        required
        error={e.fechaHoraNecesaria}
      />

      <CampoSelect
        name="prioridad"
        etiqueta="Prioridad"
        defaultValue={Prioridad.NORMAL}
        opciones={[
          { valor: Prioridad.BAJA, texto: 'Baja' },
          { valor: Prioridad.NORMAL, texto: 'Normal' },
          { valor: Prioridad.ALTA, texto: 'Alta' },
          { valor: Prioridad.URGENTE, texto: 'Urgente · frena la obra' },
        ]}
      />

      <div className="flex gap-2 pt-2">
        <Boton variante="secundario" ancho onClick={() => router.back()}>
          Cancelar
        </Boton>
        <Enviar />
      </div>
    </form>
  )
}

function Enviar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      Pedir a logística
    </Boton>
  )
}
