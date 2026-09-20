'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Prioridad } from '@prisma/client'
import { accionCrearSolicitud, type Resultado } from '@/server/herramientas/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTextoLargo,
  useAvisos,
} from '@/components/ui'

export function FormularioSolicitud({
  obras,
  categorias,
}: {
  obras: Array<{ id: string; codigo: string; nombre: string }>
  categorias: Array<{ id: string; nombre: string }>
}) {
  const router = useRouter()
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<Resultado, FormData>(
    async (previo, datos) => {
      const r = await accionCrearSolicitud(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Solicitud enviada')
        router.push('/herramientas/solicitudes')
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}

  return (
    <form action={ejecutar} className="space-y-4 px-4 pt-4 pb-8">
      {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

      <AvisoFijo tono="neutro">
        El pañol va a fijarse primero si la empresa ya tiene esta herramienta
        en algún depósito o en otra obra, antes de comprarla.
      </AvisoFijo>

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

      <CampoTextoLargo
        name="descripcion"
        etiqueta="Qué necesitás"
        placeholder="Placa compactadora para el contrapiso del subsuelo"
        required
        rows={2}
        error={e.descripcion}
        ayuda="Contá para qué la vas a usar: ayuda al pañol a proponer algo equivalente."
      />

      <CampoSelect
        name="categoriaId"
        etiqueta="Categoría"
        vacio="No sé / otra"
        error={e.categoriaId}
        opciones={categorias.map((c) => ({ valor: c.id, texto: c.nombre }))}
      />

      <CampoNumero
        name="cantidad"
        etiqueta="Cuántas"
        defaultValue={1}
        min={1}
        required
        error={e.cantidad}
      />

      <CampoFecha
        name="fechaNecesaria"
        etiqueta="Para cuándo la necesitás"
        required
        error={e.fechaNecesaria}
      />

      <CampoSelect
        name="prioridad"
        etiqueta="Prioridad"
        defaultValue={Prioridad.NORMAL}
        error={e.prioridad}
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
      Enviar al pañol
    </Boton>
  )
}
