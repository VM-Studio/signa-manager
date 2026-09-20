'use client'

import { useActionState, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { TipoViaje } from '@prisma/client'
import {
  accionCrearViajeDirecto,
  type ResultadoViaje,
} from '@/server/vehiculos/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFechaHora,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { patente as formatoPatente, peso, textoEnum } from '@/lib/formato'

/* =====================================================================
   Viaje directo, sin solicitud previa.

   Lo usa logística cuando el pedido llegó por teléfono o cuando hay que
   salir ya. Las mismas reglas que al asignar: el servidor revisa seguro,
   VTV, licencia, superposición y peso, y si algo no da lo dice y no
   crea nada.
   ===================================================================== */

export interface VehiculoParaViaje {
  id: string
  patente: string
  marca: string
  modelo: string
  capacidadCargaKg: number | null
}

function enUnaHora(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function FormularioViajeDirecto({
  vehiculos,
  choferes,
  obras,
}: {
  vehiculos: VehiculoParaViaje[]
  choferes: Array<{ id: string; nombre: string; apellido: string }>
  obras: Array<{ id: string; codigo: string; nombre: string }>
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [vehiculoId, setVehiculoId] = useState('')
  const [pesoCarga, setPesoCarga] = useState('')

  const [estado, ejecutar] = useActionState<ResultadoViaje, FormData>(
    async (previo, datos) => {
      const r = await accionCrearViajeDirecto(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Viaje creado')
        router.push(r.id ? `/vehiculos/viajes/${r.id}` : '/vehiculos/agenda')
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}
  const elegido = useMemo(
    () => vehiculos.find((v) => v.id === vehiculoId) ?? null,
    [vehiculos, vehiculoId],
  )

  // El aviso de peso se muestra mientras se escribe, sin esperar al
  // servidor: es el error más común y el más caro de descubrir tarde.
  const kilos = Number(pesoCarga.replace(/\./g, '').replace(',', '.'))
  const seExcede =
    elegido?.capacidadCargaKg != null &&
    Number.isFinite(kilos) &&
    kilos > elegido.capacidadCargaKg

  return (
    <form action={ejecutar} className="pb-8">
      {estado.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico" titulo="No se puede crear así">
            {estado.error}
          </AvisoFijo>
        </div>
      )}

      <TituloSeccion>Quién lo hace</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoSelect
          name="vehiculoId"
          etiqueta="Vehículo"
          value={vehiculoId}
          onChange={(ev) => setVehiculoId(ev.target.value)}
          vacio="Elegí un vehículo…"
          required
          error={e.vehiculoId}
          opciones={vehiculos.map((v) => ({
            valor: v.id,
            texto: `${formatoPatente(v.patente)} · ${v.marca} ${v.modelo}${
              v.capacidadCargaKg ? ` · ${peso(v.capacidadCargaKg)}` : ''
            }`,
          }))}
        />
        <CampoSelect
          name="choferId"
          etiqueta="Chofer"
          vacio="Elegí un chofer…"
          required
          error={e.choferId}
          opciones={choferes.map((c) => ({
            valor: c.id,
            texto: `${c.apellido}, ${c.nombre}`,
          }))}
          ayuda="Si tiene la licencia vencida, el sistema no lo deja salir."
        />
      </div>

      <TituloSeccion>A dónde va</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoSelect
          name="tipo"
          etiqueta="Qué va a hacer"
          defaultValue={TipoViaje.ENTREGA_MATERIALES}
          opciones={Object.values(TipoViaje).map((t) => ({
            valor: t,
            texto: textoEnum(t),
          }))}
        />
        <CampoTexto
          name="origen"
          etiqueta="Desde"
          required
          error={e.origen}
          placeholder="Depósito central"
        />
        <CampoTexto
          name="destino"
          etiqueta="Hasta"
          required
          error={e.destino}
          placeholder="Obra Libertador 2400"
        />
        <CampoSelect
          name="obraId"
          etiqueta="Obra"
          vacio="Sin obra"
          opciones={obras.map((o) => ({
            valor: o.id,
            texto: `${o.codigo} · ${o.nombre}`,
          }))}
          ayuda="Si elegís una obra, el costo del viaje se le carga a esa obra."
        />
        <CampoFechaHora
          name="salidaPrevista"
          etiqueta="Sale"
          defaultValue={enUnaHora()}
          required
          error={e.salidaPrevista}
        />
      </div>

      <TituloSeccion>Qué lleva</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoTextoLargo
          name="descripcionCarga"
          etiqueta="Carga"
          rows={2}
          placeholder="20 bolsas de cemento y 3 rollos de malla"
        />
        <CampoNumero
          name="pesoCargaKg"
          etiqueta="Peso"
          sufijo="kg"
          value={pesoCarga}
          onChange={(ev) => setPesoCarga(ev.target.value)}
          error={e.pesoCargaKg}
        />
        {seExcede && elegido?.capacidadCargaKg != null && (
          <AvisoFijo tono="critico" titulo="No entra en ese vehículo">
            {formatoPatente(elegido.patente)} lleva hasta{' '}
            {peso(elegido.capacidadCargaKg)}. Elegí otro vehículo o partí la
            carga en dos viajes.
          </AvisoFijo>
        )}
      </div>

      <div className="mt-6 flex gap-2 px-4">
        <Boton variante="secundario" ancho onClick={() => router.back()}>
          Cancelar
        </Boton>
        <Crear bloqueado={seExcede} />
      </div>
    </form>
  )
}

function Crear({ bloqueado }: { bloqueado: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending} disabled={bloqueado}>
      Crear viaje
    </Boton>
  )
}
