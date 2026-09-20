'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Boton } from './Boton'

/* =====================================================================
   Hoja inferior (bottom sheet).
   Es el contenedor de TODOS los formularios cortos y confirmaciones de
   la app: entra desde abajo, queda al alcance del pulgar y no obliga a
   cambiar de pantalla.
   ===================================================================== */

export interface HojaInferiorProps {
  abierta: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
  /** Botonera fija abajo, siempre visible aunque el contenido scrollee. */
  pie?: ReactNode
  /** Alto máximo en fracción de la pantalla. */
  alto?: 'auto' | 'medio' | 'alto'
}

const altos = {
  auto: 'max-h-[85dvh]',
  medio: 'h-[55dvh]',
  alto: 'h-[90dvh]',
}

export function HojaInferior({
  abierta,
  alCerrar,
  titulo,
  descripcion,
  children,
  pie,
  alto = 'auto',
}: HojaInferiorProps) {
  const panel = useRef<HTMLDivElement>(null)

  // Escape cierra, y el fondo no scrollea mientras la hoja está abierta.
  useEffect(() => {
    if (!abierta) return

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
    }
    document.addEventListener('keydown', alPresionar)

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // El foco entra a la hoja: si no, el teclado sigue en la pantalla de atrás.
    panel.current?.focus()

    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = overflowPrevio
    }
  }, [abierta, alCerrar])

  if (!abierta) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Fondo: cerrar tocando afuera. */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="absolute inset-0 bg-negro/45"
        style={{ animation: 'fundido-entra 150ms ease-out' }}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col bg-blanco outline-none',
          'rounded-t-[var(--radius-hoja)] sm:max-w-[var(--ancho-operativo)]',
          altos[alto],
        )}
        style={{ animation: 'hoja-entra 200ms cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        {/* Agarradera: señal visual de que la hoja se arrastra hacia abajo. */}
        <div aria-hidden className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-9 rounded-full bg-niebla" />
        </div>

        <header className="flex items-start justify-between gap-3 border-b border-niebla px-4 pt-1 pb-3">
          <div className="min-w-0">
            <h2 className="text-titulo font-medium text-negro">{titulo}</h2>
            {descripcion && (
              <p className="mt-0.5 text-menor text-grafito">{descripcion}</p>
            )}
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="-mt-1.5 -mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {pie && (
          <footer className="pad-abajo-seguro border-t border-niebla bg-blanco px-4 py-3">
            {pie}
          </footer>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------
   Confirmación: la usa toda acción destructiva de la app.
   --------------------------------------------------------------------- */

export interface HojaConfirmacionProps {
  abierta: boolean
  alCerrar: () => void
  alConfirmar: () => void
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  peligrosa?: boolean
  cargando?: boolean
}

export function HojaConfirmacion({
  abierta,
  alCerrar,
  alConfirmar,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligrosa = false,
  cargando = false,
}: HojaConfirmacionProps) {
  return (
    <HojaInferior
      abierta={abierta}
      alCerrar={alCerrar}
      titulo={titulo}
      pie={
        <div className="flex gap-2">
          <Boton
            variante="secundario"
            ancho
            onClick={alCerrar}
            disabled={cargando}
          >
            {textoCancelar}
          </Boton>
          <Boton
            variante={peligrosa ? 'peligro' : 'primario'}
            ancho
            onClick={alConfirmar}
            cargando={cargando}
          >
            {textoConfirmar}
          </Boton>
        </div>
      }
    >
      <p className="text-base text-grafito">{mensaje}</p>
    </HojaInferior>
  )
}
