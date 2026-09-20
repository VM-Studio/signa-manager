'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useEncabezado } from '@/components/app/ProveedorEncabezado'
import { cn } from '@/lib/cn'

/* =====================================================================
   Encabezado de pantalla.

   Un solo componente para los dos mundos:

   - En celular y tablet se dibuja acá mismo, debajo del header negro:
     volver a la izquierda, título al centro, una acción a la derecha.
   - En escritorio no se dibuja: publica su título, su subtítulo y sus
     acciones en la barra superior del layout, que es donde además está
     la campana de alertas.

   Las pantallas no cambian: siguen usando las mismas props.
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
  const { publicar } = useEncabezado()

  /*
   * Se publica en cada render porque `accion` es un nodo nuevo cada vez
   * y no se puede comparar. El estado del proveedor es lo único que
   * cambia, así que el costo es un render de la barra superior.
   */
  useEffect(() => {
    publicar({ titulo, subtitulo, volverA, acciones: accion })
    return () => publicar(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, subtitulo, volverA, publicar])

  return (
    <div
      className={cn(
        'flex min-h-[var(--toque-minimo)] items-center gap-2 border-b border-niebla bg-blanco px-2 py-2',
        // En escritorio manda la barra superior del layout.
        'lg:hidden',
        className,
      )}
    >
      {!sinVolver &&
        (volverA ? (
          <Link
            href={volverA}
            aria-label="Volver"
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-grafito hover:bg-hueso active:bg-hueso"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-grafito hover:bg-hueso active:bg-hueso"
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
