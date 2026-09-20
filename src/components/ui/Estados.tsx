import Link from 'next/link'
import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Boton } from './Boton'

/* =====================================================================
   Estado vacío, esqueleto de carga y estado de error.
   Toda lista de la app tiene los tres (regla del prompt 10).
   ===================================================================== */

export interface EstadoVacioProps {
  titulo: string
  /** Siempre decir qué hacer, no solo que no hay nada. */
  mensaje: string
  icono?: ReactNode
  accion?: { texto: string; href?: string; alTocar?: () => void }
  className?: string
}

export function EstadoVacio({
  titulo,
  mensaje,
  icono,
  accion,
  className,
}: EstadoVacioProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-8 py-14 text-center',
        className,
      )}
    >
      <span aria-hidden className="text-acero">
        {icono ?? <Inbox className="size-8" strokeWidth={1.5} />}
      </span>
      <div>
        <p className="text-base font-medium text-negro">{titulo}</p>
        <p className="mt-1 text-chico text-grafito">{mensaje}</p>
      </div>
      {accion &&
        (accion.href ? (
          <Link
            href={accion.href}
            className="mt-1 inline-flex min-h-[40px] items-center rounded-[var(--radius-control)] border border-niebla bg-blanco px-3 text-menor font-medium text-negro active:bg-hueso"
          >
            {accion.texto}
          </Link>
        ) : (
          <Boton
            variante="secundario"
            tamano="chico"
            onClick={accion.alTocar}
            className="mt-1"
          >
            {accion.texto}
          </Boton>
        ))}
    </div>
  )
}

export interface EstadoErrorProps {
  titulo?: string
  mensaje: string
  alReintentar?: () => void
  className?: string
}

export function EstadoError({
  titulo = 'No se pudo cargar',
  mensaje,
  alReintentar,
  className,
}: EstadoErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-8 py-14 text-center',
        className,
      )}
      role="alert"
    >
      <AlertTriangle aria-hidden className="size-8 text-critico" strokeWidth={1.5} />
      <div>
        <p className="text-base font-medium text-negro">{titulo}</p>
        <p className="mt-1 text-chico text-grafito">{mensaje}</p>
      </div>
      {alReintentar && (
        <Boton variante="secundario" tamano="chico" onClick={alReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  )
}

/* ------------------------------ ESQUELETOS ------------------------------ */

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('rounded-[var(--radius-control)] bg-niebla', className)}
      style={{ animation: 'latido 1.4s ease-in-out infinite' }}
    />
  )
}

/** Esqueleto con la forma de una lista de filas. */
export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div
      className="divide-y divide-niebla border-y border-niebla bg-blanco"
      role="status"
      aria-label="Cargando"
    >
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-3.5 w-1/2" />
            <Esqueleto className="h-3 w-3/4" />
          </div>
          <Esqueleto className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Esqueleto con la forma de una tarjeta de resumen. */
export function EsqueletoTarjeta({ className }: { className?: string }) {
  return (
    <div
      className={cn('space-y-2 rounded-[var(--radius-panel)] border border-niebla bg-blanco p-4', className)}
      role="status"
      aria-label="Cargando"
    >
      <Esqueleto className="h-3 w-24" />
      <Esqueleto className="h-7 w-32" />
    </div>
  )
}
