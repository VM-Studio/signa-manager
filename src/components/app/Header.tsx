'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { tituloDeRuta } from '@/lib/navegacion'
import { cn } from '@/lib/cn'

/* =====================================================================
   Header negro fijo: logo chico a la izquierda, título de la sección en
   el centro y la campana de alertas con su contador a la derecha.
   ===================================================================== */

export function Header({
  alertasAbiertas,
  hayCriticas,
  puedeVerAlertas,
}: {
  alertasAbiertas: number
  hayCriticas: boolean
  puedeVerAlertas: boolean
}) {
  const ruta = usePathname()
  const titulo = tituloDeRuta(ruta)

  return (
    <header className="pad-arriba-seguro sobre-negro fixed inset-x-0 top-0 z-30 bg-negro">
      <div className="mx-auto flex h-[var(--alto-header)] max-w-[var(--ancho-tablero)] items-center gap-2 px-3">
        <Link
          href="/inicio"
          aria-label="Ir al inicio"
          className="flex size-11 shrink-0 items-center justify-center"
        >
          <Image
            src="/signalogo.png"
            alt=""
            width={96}
            height={54}
            priority
            className="h-auto w-[34px] object-contain object-left"
          />
        </Link>

        <h1 className="flex-1 truncate text-center text-base font-medium text-blanco">
          {titulo}
        </h1>

        {puedeVerAlertas ? (
          <Link
            href="/alertas"
            aria-label={
              alertasAbiertas > 0
                ? `Alertas: ${alertasAbiertas} sin resolver`
                : 'Alertas'
            }
            className="relative flex size-11 shrink-0 items-center justify-center"
          >
            <Bell aria-hidden className="size-5 text-blanco" strokeWidth={1.75} />
            {alertasAbiertas > 0 && (
              <span
                className={cn(
                  'cifras absolute top-1.5 right-1 min-w-[18px] rounded-full px-1 py-px',
                  'text-center text-[10px] leading-4 font-medium text-blanco',
                  hayCriticas ? 'bg-critico' : 'bg-grafito',
                )}
              >
                {alertasAbiertas > 99 ? '99+' : alertasAbiertas}
              </span>
            )}
          </Link>
        ) : (
          <span className="size-11 shrink-0" />
        )}
      </div>
    </header>
  )
}
