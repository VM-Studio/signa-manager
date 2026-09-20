'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Botón flotante de acción principal.
   Va abajo a la derecha, por encima de la barra inferior y del área
   segura del teléfono: es lo primero que alcanza el pulgar.
   ===================================================================== */

export interface BotonFlotanteProps {
  /** Texto visible. Si se omite, queda circular y solo con ícono. */
  children?: ReactNode
  icono: ReactNode
  /** Obligatorio cuando el botón es solo ícono. */
  etiqueta?: string
  href?: string
  alTocar?: () => void
  className?: string
}

export function BotonFlotante({
  children,
  icono,
  etiqueta,
  href,
  alTocar,
  className,
}: BotonFlotanteProps) {
  const clases = cn(
    'fixed right-4 z-30 inline-flex min-h-[56px] items-center justify-center gap-2',
    'bg-negro text-blanco active:bg-carbon transition-colors',
    children ? 'rounded-full px-5 text-base font-medium' : 'size-14 rounded-full',
    // Se apoya arriba de la barra inferior, respetando el área segura.
    'bottom-[calc(var(--alto-barra-inferior)+16px+env(safe-area-inset-bottom,0px))]',
    // En escritorio queda dentro del ancho operativo, no pegado al borde.
    'sm:right-[max(1rem,calc(50vw-var(--ancho-operativo)/2+1rem))]',
    className,
  )

  const contenido = (
    <>
      {icono}
      {children}
    </>
  )

  if (href) {
    return (
      <Link href={href} aria-label={etiqueta} className={clases}>
        {contenido}
      </Link>
    )
  }

  return (
    <button type="button" onClick={alTocar} aria-label={etiqueta} className={clases}>
      {contenido}
    </button>
  )
}
