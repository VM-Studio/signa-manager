'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, Warehouse } from 'lucide-react'
import {
  accionActivarDeposito,
  accionGuardarDeposito,
  type EstadoAccion,
} from '@/server/nucleo/configuracion'
import {
  Boton,
  BotonFlotante,
  CampoSelect,
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
import { monedaCorta, plural } from '@/lib/formato'

export interface DepositoVista {
  id: string
  nombre: string
  direccion: string | null
  activo: boolean
  responsableId: string | null
  responsable: string | null
  herramientas: number
  valor: number
}

export function PanelDepositos({
  depositos,
  responsables,
  puedeEditar,
}: {
  depositos: DepositoVista[]
  responsables: Array<{ id: string; nombre: string }>
  puedeEditar: boolean
}) {
  const avisos = useAvisos()
  const [editando, setEditando] = useState<DepositoVista | null | undefined>(undefined)
  const [aDesactivar, setADesactivar] = useState<DepositoVista | null>(null)
  const [pendiente, empezar] = useTransition()

  const cambiarActivo = (deposito: DepositoVista, activo: boolean) => {
    empezar(async () => {
      const r = await accionActivarDeposito(deposito.id, activo)
      if (r.error) avisos.error(r.error)
      else avisos.correcto(r.mensaje ?? 'Listo')
      setADesactivar(null)
      setEditando(undefined)
    })
  }

  const activos = depositos.filter((d) => d.activo)
  const inactivos = depositos.filter((d) => !d.activo)

  const fila = (d: DepositoVista) => (
    <FilaLista
      key={d.id}
      titulo={d.nombre}
      subtitulo={d.direccion ?? undefined}
      detalle={d.responsable ? `A cargo de ${d.responsable}` : 'Sin responsable'}
      derecha={plural(d.herramientas, 'herramienta')}
      debajoDerecha={
        !d.activo ? (
          <Insignia>Desactivado</Insignia>
        ) : d.valor > 0 ? (
          <span className="text-micro text-acero">{monedaCorta(d.valor)}</span>
        ) : undefined
      }
      alTocar={puedeEditar ? () => setEditando(d) : undefined}
      flecha={puedeEditar}
    />
  )

  return (
    <div className="pb-24">
      {depositos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay depósitos"
          mensaje="Cargá el primero para poder guardar herramientas."
          icono={<Warehouse className="size-8" strokeWidth={1.5} />}
          accion={
            puedeEditar
              ? { texto: 'Nuevo depósito', alTocar: () => setEditando(null) }
              : undefined
          }
        />
      ) : (
        <>
          <TituloSeccion>Dónde se guardan las herramientas</TituloSeccion>
          <Lista>{activos.map(fila)}</Lista>
          {inactivos.length > 0 && (
            <>
              <TituloSeccion>Desactivados</TituloSeccion>
              <Lista>{inactivos.map(fila)}</Lista>
            </>
          )}
        </>
      )}

      {editando !== undefined && (
        <HojaDeposito
          deposito={editando}
          responsables={responsables}
          alCerrar={() => setEditando(undefined)}
          alDesactivar={(d) => setADesactivar(d)}
          alActivar={(d) => cambiarActivo(d, true)}
        />
      )}

      <HojaConfirmacion
        abierta={aDesactivar !== null}
        alCerrar={() => setADesactivar(null)}
        alConfirmar={() => aDesactivar && cambiarActivo(aDesactivar, false)}
        titulo={`¿Desactivar ${aDesactivar?.nombre ?? ''}?`}
        mensaje="El depósito deja de aparecer al mover herramientas. El historial no se toca."
        textoConfirmar="Desactivar"
        peligrosa
        cargando={pendiente}
      />

      {puedeEditar && depositos.length > 0 && (
        <BotonFlotante
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Nuevo depósito"
          alTocar={() => setEditando(null)}
        >
          Nuevo
        </BotonFlotante>
      )}
    </div>
  )
}

function HojaDeposito({
  deposito,
  responsables,
  alCerrar,
  alDesactivar,
  alActivar,
}: {
  deposito: DepositoVista | null
  responsables: Array<{ id: string; nombre: string }>
  alCerrar: () => void
  alDesactivar: (d: DepositoVista) => void
  alActivar: (d: DepositoVista) => void
}) {
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<EstadoAccion, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarDeposito(deposito?.id ?? null, previo, datos)
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
      titulo={deposito ? 'Editar depósito' : 'Nuevo depósito'}
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
          defaultValue={deposito?.nombre}
          placeholder="Depósito Central"
          required
          error={e.nombre}
        />
        <CampoTexto
          name="direccion"
          etiqueta="Dirección"
          defaultValue={deposito?.direccion ?? ''}
          placeholder="Av. Maipú 3240, Olivos"
          error={e.direccion}
        />
        <CampoSelect
          name="responsableId"
          etiqueta="Responsable"
          defaultValue={deposito?.responsableId ?? ''}
          vacio="Sin responsable"
          error={e.responsableId}
          opciones={responsables.map((r) => ({ valor: r.id, texto: r.nombre }))}
        />

        <Guardar />

        {deposito && (
          <div className="border-t border-niebla pt-4">
            {deposito.activo ? (
              <Boton variante="peligro" ancho onClick={() => alDesactivar(deposito)}>
                Desactivar depósito
              </Boton>
            ) : (
              <Boton variante="secundario" ancho onClick={() => alActivar(deposito)}>
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
