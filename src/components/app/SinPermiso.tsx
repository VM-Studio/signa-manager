import Link from 'next/link'
import { Lock } from 'lucide-react'
import { EncabezadoPantalla } from '@/components/ui'

/**
 * Pantalla de "esto no es para vos".
 * Es lo que se muestra cuando alguien llega a una sección que su rol no
 * puede ver: cambiando la URL a mano, por un enlace viejo o por un
 * mensaje que le reenviaron.
 */
export function SinPermiso({
  titulo = 'Sin permiso',
  mensaje = 'Esta sección no está habilitada para tu rol. Si creés que tendría que estarlo, hablá con administración.',
}: {
  titulo?: string
  mensaje?: string
}) {
  return (
    <>
      <EncabezadoPantalla titulo={titulo} sinVolver />
      <div className="flex flex-col items-center justify-center gap-3 px-8 py-14 text-center">
        <Lock aria-hidden className="size-8 text-acero" strokeWidth={1.5} />
        <div>
          <p className="text-base font-medium text-negro">No podés entrar acá</p>
          <p className="mt-1 text-chico text-grafito">{mensaje}</p>
        </div>
        <Link
          href="/inicio"
          className="mt-1 inline-flex min-h-[40px] items-center rounded-[var(--radius-control)] border border-niebla bg-blanco px-3 text-menor font-medium text-negro active:bg-hueso"
        >
          Volver al inicio
        </Link>
      </div>
    </>
  )
}
