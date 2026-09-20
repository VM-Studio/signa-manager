import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
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
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium',
        'transition-colors duration-150 select-none',
        'disabled:cursor-not-allowed',
        variantes[variante],
        tamanos[tamano],
        ancho && 'w-full',
        className,
      )}
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
