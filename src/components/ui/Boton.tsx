import { forwardRef } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma'
export type TamanoBoton = 'normal' | 'grande' | 'chico'

const variantes: Record<VarianteBoton, string> = {
  // Negro sólido. La acción principal de cada pantalla, una sola por vista.
  primario:
    'bg-negro text-blanco border border-negro active:bg-carbon disabled:bg-acero disabled:border-acero',
  // Borde fino sobre claro. Acciones secundarias.
  secundario:
    'bg-blanco text-negro border border-niebla active:bg-hueso disabled:text-metadato disabled:bg-hueso',
  // Solo para lo que destruye o no tiene vuelta atrás.
  peligro:
    'bg-critico text-blanco border border-critico active:brightness-90 disabled:bg-acero disabled:border-acero',
  // Sin fondo ni borde. Para "Cancelar" y acciones de poco peso.
  fantasma:
    'bg-transparent text-grafito border border-transparent active:bg-niebla disabled:text-metadato',
}

const tamanos: Record<TamanoBoton, string> = {
  // 48px es el mínimo de CLAUDE.md: se toca con guantes.
  chico: 'min-h-[40px] px-3 text-menor gap-1.5',
  normal: 'min-h-[48px] px-4 text-base gap-2',
  grande: 'min-h-[56px] px-5 text-titulo gap-2.5',
}

/** Las clases del botón, compartidas con EnlaceBoton para que se vean igual. */
export function clasesBoton({
  variante = 'primario',
  tamano = 'normal',
  ancho = false,
  className,
}: {
  variante?: VarianteBoton
  tamano?: TamanoBoton
  ancho?: boolean
  className?: string
} = {}): string {
  return cn(
    'inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium',
    'transition-colors duration-150 select-none',
    'disabled:cursor-not-allowed',
    variantes[variante],
    tamanos[tamano],
    ancho && 'w-full',
    className,
  )
}

export interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton
  tamano?: TamanoBoton
  cargando?: boolean
  /** Ocupa todo el ancho disponible. En móvil casi siempre sí. */
  ancho?: boolean
  iconoIzquierda?: ReactNode
  iconoDerecha?: ReactNode
}

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  {
    variante = 'primario',
    tamano = 'normal',
    cargando = false,
    ancho = false,
    iconoIzquierda,
    iconoDerecha,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const bloqueado = disabled || cargando

  return (
    <button
      ref={ref}
      type={type}
      disabled={bloqueado}
      aria-busy={cargando || undefined}
      className={clasesBoton({ variante, tamano, ancho, className })}
      {...props}
    >
      {cargando ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        iconoIzquierda
      )}
      <span className="truncate">{children}</span>
      {!cargando && iconoDerecha}
    </button>
  )
})

/* ---------------------------------------------------------------------
   Un link que se ve igual que un botón.

   Cuando la acción es "ir a otra pantalla" tiene que ser un <a> de
   verdad: se puede abrir en otra pestaña, se precarga y el lector de
   pantalla lo anuncia como enlace, no como botón.
   --------------------------------------------------------------------- */

export interface EnlaceBotonProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  variante?: VarianteBoton
  tamano?: TamanoBoton
  ancho?: boolean
  iconoIzquierda?: ReactNode
  iconoDerecha?: ReactNode
}

export function EnlaceBoton({
  href,
  variante = 'secundario',
  tamano = 'normal',
  ancho = false,
  iconoIzquierda,
  iconoDerecha,
  className,
  children,
  ...props
}: EnlaceBotonProps) {
  return (
    <Link
      href={href}
      className={clasesBoton({ variante, tamano, ancho, className })}
      {...props}
    >
      {iconoIzquierda}
      <span className="truncate">{children}</span>
      {iconoDerecha}
    </Link>
  )
}
