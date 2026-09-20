'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Boton } from './Boton'

/* =====================================================================
   El listado de toda la app.

   Un solo componente para los dos mundos:

   - En celular, las filas táctiles de siempre: tres líneas, un dato a la
     derecha y la insignia de estado debajo. Se toca con guantes.
   - En escritorio, una tabla de verdad: encabezados que ordenan, fila
     entera cliqueable, números a la derecha con cifras tabulares y
     tantas columnas como entren. El ancho se aprovecha mostrando MÁS
     datos, no estirando los mismos tres.

   Los datos son los mismos y llegan una sola vez: lo que cambia es cómo
   se dibujan.
   ===================================================================== */

export interface ColumnaTabla<T> {
  /** Identifica la columna para el orden. */
  clave: string
  titulo: string
  celda: (fila: T) => ReactNode
  /** Montos, cantidades y fechas van a la derecha. */
  alineacion?: 'izquierda' | 'derecha' | 'centro'
  /** Ancho fijo, cuando el contenido es corto y conocido. */
  ancho?: string
  /**
   * Cómo se ordena por esta columna. Sin esto, el encabezado no ordena:
   * hay columnas (una insignia, un botón) donde ordenar no significa
   * nada.
   */
  comparar?: (a: T, b: T) => number
  /**
   * Con true, la columna desaparece en tablet y solo se ve de 1280px
   * para arriba. Para lo secundario, que en 1024px aprieta.
   */
  soloAncho?: boolean
}

export interface TablaAdaptableProps<T> {
  datos: T[]
  columnas: Array<ColumnaTabla<T>>
  claveFila: (fila: T) => string
  /** La fila táctil de celular. Normalmente un <FilaLista>. */
  filaMovil: (fila: T) => ReactNode
  /** A dónde lleva la fila al hacer clic. */
  href?: (fila: T) => string
  alTocarFila?: (fila: T) => void
  /** Barra fina de color al costado, para marcar filas críticas. */
  tono?: (fila: T) => 'neutro' | 'correcto' | 'aviso' | 'critico'
  /** Qué mostrar cuando no hay nada. */
  vacio?: ReactNode
  /** Cuántas filas se muestran de entrada. El resto, con "Ver más". */
  porPagina?: number
  /** Orden inicial: clave de columna y dirección. */
  ordenInicial?: { clave: string; descendente?: boolean }
  className?: string
}

const tonosBarra = {
  neutro: '',
  correcto: 'border-l-2 border-l-correcto',
  aviso: 'border-l-2 border-l-aviso',
  critico: 'border-l-2 border-l-critico',
}

export function TablaAdaptable<T>({
  datos,
  columnas,
  claveFila,
  filaMovil,
  href,
  alTocarFila,
  tono,
  vacio,
  porPagina = 50,
  ordenInicial,
  className,
}: TablaAdaptableProps<T>) {
  const router = useRouter()
  const [orden, setOrden] = useState<{ clave: string; descendente: boolean } | null>(
    ordenInicial
      ? { clave: ordenInicial.clave, descendente: ordenInicial.descendente ?? false }
      : null,
  )
  const [visibles, setVisibles] = useState(porPagina)

  // Si cambian los filtros de arriba, se vuelve a empezar por el principio.
  useEffect(() => {
    setVisibles(porPagina)
  }, [datos.length, porPagina])

  const ordenados = useMemo(() => {
    if (!orden) return datos
    const columna = columnas.find((c) => c.clave === orden.clave)
    if (!columna?.comparar) return datos

    // Copia: ordenar in situ mutaría el array que llegó por props.
    const copia = [...datos]
    copia.sort(columna.comparar)
    return orden.descendente ? copia.reverse() : copia
  }, [datos, columnas, orden])

  const mostrados = ordenados.slice(0, visibles)
  const faltan = ordenados.length - mostrados.length

  const alOrdenar = (clave: string) => {
    setOrden((previo) =>
      previo?.clave === clave
        ? { clave, descendente: !previo.descendente }
        : { clave, descendente: false },
    )
  }

  const irA = (fila: T) => {
    if (alTocarFila) alTocarFila(fila)
    else if (href) router.push(href(fila))
  }

  if (datos.length === 0) return <>{vacio}</>

  return (
    <div className={className}>
      {/* ------------------------- CELULAR ------------------------- */}
      <div className="lg:hidden">
        <ul className="border-y border-niebla bg-blanco">
          {mostrados.map((fila) => (
            <li key={claveFila(fila)} className="border-b border-niebla last:border-b-0">
              {filaMovil(fila)}
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------ ESCRITORIO ------------------------ */}
      <div className="scroll-fino hidden overflow-x-auto border-y border-niebla bg-blanco lg:block">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-niebla">
              {columnas.map((c) => {
                const activa = orden?.clave === c.clave
                const ordenable = Boolean(c.comparar)

                return (
                  <th
                    key={c.clave}
                    scope="col"
                    style={c.ancho ? { width: c.ancho } : undefined}
                    className={cn(
                      'bg-hueso px-3 py-2 text-menor font-medium text-grafito',
                      c.alineacion === 'derecha' && 'text-right',
                      c.alineacion === 'centro' && 'text-center',
                      !c.alineacion && 'text-left',
                      c.soloAncho && 'hidden xl:table-cell',
                    )}
                    aria-sort={
                      activa
                        ? orden.descendente
                          ? 'descending'
                          : 'ascending'
                        : ordenable
                          ? 'none'
                          : undefined
                    }
                  >
                    {ordenable ? (
                      <button
                        type="button"
                        onClick={() => alOrdenar(c.clave)}
                        className={cn(
                          'inline-flex min-h-[28px] items-center gap-1 rounded-[4px] px-1 -mx-1',
                          'transition-colors hover:text-negro',
                          c.alineacion === 'derecha' && 'flex-row-reverse',
                          activa && 'text-negro',
                        )}
                      >
                        {c.titulo}
                        {activa ? (
                          orden.descendente ? (
                            <ChevronDown aria-hidden className="size-3.5" />
                          ) : (
                            <ChevronUp aria-hidden className="size-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown
                            aria-hidden
                            className="size-3.5 text-acero"
                          />
                        )}
                      </button>
                    ) : (
                      c.titulo
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {mostrados.map((fila) => {
              const cliqueable = Boolean(href || alTocarFila)
              const t = tono?.(fila) ?? 'neutro'

              return (
                <tr
                  key={claveFila(fila)}
                  onClick={cliqueable ? () => irA(fila) : undefined}
                  onKeyDown={
                    cliqueable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            irA(fila)
                          }
                        }
                      : undefined
                  }
                  tabIndex={cliqueable ? 0 : undefined}
                  role={cliqueable ? 'link' : undefined}
                  className={cn(
                    'fila-tabla border-b border-niebla last:border-b-0',
                    cliqueable && 'cursor-pointer',
                    tonosBarra[t],
                  )}
                >
                  {columnas.map((c) => (
                    <td
                      key={c.clave}
                      className={cn(
                        'px-3 py-2.5 align-middle',
                        c.alineacion === 'derecha' && 'cifras text-right',
                        c.alineacion === 'centro' && 'text-center',
                        c.soloAncho && 'hidden xl:table-cell',
                      )}
                    >
                      {c.celda(fila)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* --------------------- carga progresiva --------------------- */}
      {faltan > 0 && (
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <p className="text-menor text-metadato">
            {mostrados.length} de {ordenados.length}
          </p>
          <Boton
            tamano="chico"
            variante="secundario"
            onClick={() => setVisibles((v) => v + porPagina)}
          >
            Ver {Math.min(faltan, porPagina)} más
          </Boton>
        </div>
      )}
    </div>
  )
}

/* =====================================================================
   Barra de filtros de escritorio.

   En celular los filtros son chips que se desplazan de costado. En
   escritorio entran todos en una línea, con el buscador a la izquierda.
   ===================================================================== */

export function BarraFiltrosTabla({
  buscador,
  children,
  acciones,
  className,
}: {
  buscador?: ReactNode
  children?: ReactNode
  acciones?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-b border-niebla bg-hueso px-4 py-2.5',
        'lg:flex lg:items-center lg:gap-3',
        className,
      )}
    >
      {buscador && <div className="lg:w-[320px] lg:shrink-0">{buscador}</div>}
      {children && (
        <div className="scroll-lateral sin-barra mt-2 flex gap-2 lg:mt-0 lg:flex-1 lg:flex-wrap">
          {children}
        </div>
      )}
      {acciones && (
        <div className="mt-2 flex shrink-0 gap-2 lg:mt-0">{acciones}</div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------
   La barra "/" enfoca el buscador de la pantalla.

   Es el atajo que espera cualquiera que use un sistema de gestión todo
   el día. Se ignora cuando ya se está escribiendo en un campo, si no
   sería imposible tipear una barra.
   --------------------------------------------------------------------- */

export function useAtajoBuscar() {
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return

      const activo = document.activeElement
      const escribiendo =
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        activo instanceof HTMLSelectElement ||
        (activo instanceof HTMLElement && activo.isContentEditable)
      if (escribiendo) return

      e.preventDefault()
      campo.current?.focus()
      campo.current?.select()
    }

    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [])

  return campo
}
