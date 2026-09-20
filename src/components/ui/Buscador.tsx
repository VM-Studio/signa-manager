'use client'

import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Buscador y filtros en chips.
   Lo que resuelve todo el módulo de herramientas: "¿tenemos esto y dónde
   está?" en segundos. El buscador va arriba de toda lista larga.
   ===================================================================== */

export interface BuscadorProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Se muestra cuando hay texto: limpia el campo de un toque. */
  alLimpiar?: () => void
}

export const Buscador = forwardRef<HTMLInputElement, BuscadorProps>(
  function Buscador(
    { placeholder = 'Buscar…', value, alLimpiar, className, ...props },
    ref,
  ) {
    const hayTexto = typeof value === 'string' && value.length > 0

    return (
      <div className={cn('relative', className)}>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-metadato"
        />
        <input
          ref={ref}
          type="search"
          role="searchbox"
          value={value}
          placeholder={placeholder}
          aria-label={typeof placeholder === 'string' ? placeholder : 'Buscar'}
          className={cn(
            'min-h-[var(--toque-minimo)] w-full rounded-[var(--radius-control)] border border-niebla bg-blanco',
            'pr-10 pl-9 text-cuerpo text-negro placeholder:text-metadato',
            'focus:border-negro',
            // Safari dibuja su propia cruz en los input[type=search]: la sacamos.
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
          {...props}
        />
        {hayTexto && alLimpiar && (
          <button
            type="button"
            onClick={alLimpiar}
            aria-label="Limpiar búsqueda"
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
    )
  },
)

/* ------------------------------- CHIPS ------------------------------- */

export interface Chip {
  valor: string
  texto: string
  cantidad?: number
}

export interface ChipsFiltroProps {
  chips: Chip[]
  /** Valores activos. Con `multiple` en false, como mucho uno. */
  activos: string[]
  alCambiar: (activos: string[]) => void
  multiple?: boolean
  /** Chip inicial que representa "sin filtro". */
  textoTodos?: string
  className?: string
}

export function ChipsFiltro({
  chips,
  activos,
  alCambiar,
  multiple = false,
  textoTodos = 'Todas',
  className,
}: ChipsFiltroProps) {
  const alternar = (valor: string) => {
    if (!multiple) {
      alCambiar(activos.includes(valor) ? [] : [valor])
      return
    }
    alCambiar(
      activos.includes(valor)
        ? activos.filter((a) => a !== valor)
        : [...activos, valor],
    )
  }

  return (
    <div
      className={cn('scroll-lateral sin-barra flex gap-2 px-4 py-2', className)}
      role="group"
      aria-label="Filtros"
    >
      <Chip
        texto={textoTodos}
        activo={activos.length === 0}
        alTocar={() => alCambiar([])}
      />
      {chips.map((c) => (
        <Chip
          key={c.valor}
          texto={c.texto}
          cantidad={c.cantidad}
          activo={activos.includes(c.valor)}
          alTocar={() => alternar(c.valor)}
        />
      ))}
    </div>
  )
}

function Chip({
  texto,
  cantidad,
  activo,
  alTocar,
}: {
  texto: string
  cantidad?: number
  activo: boolean
  alTocar: () => void
}) {
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-pressed={activo}
      className={cn(
        'inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full px-3 text-menor whitespace-nowrap',
        'border transition-colors',
        activo
          ? 'border-negro bg-negro font-medium text-blanco'
          : 'border-niebla bg-blanco text-grafito active:bg-hueso',
      )}
    >
      {texto}
      {cantidad !== undefined && (
        <span className={cn('cifras', activo ? 'text-blanco/70' : 'text-metadato')}>
          {cantidad}
        </span>
      )}
    </button>
  )
}

/* --------------------------------------------------------------------
   Barra de búsqueda + chips, que es como se ve arriba de casi todas las
   listas de la app.
   -------------------------------------------------------------------- */

export function BarraFiltros({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-b border-niebla bg-hueso', className)}>
      {children}
    </div>
  )
}
