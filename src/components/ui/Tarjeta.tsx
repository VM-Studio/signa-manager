import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Tarjetas: solo para resúmenes (CLAUDE.md). Los datos van en listas.
   ===================================================================== */

export function Tarjeta({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-panel)] border border-niebla bg-blanco p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Título de sección dentro de una pantalla. */
export function TituloSeccion({
  children,
  accion,
  className,
}: {
  children: ReactNode
  accion?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 pt-5 pb-2', className)}>
      <h2 className="text-chico font-medium text-grafito">{children}</h2>
      {accion}
    </div>
  )
}

/* ---------------------------------------------------------------------
   Números de resumen. Se usan arriba de las listas (herramientas, flota)
   y en el tablero. Cuando tienen href, tocarlos filtra la lista de abajo.
   --------------------------------------------------------------------- */

export interface NumeroResumenProps {
  etiqueta: string
  valor: ReactNode
  /** Marca el número cuando representa un problema. */
  tono?: 'neutro' | 'correcto' | 'aviso' | 'critico'
  href?: string
  alTocar?: () => void
  activo?: boolean
  detalle?: string
}

const tonosNumero = {
  neutro: 'text-negro',
  correcto: 'text-correcto',
  aviso: 'text-aviso',
  critico: 'text-critico',
}

export function NumeroResumen({
  etiqueta,
  valor,
  tono = 'neutro',
  href,
  alTocar,
  activo = false,
  detalle,
}: NumeroResumenProps) {
  const contenido = (
    <>
      <span className={cn('cifras text-grande font-medium', tonosNumero[tono])}>
        {valor}
      </span>
      <span className="text-menor leading-tight text-grafito">{etiqueta}</span>
      {detalle && <span className="text-micro text-acero">{detalle}</span>}
    </>
  )

  const clases = cn(
    'flex min-h-[72px] flex-1 flex-col items-start justify-center gap-0.5 px-3 py-2.5 text-left',
    'border transition-colors',
    activo
      ? 'border-negro bg-blanco'
      : 'border-niebla bg-blanco active:bg-hueso',
    'rounded-[var(--radius-panel)]',
  )

  if (href) {
    return (
      <Link href={href} className={clases} aria-current={activo || undefined}>
        {contenido}
      </Link>
    )
  }

  if (alTocar) {
    return (
      <button type="button" onClick={alTocar} className={clases} aria-pressed={activo}>
        {contenido}
      </button>
    )
  }

  return <div className={clases}>{contenido}</div>
}

/** Grilla de números de resumen que no se desborda a 380px. */
export function GrillaResumen({
  children,
  columnas = 3,
  className,
}: {
  children: ReactNode
  columnas?: 2 | 3 | 4
  className?: string
}) {
  const grillas = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  return (
    <div className={cn('grid gap-2 px-4 py-3', grillas[columnas], className)}>
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------
   Barra de progreso. La usa el consumo del presupuesto de mano de obra.
   --------------------------------------------------------------------- */

export function BarraProgreso({
  fraccion,
  etiqueta,
  className,
}: {
  /** 0 a 1. Por encima de 1 se dibuja llena y en crítico. */
  fraccion: number
  etiqueta?: string
  className?: string
}) {
  const acotada = Math.max(0, Math.min(1, fraccion))
  const tono =
    fraccion > 1 ? 'bg-critico' : fraccion > 0.85 ? 'bg-aviso' : 'bg-negro'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-niebla"
        role="progressbar"
        aria-valuenow={Math.round(fraccion * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={etiqueta}
      >
        <div
          className={cn('h-full transition-[width] duration-300', tono)}
          style={{ width: `${acotada * 100}%` }}
        />
      </div>
      {etiqueta && <p className="text-menor text-grafito">{etiqueta}</p>}
    </div>
  )
}

/** Par etiqueta/valor, el ladrillo de todas las fichas de la app. */
export function Dato({
  etiqueta,
  children,
  className,
}: {
  etiqueta: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-2', className)}>
      <span className="shrink-0 text-menor text-grafito">{etiqueta}</span>
      <span className="cifras min-w-0 text-right text-base text-negro">
        {children}
      </span>
    </div>
  )
}

/** Lista de datos con divisores finos, para las pestañas de las fichas. */
export function ListaDatos({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('divide-y divide-niebla px-4', className)}>{children}</div>
  )
}
