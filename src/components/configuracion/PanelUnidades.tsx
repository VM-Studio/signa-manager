'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { Layers, Plus } from 'lucide-react'
import {
  accionActivarUnidad,
  accionGuardarUnidad,
  type EstadoAccion,
} from '@/server/nucleo/configuracion'
import {
  Boton,
  BotonFlotante,
  CampoNumero,
  CampoTexto,
  EstadoVacio,
  FilaLista,
  HojaConfirmacion,
  HojaInferior,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { plural } from '@/lib/formato'

export interface UnidadVista {
  id: string
  nombre: string
  codigo: string
  orden: number
  activa: boolean
  obras: number
}

export function PanelUnidades({
  unidades,
  puedeConfigurar,
}: {
  unidades: UnidadVista[]
  puedeConfigurar: boolean
}) {
  const avisos = useAvisos()
  const [editando, setEditando] = useState<UnidadVista | null | undefined>(undefined)
  const [aDesactivar, setADesactivar] = useState<UnidadVista | null>(null)
  const [pendiente, empezar] = useTransition()

  const cambiarActivo = (unidad: UnidadVista, activa: boolean) => {
    empezar(async () => {
      const r = await accionActivarUnidad(unidad.id, activa)
      if (r.error) avisos.error(r.error)
      else avisos.correcto(r.mensaje ?? 'Listo')
      setADesactivar(null)
      setEditando(undefined)
    })
  }

  const activas = unidades.filter((u) => u.activa)
  const inactivas = unidades.filter((u) => !u.activa)

  const fila = (u: UnidadVista) => (
    <FilaLista
      key={u.id}
      titulo={u.nombre}
      subtitulo={u.codigo}
      derecha={plural(u.obras, 'obra')}
      debajoDerecha={!u.activa ? <Insignia>Desactivada</Insignia> : undefined}
      alTocar={puedeConfigurar ? () => setEditando(u) : undefined}
      flecha={puedeConfigurar}
    />
  )

  return (
    <div className="pb-24">
      {unidades.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay unidades de negocio"
          mensaje="Cargá la primera para poder crear obras."
          icono={<Layers className="size-8" strokeWidth={1.5} />}
          accion={
            puedeConfigurar
              ? { texto: 'Nueva unidad', alTocar: () => setEditando(null) }
              : undefined
          }
        />
      ) : (
        <>
          <TituloSeccion>Las áreas de la empresa</TituloSeccion>
          <Lista>{activas.map(fila)}</Lista>
          {inactivas.length > 0 && (
            <>
              <TituloSeccion>Desactivadas</TituloSeccion>
              <Lista>{inactivas.map(fila)}</Lista>
            </>
          )}
        </>
      )}

      {editando !== undefined && (
        <HojaUnidad
          unidad={editando}
          alCerrar={() => setEditando(undefined)}
          alDesactivar={(u) => setADesactivar(u)}
          alActivar={(u) => cambiarActivo(u, true)}
        />
      )}

      <HojaConfirmacion
        abierta={aDesactivar !== null}
        alCerrar={() => setADesactivar(null)}
        alConfirmar={() => aDesactivar && cambiarActivo(aDesactivar, false)}
        titulo={`¿Desactivar ${aDesactivar?.nombre ?? ''}?`}
        mensaje="La unidad deja de aparecer al crear obras. Las obras que ya la tienen no se tocan."
        textoConfirmar="Desactivar"
        peligrosa
        cargando={pendiente}
      />

      {puedeConfigurar && unidades.length > 0 && (
        <BotonFlotante
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Nueva unidad"
          alTocar={() => setEditando(null)}
        >
          Nueva
        </BotonFlotante>
      )}
    </div>
  )
}

function HojaUnidad({
  unidad,
  alCerrar,
  alDesactivar,
  alActivar,
}: {
  unidad: UnidadVista | null
  alCerrar: () => void
  alDesactivar: (u: UnidadVista) => void
  alActivar: (u: UnidadVista) => void
}) {
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<EstadoAccion, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarUnidad(unidad?.id ?? null, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo={unidad ? 'Editar unidad' : 'Nueva unidad de negocio'}
      descripcion={unidad?.codigo}
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && (
          <p role="alert" className="text-menor text-critico">
            {estado.error}
          </p>
        )}

        <CampoTexto
          name="nombre"
          etiqueta="Nombre"
          defaultValue={unidad?.nombre}
          placeholder="Prestación de servicios"
          required
          error={e.nombre}
        />
        <CampoTexto
          name="codigo"
          etiqueta="Código"
          defaultValue={unidad?.codigo}
          placeholder="SERVICIOS"
          required
          error={e.codigo}
          ayuda="En mayúsculas, sin espacios. Se usa para cruzar con el sistema base."
        />
        <CampoNumero
          name="orden"
          etiqueta="Orden en las listas"
          defaultValue={unidad?.orden ?? 0}
          error={e.orden}
        />

        <Guardar />

        {unidad && (
          <div className="border-t border-niebla pt-4">
            {unidad.activa ? (
              <Boton
                variante="peligro"
                ancho
                onClick={() => alDesactivar(unidad)}
              >
                Desactivar unidad
              </Boton>
            ) : (
              <Boton variante="secundario" ancho onClick={() => alActivar(unidad)}>
                Activar de nuevo
              </Boton>
            )}
          </div>
        )}
      </form>
    </HojaInferior>
  )
}

function Guardar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      Guardar
    </Boton>
  )
}
