'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Combustible, TipoVehiculo } from '@prisma/client'
import {
  accionGuardarVehiculo,
  type ResultadoViaje,
} from '@/server/vehiculos/acciones'
import {
  AvisoFijo,
  Boton,
  CampoCheck,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { TIPO_VEHICULO } from './estado'
import { textoEnum } from '@/lib/formato'

export interface ValoresVehiculo {
  id?: string
  patente: string
  interno: string | null
  tipo: TipoVehiculo
  marca: string
  modelo: string
  anio: number | null
  combustible: Combustible
  capacidadCargaKg: number | null
  volumenM3: number | null
  cantidadPasajeros: number | null
  kmActual: number
  horasActual: number | null
  costoKmEstimado: number | null
  tieneGps: boolean
  choferHabitualId: string | null
  notas: string | null
}

/** Los que llevan carga: para estos la capacidad es lo que importa. */
const LLEVAN_CARGA: TipoVehiculo[] = [
  TipoVehiculo.CAMION,
  TipoVehiculo.CAMIONETA,
  TipoVehiculo.UTILITARIO,
  TipoVehiculo.ACOPLADO,
]

export function FormularioVehiculo({
  valores,
  choferes,
}: {
  valores?: ValoresVehiculo
  choferes: Array<{ id: string; nombre: string; apellido: string }>
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const esEdicion = Boolean(valores?.id)
  const [tipo, setTipo] = useState<TipoVehiculo>(
    valores?.tipo ?? TipoVehiculo.CAMIONETA,
  )

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarVehiculo(valores?.id ?? null, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        router.push(r.id ? `/vehiculos/${r.id}` : '/vehiculos')
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}
  const llevaCarga = LLEVAN_CARGA.includes(tipo)
  const esMaquina = tipo === TipoVehiculo.MAQUINA_VIAL

  return (
    <form action={ejecutar} className="pb-8 lg:max-w-[900px]">
      {estado.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico">{estado.error}</AvisoFijo>
        </div>
      )}

      <TituloSeccion>Qué es</TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoTexto
          name="patente"
          etiqueta="Patente"
          defaultValue={valores?.patente}
          required
          error={e.patente}
          autoCapitalize="characters"
          ayuda="ABC123 o AB123CD. Sin guiones ni espacios."
        />
        <CampoSelect
          name="tipo"
          etiqueta="Tipo"
          value={tipo}
          onChange={(ev) => setTipo(ev.target.value as TipoVehiculo)}
          error={e.tipo}
          opciones={Object.values(TipoVehiculo).map((t) => ({
            valor: t,
            texto: TIPO_VEHICULO[t],
          }))}
        />
        <CampoTexto
          name="marca"
          etiqueta="Marca"
          defaultValue={valores?.marca}
          required
          error={e.marca}
          placeholder="Iveco"
        />
        <CampoTexto
          name="modelo"
          etiqueta="Modelo"
          defaultValue={valores?.modelo}
          required
          error={e.modelo}
          placeholder="Tector 170E22"
        />
        <CampoNumero
          name="anio"
          etiqueta="Año"
          defaultValue={valores?.anio ?? ''}
          min={1970}
          max={new Date().getFullYear() + 1}
        />
        <CampoTexto
          name="interno"
          etiqueta="Número interno"
          defaultValue={valores?.interno ?? ''}
          placeholder="I-04"
          ayuda="Como lo llaman en la empresa."
        />
        <CampoSelect
          name="combustible"
          etiqueta="Combustible"
          defaultValue={valores?.combustible ?? Combustible.DIESEL}
          opciones={Object.values(Combustible).map((c) => ({
            valor: c,
            texto: textoEnum(c),
          }))}
        />
      </div>

      <TituloSeccion>Qué puede llevar</TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoNumero
          name="capacidadCargaKg"
          etiqueta="Capacidad de carga"
          sufijo="kg"
          defaultValue={valores?.capacidadCargaKg ?? ''}
          ayuda={
            llevaCarga
              ? 'El sistema no deja asignarle un viaje con más peso que este.'
              : 'Dejalo vacío si no lleva carga.'
          }
        />
        <CampoNumero
          name="volumenM3"
          etiqueta="Volumen de caja"
          sufijo="m³"
          step="0.01"
          defaultValue={valores?.volumenM3 ?? ''}
        />
        <CampoNumero
          name="cantidadPasajeros"
          etiqueta="Pasajeros"
          defaultValue={valores?.cantidadPasajeros ?? ''}
          ayuda="Cuántos entran, contando al chofer."
        />
      </div>

      <TituloSeccion>Uso y costo</TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoNumero
          name="kmActual"
          etiqueta="Kilómetros"
          sufijo="km"
          defaultValue={valores?.kmActual ?? 0}
          error={e.kmActual}
          ayuda={
            esEdicion
              ? 'Después lo actualizan solos los viajes y las cargas de combustible. No puede bajar.'
              : 'Los que marca el tablero hoy.'
          }
        />
        {esMaquina && (
          <CampoNumero
            name="horasActual"
            etiqueta="Horómetro"
            sufijo="h"
            defaultValue={valores?.horasActual ?? ''}
            ayuda="Las máquinas se miden por horas, no por kilómetros."
          />
        )}
        <CampoNumero
          name="costoKmEstimado"
          etiqueta="Costo por kilómetro"
          prefijo="$"
          step="0.01"
          defaultValue={valores?.costoKmEstimado ?? ''}
          ayuda="Con esto se calcula lo que cada viaje le cuesta a la obra."
        />
        <CampoSelect
          name="choferHabitualId"
          etiqueta="Chofer habitual"
          defaultValue={valores?.choferHabitualId ?? ''}
          vacio="Sin chofer fijo"
          opciones={choferes.map((c) => ({
            valor: c.id,
            texto: `${c.apellido}, ${c.nombre}`,
          }))}
          ayuda="Se propone primero al asignar un viaje."
        />
        <CampoCheck
          name="tieneGps"
          etiqueta="Tiene GPS"
          defaultChecked={valores?.tieneGps}
        />
      </div>

      <TituloSeccion>Notas</TituloSeccion>
      <div className="px-4">
        <CampoTextoLargo
          name="notas"
          etiqueta="Observaciones"
          defaultValue={valores?.notas ?? ''}
          rows={2}
        />
      </div>

      <div className="mt-6 flex gap-2 px-4">
        <Boton variante="secundario" ancho onClick={() => router.back()}>
          Cancelar
        </Boton>
        <Guardar esEdicion={esEdicion} />
      </div>
    </form>
  )
}

function Guardar({ esEdicion }: { esEdicion: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      {esEdicion ? 'Guardar cambios' : 'Crear vehículo'}
    </Boton>
  )
}
