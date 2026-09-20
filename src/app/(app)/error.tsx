'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Boton } from '@/components/ui'

/**
 * Red de seguridad de toda la app: si algo falla en el servidor o en el
 * cliente, se muestra esto y no una pantalla en blanco.
 */
export default function ErrorApp({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[signa]', error)
  }, [error])

  // Los errores de permiso y de sesión tienen un mensaje escrito para
  // que lo lea una persona; el resto no, y se reemplaza.
  const esDeNegocio =
    error.message.startsWith('No tenés permiso') ||
    error.message.startsWith('Necesitás iniciar sesión') ||
    error.message.startsWith('Esa obra no está')

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-8 text-center">
      <AlertTriangle aria-hidden className="size-8 text-critico" strokeWidth={1.5} />
      <div>
        <p className="text-titulo font-medium text-negro">
          {esDeNegocio ? 'No se pudo abrir' : 'Algo salió mal'}
        </p>
        <p className="mt-1 text-chico text-grafito">
          {esDeNegocio
            ? error.message
            : 'No pudimos cargar esta pantalla. Probá de nuevo; si sigue igual, avisá a administración.'}
        </p>
        {error.digest && (
          <p className="mt-2 text-micro text-acero">Código: {error.digest}</p>
        )}
      </div>
      <div className="flex w-full max-w-[280px] flex-col gap-2">
        <Boton ancho onClick={reset}>
          Probar de nuevo
        </Boton>
        <Link
          href="/inicio"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[var(--radius-control)] border border-niebla bg-blanco text-base font-medium text-negro active:bg-hueso"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
