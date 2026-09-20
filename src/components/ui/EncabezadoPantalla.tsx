'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Encabezado de pantalla interior: volver a la izquierda, título al
   centro, una acción a la derecha. Va debajo del header negro de la app.
   ===================================================================== */

export interface EncabezadoPantallaProps {
  titulo: string
  subtitulo?: string
  /** Si no se pasa, el botón vuelve a la pantalla anterior del historial. */
  volverA?: string
  /** Oculta el botón volver (pantallas raíz de cada sección). */
  sinVolver?: boolean
  accion?: ReactNode
  className?: string
}

export function EncabezadoPantalla({
  titulo,
  subtitulo,
  volverA,
  sinVolver = false,
  accion,
  className,
}: EncabezadoPantallaProps) {
  const router = useRouter()

  return (
    <div
      className={cn(
        'flex min-h-[var(--toque-minimo)] items-center gap-2 border-b border-niebla bg-blanco px-2 py-2',
        className,
      )}
    >
      {!sinVolver &&
        (volverA ? (
          <Link
            href={volverA}
            aria-label="Volver"
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
        ))}

      <div className={cn('min-w-0 flex-1', sinVolver && 'pl-2')}>
        <h1 className="truncate text-titulo font-medium text-negro">{titulo}</h1>
        {subtitulo && (
          <p className="truncate text-menor text-grafito">{subtitulo}</p>
        )}
      </div>

      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  )
}
