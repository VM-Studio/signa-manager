import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* =====================================================================
   La estructura de toda ficha de detalle: herramienta, empleado,
   subcontratista, vehículo y obra.

   - En celular, una columna: primero el panel con quién o qué es, su
     estado y los botones, y debajo las pestañas con el detalle.
   - En escritorio, dos columnas: el detalle usa todo el ancho que le
     queda y el panel se va a la derecha en 360px, pegado arriba, así
     sigue a la vista mientras se recorre una lista larga de
     movimientos.

   Es el mismo orden en el DOM en los dos casos, que es el orden en que
   conviene leerlo: qué es, y después el detalle.
   ===================================================================== */

export function FichaDosColumnas({
  panel,
  children,
  className,
}: {
  /** Foto, datos clave, estado y acciones. */
  panel: ReactNode
  /** Pestañas y su contenido. */
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'lg:flex lg:items-start lg:gap-6 lg:pt-4',
        className,
      )}
    >
      {/* El panel: primero en celular, a la derecha en escritorio. */}
      <aside
        className={cn(
          'lg:order-2 lg:w-[var(--ancho-panel-ficha)] lg:shrink-0',
          // Queda a la vista al desplazarse. El top deja pasar la barra
          // superior, que también es pegajosa.
          'lg:sticky lg:top-[calc(var(--alto-barra-superior)+16px)]',
          'lg:rounded-[var(--radius-panel)] lg:border lg:border-niebla lg:bg-blanco',
          'lg:overflow-hidden',
        )}
      >
        {panel}
      </aside>

      <div className="min-w-0 lg:order-1 lg:flex-1">{children}</div>
    </div>
  )
}
