'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Pestañas. Se usan en las fichas (obra, empleado, vehículo).
   Con muchas pestañas se desplazan de costado dentro de su contenedor,
   nunca arrastran la página.
   ===================================================================== */

export interface Pestana {
  id: string
  texto: string
  /** Contador opcional al lado del texto: "Alertas 3". */
  cantidad?: number
  href?: string
}

export interface PestanasProps {
  pestanas: Pestana[]
  activa: string
  /** Se usa cuando las pestañas no navegan sino que cambian contenido local. */
  alCambiar?: (id: string) => void
  className?: string
}

export function Pestanas({
  pestanas,
  activa,
  alCambiar,
  className,
}: PestanasProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'scroll-lateral sin-barra flex border-b border-niebla bg-blanco',
        className,
      )}
    >
      {pestanas.map((p) => {
        const esActiva = p.id === activa

        const contenido = (
          <>
            {p.texto}
            {p.cantidad !== undefined && p.cantidad > 0 && (
              <span
                className={cn(
                  'cifras ml-1.5 rounded-full px-1.5 py-0.5 text-micro',
                  esActiva ? 'bg-negro text-blanco' : 'bg-niebla text-grafito',
                )}
              >
                {p.cantidad}
              </span>
            )}
          </>
        )

        const clases = cn(
          'relative flex min-h-[var(--toque-minimo)] shrink-0 items-center px-4 text-base whitespace-nowrap',
          'border-b-2 transition-colors',
          esActiva
            ? 'border-negro font-medium text-negro'
            : 'border-transparent text-grafito active:bg-hueso',
        )

        if (p.href) {
          return (
            <Link
              key={p.id}
              href={p.href}
              role="tab"
              aria-selected={esActiva}
              className={clases}
            >
              {contenido}
            </Link>
          )
        }

        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={esActiva}
            onClick={() => alCambiar?.(p.id)}
            className={clases}
          >
            {contenido}
          </button>
        )
      })}
    </div>
  )
}

/** Panel asociado a una pestaña. */
export function PanelPestana({
  activo,
  children,
}: {
  activo: boolean
  children: ReactNode
}) {
  if (!activo) return null
  return <div role="tabpanel">{children}</div>
}
