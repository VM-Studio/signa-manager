'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRightLeft,
  Ban,
  CornerUpLeft,
  HelpCircle,
  Send,
  Truck,
  Wrench,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  accionesPosibles,
  TEXTO_ACCION,
  type AccionHerramienta,
  type EstadoActual,
} from '@/server/herramientas/movimientos'
import { Boton, TituloSeccion } from '@/components/ui'
import { HojaMovimiento, type OpcionesMovimiento } from './HojaMovimiento'

/* =====================================================================
   Los botones de acción de la ficha. Cambian según cómo está la
   herramienta: no se ofrece "devolver" algo que está en el depósito.
   ===================================================================== */

const ICONOS: Record<AccionHerramienta, ReactNode> = {
  ENTREGAR: <Truck aria-hidden className="size-4" />,
  DEVOLVER: <CornerUpLeft aria-hidden className="size-4" />,
  TRANSFERIR: <ArrowRightLeft aria-hidden className="size-4" />,
  ENVIAR_A_REPARACION: <Wrench aria-hidden className="size-4" />,
  VOLVIO_DE_REPARACION: <Send aria-hidden className="size-4" />,
  MARCAR_EXTRAVIADA: <HelpCircle aria-hidden className="size-4" />,
  DAR_DE_BAJA: <Ban aria-hidden className="size-4" />,
}

export function AccionesHerramienta({
  herramienta,
  nombre,
  stockDisponible,
  opciones,
  puedeOperar,
}: {
  herramienta: EstadoActual
  nombre: string
  stockDisponible?: number
  opciones: OpcionesMovimiento
  puedeOperar: boolean
}) {
  const parametros = useSearchParams()
  const [abierta, setAbierta] = useState<AccionHerramienta | null>(null)

  // El escáner puede llegar con la acción ya elegida en la URL.
  useEffect(() => {
    const pedida = parametros.get('accion') as AccionHerramienta | null
    if (pedida && accionesPosibles(herramienta).includes(pedida)) {
      setAbierta(pedida)
    }
  }, [parametros, herramienta])

  if (!puedeOperar) return null

  const posibles = accionesPosibles(herramienta)
  if (posibles.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-chico text-grafito">
        Esta herramienta está dada de baja. No se puede mover.
      </p>
    )
  }

  // La primera es la más probable y va en negro, grande.
  const [principal, ...secundarias] = posibles

  return (
    <>
      <TituloSeccion>¿Qué querés hacer?</TituloSeccion>
      <div className="space-y-2 px-4">
        <Boton
          ancho
          tamano="grande"
          iconoIzquierda={ICONOS[principal]}
          onClick={() => setAbierta(principal)}
        >
          {TEXTO_ACCION[principal]}
        </Boton>

        <div className="grid grid-cols-2 gap-2">
          {secundarias.map((a) => (
            <Boton
              key={a}
              variante={a === 'DAR_DE_BAJA' ? 'peligro' : 'secundario'}
              ancho
              tamano="chico"
              iconoIzquierda={ICONOS[a]}
              onClick={() => setAbierta(a)}
            >
              {TEXTO_ACCION[a]}
            </Boton>
          ))}
        </div>
      </div>

      {abierta && (
        <HojaMovimiento
          herramientaId={herramienta.id}
          herramientaNombre={nombre}
          accion={abierta}
          esPorCantidad={herramienta.tipoControl === 'CANTIDAD'}
          stockDisponible={stockDisponible}
          opciones={opciones}
          alCerrar={() => setAbierta(null)}
        />
      )}
    </>
  )
}
