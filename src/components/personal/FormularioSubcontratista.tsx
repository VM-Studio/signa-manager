'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { RubroSubcontratista } from '@prisma/client'
import {
  accionGuardarSubcontratista,
  type ResultadoPersonal,
} from '@/server/personal/empleados'
import {
  AvisoFijo,
  Boton,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { textoEnum } from '@/lib/formato'

export interface ValoresSubcontratista {
  id?: string
  razonSocial: string
  cuit: string
  rubro: RubroSubcontratista
  contacto: string | null
  telefono: string | null
  email: string | null
  notas: string | null
}

export function FormularioSubcontratista({
  valores,
}: {
  valores?: ValoresSubcontratista
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const esEdicion = Boolean(valores?.id)

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarSubcontratista(
        valores?.id ?? null,
        previo,
        datos,
      )
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        router.push(
          r.id
            ? `/personal/subcontratistas/${r.id}`
            : '/personal/subcontratistas',
        )
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}

  return (
    <form action={ejecutar} className="pb-8">
      {estado.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico">{estado.error}</AvisoFijo>
        </div>
      )}

      <TituloSeccion>La empresa</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoTexto
          name="razonSocial"
          etiqueta="Razón social"
          defaultValue={valores?.razonSocial}
          required
          error={e.razonSocial}
          placeholder="Instalaciones del Norte S.R.L."
        />
        <CampoTexto
          name="cuit"
          etiqueta="CUIT"
          inputMode="numeric"
          defaultValue={valores?.cuit}
          required
          error={e.cuit}
          ayuda="11 números, sin guiones. Se verifica el dígito verificador."
        />
        <CampoSelect
          name="rubro"
          etiqueta="Rubro"
          defaultValue={valores?.rubro ?? RubroSubcontratista.OTRO}
          error={e.rubro}
          opciones={Object.values(RubroSubcontratista).map((r) => ({
            valor: r,
            texto: textoEnum(r),
          }))}
        />
      </div>

      <TituloSeccion>Con quién se habla</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoTexto
          name="contacto"
          etiqueta="Nombre del contacto"
          defaultValue={valores?.contacto ?? ''}
          autoCapitalize="words"
        />
        <CampoTexto
          name="telefono"
          etiqueta="Teléfono"
          type="tel"
          defaultValue={valores?.telefono ?? ''}
        />
        <CampoTexto
          name="email"
          etiqueta="Email"
          type="email"
          defaultValue={valores?.email ?? ''}
        />
      </div>

      <TituloSeccion>Notas</TituloSeccion>
      <div className="px-4">
        <CampoTextoLargo
          name="notas"
          etiqueta="Observaciones"
          defaultValue={valores?.notas ?? ''}
          rows={2}
          ayuda="Cómo trabaja, con qué obras ya estuvo, qué hay que tenerle en cuenta."
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
      {esEdicion ? 'Guardar cambios' : 'Crear subcontratista'}
    </Boton>
  )
}
