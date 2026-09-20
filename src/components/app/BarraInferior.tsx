'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ItemNavegacion } from '@/lib/navegacion'
import { Icono } from './Icono'
import { cn } from '@/lib/cn'

/* =====================================================================
   Barra inferior negra fija con hasta 5 accesos. El activo en blanco,
   los demás en gris. Los ítems que el rol no puede ver no aparecen.
   ===================================================================== */

export function BarraInferior({ items }: { items: ItemNavegacion[] }) {
  const ruta = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="pad-abajo-seguro sobre-negro fixed inset-x-0 bottom-0 z-30 bg-negro"
    >
      <div className="mx-auto flex h-[var(--alto-barra-inferior)] max-w-[var(--ancho-operativo)] items-stretch">
        {items.map((item) => {
          // "Más" también queda activo en sus pantallas hijas.
          const activo =
            ruta === item.href || ruta.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 px-1',
                'transition-colors',
                activo ? 'text-blanco' : 'text-acero',
              )}
            >
              <Icono
                nombre={item.icono}
                className="size-5"
                strokeWidth={activo ? 2 : 1.5}
              />
              <span className="text-micro leading-none">{item.texto}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
