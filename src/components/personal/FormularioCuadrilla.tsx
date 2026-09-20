'use client'

import { useActionState, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Check } from 'lucide-react'
import {
  accionGuardarCuadrilla,
  type ResultadoPersonal,
} from '@/server/personal/empleados'
import {
  AvisoFijo,
  Boton,
  Buscador,
  CampoSelect,
  CampoTexto,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { plural, textoEnum } from '@/lib/formato'

/* =====================================================================
   Armar una cuadrilla.

   La regla es que cada uno está en una sola cuadrilla activa, así que
   los que ya están en otra se muestran con el nombre de esa cuadrilla y
   no se pueden marcar: es más claro que dejar elegir y rebotarlo al
   guardar.
   ===================================================================== */

export interface EmpleadoParaCuadrilla {
  id: string
  legajo: string
  nombre: string
  apellido: string
  categoria: string
  cuadrillas: Array<{ cuadrillaId: string; cuadrilla: { nombre: string } }>
}

export function FormularioCuadrilla({
  empleados,
  valores,
}: {
  empleados: EmpleadoParaCuadrilla[]
  valores?: {
    id: string
    nombre: string
    capatazId: string | null
    miembros: Array<{ empleadoId: string }>
  }
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const esEdicion = Boolean(valores?.id)

  const [busqueda, setBusqueda] = useState('')
  const [elegidos, setElegidos] = useState<Set<string>>(
    () => new Set(valores?.miembros.map((m) => m.empleadoId) ?? []),
  )

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarCuadrilla(valores?.id ?? null, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        router.push('/personal/cuadrillas')
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return empleados
    return empleados.filter((x) =>
      `${x.apellido} ${x.nombre} ${x.legajo}`.toLowerCase().includes(t),
    )
  }, [empleados, busqueda])

  /** ¿Está en otra cuadrilla activa que no sea esta? */
  const ocupadoEn = (x: EmpleadoParaCuadrilla): string | null => {
    const otra = x.cuadrillas.find((c) => c.cuadrillaId !== valores?.id)
    return otra ? otra.cuadrilla.nombre : null
  }

  const alternar = (id: string) => {
    setElegidos((previo) => {
      const nuevo = new Set(previo)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  // Capataz: los que ya son capataces primero, pero puede ser cualquiera.
  const candidatosCapataz = useMemo(
    () =>
      [...empleados].sort((a, b) => {
        const esA = a.categoria === 'CAPATAZ' ? 0 : 1
        const esB = b.categoria === 'CAPATAZ' ? 0 : 1
        return esA - esB || a.apellido.localeCompare(b.apellido, 'es')
      }),
    [empleados],
  )

  return (
    <form action={ejecutar} className="pb-8 lg:max-w-[900px]">
      {estado.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico">{estado.error}</AvisoFijo>
        </div>
      )}

      <TituloSeccion>La cuadrilla</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoTexto
          name="nombre"
          etiqueta="Nombre"
          defaultValue={valores?.nombre}
          required
          error={e.nombre}
          placeholder="Cuadrilla de estructura"
          ayuda="Como la llaman en la obra."
        />
        <CampoSelect
          name="capatazId"
          etiqueta="Capataz"
          defaultValue={valores?.capatazId ?? ''}
          vacio="Sin capataz asignado"
          opciones={candidatosCapataz.map((x) => ({
            valor: x.id,
            texto: `${x.apellido}, ${x.nombre}${x.categoria === 'CAPATAZ' ? '' : ` · ${textoEnum(x.categoria)}`}`,
          }))}
          ayuda="El capataz no cuenta como miembro: va aparte."
        />
      </div>

      <TituloSeccion
        accion={
          <span className="cifras text-menor text-metadato">
            {plural(elegidos.size, 'elegido', 'elegidos')}
          </span>
        }
      >
        Quiénes la forman
      </TituloSeccion>

      <div className="px-4 pb-2">
        <Buscador
          value={busqueda}
          onChange={(ev) => setBusqueda(ev.target.value)}
          alLimpiar={() => setBusqueda('')}
          placeholder="Buscar por nombre o legajo"
        />
      </div>

      {/* Los ids elegidos viajan como campos ocultos: así el formulario
          sigue siendo un form normal y anda sin JavaScript de más. */}
      {[...elegidos].map((id) => (
        <input key={id} type="hidden" name="miembros" value={id} />
      ))}

      <ul className="border-y border-niebla bg-blanco">
        {visibles.map((x) => {
          const otra = ocupadoEn(x)
          const marcado = elegidos.has(x.id)
          const bloqueado = Boolean(otra) && !marcado

          return (
            <li key={x.id} className="border-b border-niebla last:border-b-0">
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => alternar(x.id)}
                className={cn(
                  'flex min-h-[var(--toque-minimo)] w-full items-center gap-3 px-4 py-2.5 text-left',
                  bloqueado ? 'opacity-55' : 'active:bg-hueso',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-[4px] border',
                    marcado
                      ? 'border-negro bg-negro text-blanco'
                      : 'border-acero bg-blanco',
                  )}
                >
                  {marcado && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-negro">
                    {x.apellido}, {x.nombre}
                  </span>
                  <span className="block truncate text-menor text-metadato">
                    {x.legajo} · {textoEnum(x.categoria)}
                    {otra ? ` · ya está en ${otra}` : ''}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {visibles.length === 0 && (
        <p className="px-4 pt-3 text-chico text-grafito">
          Nadie coincide con esa búsqueda.
        </p>
      )}

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
      {esEdicion ? 'Guardar cuadrilla' : 'Crear cuadrilla'}
    </Boton>
  )
}
