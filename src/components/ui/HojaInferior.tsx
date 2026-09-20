'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Boton } from './Boton'

/* =====================================================================
   El contenedor de TODOS los formularios cortos y confirmaciones.

   Es el mismo componente en los dos mundos:

   - Hasta 1023px entra desde abajo y queda al alcance del pulgar.
   - De 1024px para arriba entra desde la derecha como panel de 480px,
     de alto completo. En una pantalla grande una hoja pegada al borde
     de abajo obliga a bajar la vista hasta el pie del monitor.

   En los dos casos cierra con Escape y con clic afuera, y el foco queda
   atrapado adentro mientras está abierta.
   ===================================================================== */

export interface HojaInferiorProps {
  abierta: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
  /** Botonera fija abajo, siempre visible aunque el contenido scrollee. */
  pie?: ReactNode
  /** Alto máximo en móvil. En escritorio el panel siempre es de alto completo. */
  alto?: 'auto' | 'medio' | 'alto'
}

const altos = {
  auto: 'max-h-[85dvh]',
  medio: 'h-[55dvh]',
  alto: 'h-[90dvh]',
}

/** Lo que puede recibir foco dentro del panel. */
const ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

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

  useEffect(() => {
    if (!abierta) return

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        alCerrar()
        return
      }

      /*
       * El foco no se escapa del panel.
       *
       * Sin esto, tabular desde el último campo lleva a la pantalla de
       * atrás, que está tapada: quien usa teclado o lector de pantalla
       * queda perdido sin saber dónde está.
       */
      if (e.key !== 'Tab' || !panel.current) return

      const foco = panel.current.querySelectorAll<HTMLElement>(ENFOCABLES)
      if (foco.length === 0) return

      const primero = foco[0]
      const ultimo = foco[foco.length - 1]
      const activo = document.activeElement

      if (e.shiftKey && activo === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPresionar)

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // El foco entra al panel: si no, el teclado sigue en la pantalla de atrás.
    const previo = document.activeElement as HTMLElement | null
    panel.current?.focus()

    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = overflowPrevio
      // Y vuelve a donde estaba al cerrar.
      previo?.focus?.()
    }
  }, [abierta, alCerrar])

  if (!abierta) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end">
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
          // Escritorio: panel lateral derecho de alto completo.
          'lg:h-full lg:max-h-none lg:w-[var(--ancho-panel-lateral)] lg:max-w-none lg:rounded-none lg:border-l lg:border-niebla',
          'animar-hoja',
        )}
      >
        {/* Agarradera: señal de que se arrastra hacia abajo. Solo en celular. */}
        <div aria-hidden className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <span className="h-1 w-9 rounded-full bg-niebla" />
        </div>

        <header className="flex items-start justify-between gap-3 border-b border-niebla px-4 pt-1 pb-3 lg:px-6 lg:pt-5 lg:pb-4">
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
            className="-mt-1.5 -mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-grafito transition-colors hover:bg-hueso active:bg-hueso"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="scroll-fino flex-1 overflow-y-auto px-4 py-4 lg:px-6">
          {children}
        </div>

        {pie && (
          <footer className="pad-abajo-seguro border-t border-niebla bg-blanco px-4 py-3 lg:px-6 lg:pb-5">
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
