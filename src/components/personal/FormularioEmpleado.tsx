'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { CategoriaLaboral } from '@prisma/client'
import {
  accionGuardarEmpleado,
  type ResultadoPersonal,
} from '@/server/personal/empleados'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { textoEnum } from '@/lib/formato'

export interface ValoresEmpleado {
  id?: string
  legajo: string
  nombre: string
  apellido: string
  dni: string
  cuil: string | null
  telefono: string | null
  direccion: string | null
  localidad: string | null
  fechaIngreso: Date
  categoria: CategoriaLaboral
  especialidad: string | null
  valorHora: number
  talleRopa: string | null
  talleCalzado: string | null
  contactoEmergenciaNombre: string | null
  contactoEmergenciaTelefono: string | null
  notas: string | null
}

function aValorFecha(f: Date | null): string {
  if (!f) return ''
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export function FormularioEmpleado({
  valores,
  legajoSugerido,
}: {
  valores?: ValoresEmpleado
  legajoSugerido?: string
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const esEdicion = Boolean(valores?.id)

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarEmpleado(valores?.id ?? null, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        router.push(r.id ? `/personal/empleados/${r.id}` : '/personal/empleados')
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}

  return (
    <form action={ejecutar} className="pb-8 lg:max-w-[900px]">
      {estado.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico">{estado.error}</AvisoFijo>
        </div>
      )}

      <TituloSeccion>Quién es</TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoTexto
          name="nombre"
          etiqueta="Nombre"
          defaultValue={valores?.nombre}
          required
          error={e.nombre}
          autoCapitalize="words"
        />
        <CampoTexto
          name="apellido"
          etiqueta="Apellido"
          defaultValue={valores?.apellido}
          required
          error={e.apellido}
          autoCapitalize="words"
        />
        <CampoTexto
          name="dni"
          etiqueta="DNI"
          inputMode="numeric"
          defaultValue={valores?.dni}
          required
          error={e.dni}
          ayuda="Sin puntos."
        />
        <CampoTexto
          name="cuil"
          etiqueta="CUIL"
          inputMode="numeric"
          defaultValue={valores?.cuil ?? ''}
          error={e.cuil}
          ayuda="11 números. Se verifica el dígito verificador."
        />
        <CampoTexto
          name="telefono"
          etiqueta="Teléfono"
          type="tel"
          defaultValue={valores?.telefono ?? ''}
          placeholder="11 5555-5555"
        />
        <CampoTexto
          name="direccion"
          etiqueta="Dirección"
          defaultValue={valores?.direccion ?? ''}
        />
        <CampoTexto
          name="localidad"
          etiqueta="Localidad"
          defaultValue={valores?.localidad ?? ''}
          placeholder="San Isidro"
        />
      </div>

      <TituloSeccion>Trabajo</TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoTexto
          name="legajo"
          etiqueta="Legajo"
          defaultValue={valores?.legajo ?? legajoSugerido}
          required
          error={e.legajo}
          ayuda={
            esEdicion
              ? undefined
              : 'Se sugiere el siguiente libre. Podés cambiarlo.'
          }
        />
        <CampoSelect
          name="categoria"
          etiqueta="Categoría"
          defaultValue={valores?.categoria ?? CategoriaLaboral.AYUDANTE}
          error={e.categoria}
          opciones={Object.values(CategoriaLaboral).map((c) => ({
            valor: c,
            texto: textoEnum(c),
          }))}
        />
        <CampoTexto
          name="especialidad"
          etiqueta="Especialidad"
          defaultValue={valores?.especialidad ?? ''}
          placeholder="Albañil, armador, encofrador…"
        />

        {esEdicion ? (
          <CampoFecha
            name="fechaIngreso"
            etiqueta="Fecha de ingreso"
            defaultValue={aValorFecha(valores?.fechaIngreso ?? null)}
            disabled
            ayuda="La fecha de ingreso no se cambia desde acá."
          />
        ) : (
          <>
            <CampoFecha
              name="fechaIngreso"
              etiqueta="Fecha de ingreso"
              required
              error={e.fechaIngreso}
            />
            <CampoNumero
              name="valorHora"
              etiqueta="Valor hora"
              prefijo="$"
              required
              error={e.valorHora}
              ayuda="Después se cambia desde la ficha, con motivo y fecha."
            />
          </>
        )}
      </div>

      <TituloSeccion>Talles</TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoTexto
          name="talleRopa"
          etiqueta="Talle de ropa"
          defaultValue={valores?.talleRopa ?? ''}
          placeholder="L"
          ayuda="Para no equivocarse cuando se pide la ropa de trabajo."
        />
        <CampoTexto
          name="talleCalzado"
          etiqueta="Talle de calzado"
          inputMode="numeric"
          defaultValue={valores?.talleCalzado ?? ''}
          placeholder="42"
        />
      </div>

      <TituloSeccion>En caso de accidente</TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoTexto
          name="contactoEmergenciaNombre"
          etiqueta="A quién avisar"
          defaultValue={valores?.contactoEmergenciaNombre ?? ''}
          autoCapitalize="words"
        />
        <CampoTexto
          name="contactoEmergenciaTelefono"
          etiqueta="Teléfono"
          type="tel"
          defaultValue={valores?.contactoEmergenciaTelefono ?? ''}
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
      {esEdicion ? 'Guardar cambios' : 'Crear empleado'}
    </Boton>
  )
}
