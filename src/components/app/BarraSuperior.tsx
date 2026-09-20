'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight } from 'lucide-react'
import { tituloDeRuta } from '@/lib/navegacion'
import { pestanasDeRuta, type PestanaModulo } from './navegacion-lateral'
import { useEncabezado } from './ProveedorEncabezado'
import { cn } from '@/lib/cn'

/* =====================================================================
   Barra superior de escritorio.

   Clara, dentro del área de contenido, al lado de la barra lateral
   negra. Lleva el título de la pantalla, la miga de pan cuando hay
   niveles (Vehículos / AB123CD), las acciones principales de la
   pantalla y la campana de alertas.

   Solo existe de 1024px para arriba: en celular y tablet mandan el
   header negro y la barra inferior.
   ===================================================================== */

export function BarraSuperior({
  alertasAbiertas,
  hayCriticas,
  puedeVerAlertas,
  permisos,
}: {
  alertasAbiertas: number
  hayCriticas: boolean
  puedeVerAlertas: boolean
  /** Los permisos que tiene la sesión, para filtrar las pestañas. */
  permisos: string[]
}) {
  const ruta = usePathname()
  const { encabezado } = useEncabezado()

  // Mientras la pantalla no publicó su encabezado, el título sale de la
  // ruta: la barra nunca queda vacía ni parpadea.
  const titulo = encabezado?.titulo ?? tituloDeRuta(ruta)

  const migas = armarMigas(ruta, titulo)
  const pestanas = (pestanasDeRuta(ruta) ?? []).filter(
    (p) => !p.permiso || permisos.includes(p.permiso),
  )

  return (
    <div className="sticky top-0 z-30 hidden border-b border-niebla bg-blanco lg:block">
      <div className="flex min-h-[var(--alto-barra-superior)] items-center gap-4 px-[var(--margen-escritorio)] py-2">
        <div className="min-w-0 flex-1">
          {migas.length > 0 && (
            <nav aria-label="Ruta" className="flex items-center gap-1 pb-0.5">
              {migas.map((m) => (
                <span key={m.href} className="flex items-center gap-1">
                  <Link
                    href={m.href}
                    className="truncate text-menor text-metadato hover:text-negro hover:underline"
                  >
                    {m.texto}
                  </Link>
                  <ChevronRight
                    aria-hidden
                    className="size-3 shrink-0 text-acero"
                  />
                </span>
              ))}
            </nav>
          )}

          <h1 className="truncate text-titulo font-medium text-negro">
            {titulo}
          </h1>
          {encabezado?.subtitulo && (
            <p className="truncate text-menor text-grafito">
              {encabezado.subtitulo}
            </p>
          )}
        </div>

        {encabezado?.acciones && (
          <div className="flex shrink-0 items-center gap-2">
            {encabezado.acciones}
          </div>
        )}

        {puedeVerAlertas && (
          <Link
            href="/alertas"
            aria-label={
              alertasAbiertas > 0
                ? `Alertas: ${alertasAbiertas} sin resolver`
                : 'Alertas'
            }
            className="relative flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-grafito hover:bg-hueso hover:text-negro"
          >
            <Bell aria-hidden className="size-5" strokeWidth={1.75} />
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
        )}
      </div>

      {pestanas.length > 0 && (
        <PestanasModulo pestanas={pestanas} ruta={ruta} />
      )}
    </div>
  )
}

function PestanasModulo({
  pestanas,
  ruta,
}: {
  pestanas: PestanaModulo[]
  ruta: string
}) {
  return (
    <nav
      aria-label="Secciones del módulo"
      className="scroll-lateral sin-barra flex gap-1 px-[var(--margen-escritorio)]"
    >
      {pestanas.map((p) => {
        const activa = p.exacta
          ? ruta === p.href
          : ruta === p.href || ruta.startsWith(`${p.href}/`)

        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[40px] shrink-0 items-center px-3 text-base whitespace-nowrap',
              'transition-colors',
              activa
                ? 'font-medium text-negro'
                : 'text-grafito hover:text-negro',
            )}
          >
            {p.texto}
            {activa && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] bg-negro"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

/* ---------------------------------------------------------------------
   La miga de pan.

   Sale de la propia ruta: /vehiculos/abc123 muestra "Vehículos /" y el
   título de la pantalla al lado. Solo se arma cuando hay más de un
   nivel; en la raíz de un módulo no aporta nada.
   --------------------------------------------------------------------- */

function armarMigas(
  ruta: string,
  tituloActual: string,
): Array<{ href: string; texto: string }> {
  const partes = ruta.split('/').filter(Boolean)
  if (partes.length < 2) return []

  const migas: Array<{ href: string; texto: string }> = []
  let acumulado = ''

  // El último segmento es la pantalla actual: ese no va como enlace.
  for (const parte of partes.slice(0, -1)) {
    acumulado += `/${parte}`
    const texto = tituloDeRuta(acumulado)

    // Un id de la base no tiene título propio: tituloDeRuta devuelve el
    // del padre y repetirlo no aporta nada.
    const repetido = migas.at(-1)?.texto === texto
    if (!repetido && texto !== 'Signa' && texto !== tituloActual) {
      migas.push({ href: acumulado, texto })
    }
  }

  return migas
}
