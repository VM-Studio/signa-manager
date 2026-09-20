import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Fila de lista.
   Las listas de datos van con divisores finos y sin radio (CLAUDE.md):
   las tarjetas quedan solo para los resúmenes.
   ===================================================================== */

export interface FilaListaProps {
  titulo: ReactNode
  subtitulo?: ReactNode
  /** Tercera línea, para metadatos: código, ubicación, responsable. */
  detalle?: ReactNode
  /** Dato alineado a la derecha: un monto, una cantidad, una hora. */
  derecha?: ReactNode
  /** Debajo del dato de la derecha: una insignia de estado. */
  debajoDerecha?: ReactNode
  /** Ícono o avatar a la izquierda. */
  izquierda?: ReactNode
  href?: string
  alTocar?: () => void
  /** Muestra la flecha de navegación. Por defecto, sí cuando hay href. */
  flecha?: boolean
  /** Barra fina de color al costado izquierdo, para marcar filas críticas. */
  tono?: 'neutro' | 'correcto' | 'aviso' | 'critico'
  className?: string
}

const tonosBarra = {
  neutro: '',
  correcto: 'border-l-2 border-l-correcto',
  aviso: 'border-l-2 border-l-aviso',
  critico: 'border-l-2 border-l-critico',
}

export function FilaLista({
  titulo,
  subtitulo,
  detalle,
  derecha,
  debajoDerecha,
  izquierda,
  href,
  alTocar,
  flecha,
  tono = 'neutro',
  className,
}: FilaListaProps) {
  const mostrarFlecha = flecha ?? (!!href || !!alTocar)

  const contenido = (
    <>
      {izquierda && <div className="shrink-0">{izquierda}</div>}

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-negro">{titulo}</p>
        {subtitulo && (
          <p className="truncate text-chico text-grafito">{subtitulo}</p>
        )}
        {detalle && <p className="truncate text-menor text-metadato">{detalle}</p>}
      </div>

      {(derecha || debajoDerecha) && (
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {derecha && (
            <span className="cifras text-base font-medium text-negro">
              {derecha}
            </span>
          )}
          {debajoDerecha}
        </div>
      )}

      {mostrarFlecha && (
        <ChevronRight aria-hidden className="size-4 shrink-0 text-metadato" />
      )}
    </>
  )

  const cliqueable = Boolean(href || alTocar)

  const clases = cn(
    'flex w-full min-h-[var(--toque-minimo)] items-center gap-3 bg-blanco px-4 py-3 text-left',
    'transition-colors active:bg-hueso',
    // El realce solo con mouse: en el celular quedaría pegado después
    // de tocar.
    cliqueable && 'cursor-pointer hover:bg-hueso',
    tonosBarra[tono],
    className,
  )

  if (href) {
    return (
      <Link href={href} className={clases}>
        {contenido}
      </Link>
    )
  }

  if (alTocar) {
    return (
      <button type="button" onClick={alTocar} className={clases}>
        {contenido}
      </button>
    )
  }

  return <div className={clases}>{contenido}</div>
}

/** Contenedor de filas: pone los divisores finos entre una y otra. */
export function Lista({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y divide-niebla border-y border-niebla bg-blanco',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------
   Grilla de fichas.

   Las mismas filas, pero como tarjetas cuando hay ancho: lo usan la
   vista por ubicación de herramientas y "En este momento" de vehículos,
   donde lo que se mira es un panorama y no una lista para recorrer.

   En celular es exactamente la lista de siempre.
   --------------------------------------------------------------------- */

export function GrillaFichas({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y divide-niebla border-y border-niebla bg-blanco',
        'md:grid md:gap-3 md:divide-y-0 md:border-0 md:bg-transparent md:px-4 md:py-3',
        'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        '[&>*]:md:rounded-[var(--radius-panel)] [&>*]:md:border [&>*]:md:border-niebla',
        className,
      )}
    >
      {children}
    </div>
  )
}
