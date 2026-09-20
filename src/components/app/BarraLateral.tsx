'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { ItemNavegacion } from '@/lib/navegacion'
import { Icono } from './Icono'
import { ITEM_CONFIGURACION, type GrupoLateral } from './navegacion-lateral'
import { cn } from '@/lib/cn'

/* =====================================================================
   Barra lateral de escritorio.

   Es el elemento de marca de la app: negra, de alto completo, con el
   logo arriba en tamaño legible. Solo existe de 1024px para arriba; en
   celular y tablet manda la barra inferior.

   Entre 1024 y 1279px arranca angosta (solo íconos) porque a ese ancho
   cada píxel del contenido vale. Se puede contraer y expandir a mano y
   la preferencia queda guardada.

   El ancho vive en --ancho-lateral-actual, que también usa el contenido
   para su margen: no se pueden desincronizar.
   ===================================================================== */

const CLAVE = 'signa_lateral'

type Preferencia = 'contraida' | 'expandida' | null

export function BarraLateral({
  grupos,
  usuario,
  alertasAbiertas,
  hayCriticas,
  cerrarSesion,
}: {
  grupos: GrupoLateral[]
  usuario: { nombre: string; rol: string }
  alertasAbiertas: number
  hayCriticas: boolean
  cerrarSesion: React.ReactNode
}) {
  const ruta = usePathname()

  // null = sin preferencia: mandan los breakpoints, que es lo que ya
  // vino renderizado del servidor.
  const [preferencia, setPreferencia] = useState<Preferencia>(null)

  useEffect(() => {
    let guardada: Preferencia = null
    try {
      const v = localStorage.getItem(CLAVE)
      if (v === 'contraida' || v === 'expandida') guardada = v
    } catch {
      // Sin almacenamiento se usa el ancho por defecto del breakpoint.
    }
    setPreferencia(guardada)
    if (guardada) document.documentElement.dataset.lateral = guardada
  }, [])

  const alternar = () => {
    // Sin preferencia previa hay que saber de qué ancho se viene, y eso
    // lo sabe el navegador: por debajo de 1280px arranca angosta.
    const actual: Exclude<Preferencia, null> =
      preferencia ??
      (window.matchMedia('(min-width: 1280px)').matches
        ? 'expandida'
        : 'contraida')

    const nueva = actual === 'contraida' ? 'expandida' : 'contraida'

    setPreferencia(nueva)
    document.documentElement.dataset.lateral = nueva
    try {
      localStorage.setItem(CLAVE, nueva)
    } catch {
      // La preferencia se pierde al recargar, pero la app anda igual.
    }
  }

  /*
   * Qué se ve del texto.
   *
   * Sin preferencia: oculto hasta 1279px y visible desde 1280px, por
   * CSS puro. Con preferencia: lo que eligió la persona, en cualquier
   * ancho de escritorio.
   */
  const textoVisible =
    preferencia === null
      ? 'hidden xl:block'
      : preferencia === 'contraida'
        ? 'hidden'
        : 'block'

  const angosta = preferencia === 'contraida'

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        'sobre-negro fixed bottom-0 left-0 z-40 hidden shrink-0 flex-col bg-negro lg:flex',
        // Debajo de la franja de demostración, cuando está.
        'top-[var(--alto-franja,0px)]',
        'w-[var(--ancho-lateral-actual)] transition-[width] duration-150',
      )}
    >
      {/* ---------------------------- logo ---------------------------- */}
      <div className="flex h-[var(--alto-barra-superior)] shrink-0 items-center border-b border-carbon px-4">
        <Link
          href="/inicio"
          aria-label="Ir al inicio"
          className="flex min-w-0 items-center"
        >
          <Image
            src="/signalogo.png"
            alt="Signa"
            width={192}
            height={108}
            priority
            className={cn(
              'h-auto object-contain object-left',
              preferencia === null
                ? 'w-[36px] xl:w-[108px]'
                : angosta
                  ? 'w-[36px]'
                  : 'w-[108px]',
            )}
          />
        </Link>
      </div>

      {/* ------------------------- navegación ------------------------- */}
      <nav className="scroll-fino flex-1 overflow-y-auto py-3">
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo ?? i} className={i > 0 ? 'mt-5' : undefined}>
            {grupo.titulo && (
              <p
                className={cn(
                  'px-4 pb-1.5 text-micro font-medium tracking-wide text-grafito',
                  textoVisible,
                )}
              >
                {grupo.titulo}
              </p>
            )}
            <ul>
              {grupo.items.map((item) => (
                <li key={item.href}>
                  <ItemLateral
                    item={item}
                    activo={
                      ruta === item.href || ruta.startsWith(`${item.href}/`)
                    }
                    textoVisible={textoVisible}
                    contador={
                      item.href === '/alertas' && alertasAbiertas > 0
                        ? alertasAbiertas
                        : undefined
                    }
                    contadorCritico={hayCriticas}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* --------------------------- el pie ---------------------------

          Compacto a propósito: en un portátil de 13" la barra tiene poco
          más de 700px de alto y si el pie se estira, los últimos ítems de
          la navegación quedan fuera de la pantalla. Quién sos y cómo
          salir entran en una sola fila. */}
      <div className="shrink-0 border-t border-carbon">
        <ItemLateral
          item={ITEM_CONFIGURACION}
          activo={ruta === '/mas' || ruta.startsWith('/mas/')}
          textoVisible={textoVisible}
        />

        <div
          className={cn(
            'flex items-center gap-1 border-t border-carbon p-2',
            angosta && 'flex-col',
          )}
        >
          <div className={cn('min-w-0 flex-1 px-2', textoVisible)}>
            <p className="truncate text-chico font-medium text-blanco">
              {usuario.nombre}
            </p>
            <p className="truncate text-menor text-acero">{usuario.rol}</p>
          </div>

          {cerrarSesion}

          <button
            type="button"
            onClick={alternar}
            aria-label={
              angosta ? 'Expandir la barra lateral' : 'Contraer la barra lateral'
            }
            title={angosta ? 'Expandir' : 'Contraer'}
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-acero transition-colors hover:bg-carbon hover:text-blanco"
          >
            {angosta ? (
              <PanelLeftOpen aria-hidden className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden className="size-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}

function ItemLateral({
  item,
  activo,
  textoVisible,
  contador,
  contadorCritico = false,
}: {
  item: ItemNavegacion
  activo: boolean
  textoVisible: string
  contador?: number
  contadorCritico?: boolean
}) {
  const soloIconos = textoVisible === 'hidden'

  return (
    <Link
      href={item.href}
      aria-current={activo ? 'page' : undefined}
      className={cn(
        'item-lateral relative flex min-h-[var(--toque-minimo)] items-center gap-3 px-4',
        'transition-colors',
        activo
          ? 'bg-carbon text-blanco'
          : 'text-acero hover:bg-carbon hover:text-blanco',
      )}
    >
      {/* La línea blanca a la izquierda del activo. */}
      {activo && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-blanco" />
      )}

      <span className="relative flex shrink-0 items-center">
        <Icono
          nombre={item.icono}
          className="size-5"
          strokeWidth={activo ? 2 : 1.5}
        />
        {/* Con la barra angosta el número no entra: queda un punto. */}
        {contador !== undefined && (
          <span
            aria-hidden
            className={cn(
              'absolute -top-0.5 -right-1.5 size-2 rounded-full',
              soloIconos ? 'block' : 'block xl:hidden',
              contadorCritico ? 'bg-critico' : 'bg-acero',
            )}
          />
        )}
      </span>

      <span className={cn('flex-1 truncate text-base', textoVisible)}>
        {item.texto}
      </span>

      {contador !== undefined && (
        <span
          className={cn(
            'cifras rounded-full px-1.5 py-px text-micro font-medium text-blanco',
            textoVisible,
            contadorCritico ? 'bg-critico' : 'bg-grafito',
          )}
        >
          {contador > 99 ? '99+' : contador}
        </span>
      )}

      {/* Con la barra angosta, el nombre aparece al pasar el mouse. */}
      {soloIconos && (
        <span className="globo-lateral z-50 rounded-[var(--radius-control)] bg-carbon px-2 py-1 text-menor text-blanco shadow-none">
          {item.texto}
        </span>
      )}
    </Link>
  )
}
