import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Insignia de estado.
   Regla de CLAUDE.md: el color nunca va solo. Siempre lleva texto, y
   opcionalmente un ícono, para que se entienda al sol y sin distinguir
   bien los colores.
   ===================================================================== */

export type TonoInsignia = 'neutro' | 'correcto' | 'aviso' | 'critico'

const tonos: Record<TonoInsignia, string> = {
  neutro: 'bg-niebla text-grafito',
  correcto: 'bg-[var(--color-correcto-suave)] text-correcto',
  aviso: 'bg-[var(--color-aviso-suave)] text-[var(--color-aviso-texto)]',
  critico: 'bg-[var(--color-critico-suave)] text-critico',
}

export interface InsigniaProps {
  tono?: TonoInsignia
  children: ReactNode
  icono?: ReactNode
  className?: string
}

export function Insignia({
  tono = 'neutro',
  children,
  icono,
  className,
}: InsigniaProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-control)] px-2 py-1',
        'text-micro font-medium whitespace-nowrap',
        tonos[tono],
        className,
      )}
    >
      {icono}
      {children}
    </span>
  )
}

/** Punto de color + texto, para listas muy apretadas donde la píldora no entra. */
export function PuntoEstado({
  tono = 'neutro',
  children,
  className,
}: InsigniaProps) {
  const colores: Record<TonoInsignia, string> = {
    neutro: 'bg-acero',
    correcto: 'bg-correcto',
    aviso: 'bg-aviso',
    critico: 'bg-critico',
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-menor', className)}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', colores[tono])} />
      {children}
    </span>
  )
}
