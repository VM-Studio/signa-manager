'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { TipoMantenimiento } from '@prisma/client'
import {
  accionRegistrarMantenimiento,
  type Resultado,
} from '@/server/herramientas/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  useAvisos,
} from '@/components/ui'
import { plural } from '@/lib/formato'

export function FormularioMantenimiento({
  herramientaId,
  cadaDias,
}: {
  herramientaId: string
  cadaDias: number | null
}) {
  const router = useRouter()
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<Resultado, FormData>(
    async (previo, datos) => {
      const r = await accionRegistrarMantenimiento(herramientaId, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Registrado')
        router.push(`/herramientas/${herramientaId}`)
      }
      return r
    },
    {},
  )

  const hoy = new Date()
  const valorHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  return (
    <form action={ejecutar} className="space-y-4 px-4 pt-4 pb-8">
      {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

      <CampoSelect
        name="tipo"
        etiqueta="Tipo"
        defaultValue={TipoMantenimiento.PREVENTIVO}
        required
        opciones={[
          { valor: TipoMantenimiento.PREVENTIVO, texto: 'Preventivo · service de rutina' },
          { valor: TipoMantenimiento.CORRECTIVO, texto: 'Correctivo · se rompió algo' },
        ]}
        ayuda={
          cadaDias
            ? `Si es preventivo, el próximo se agenda para dentro de ${plural(cadaDias, 'día')}.`
            : 'Esta herramienta no tiene frecuencia de mantenimiento cargada.'
        }
      />

      <CampoFecha name="fecha" etiqueta="Fecha" defaultValue={valorHoy} required />

      <CampoTextoLargo
        name="descripcion"
        etiqueta="Qué se le hizo"
        placeholder="Cambio de escobillas y limpieza general."
        required
        rows={2}
        error={estado.errores?.descripcion}
      />

      <CampoTexto name="proveedor" etiqueta="Taller o proveedor" />

      <CampoNumero name="costo" etiqueta="Costo" prefijo="$" />

      <div className="flex gap-2 pt-2">
        <Boton variante="secundario" ancho onClick={() => router.back()}>
          Cancelar
        </Boton>
        <Guardar />
      </div>
    </form>
  )
}

function Guardar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      Registrar
    </Boton>
  )
}
