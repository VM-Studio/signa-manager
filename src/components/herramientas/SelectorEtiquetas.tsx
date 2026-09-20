'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Printer } from 'lucide-react'
import {
  Boton,
  Buscador,
  BarraFiltros,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  Lista,
  TituloSeccion,
} from '@/components/ui'
import { plural } from '@/lib/formato'

export interface HerramientaEtiqueta {
  id: string
  codigo: string
  nombre: string
  marca: string | null
  categoria: string
  qr: string
}

/* =====================================================================
   Hoja A4 de etiquetas QR.

   En pantalla se eligen las herramientas; al imprimir se oculta todo lo
   demás y queda una grilla de 3×8 que entra justa en una A4.
   ===================================================================== */

export function SelectorEtiquetas({
  herramientas,
  categorias,
  preseleccionadas,
}: {
  herramientas: HerramientaEtiqueta[]
  categorias: string[]
  preseleccionadas: string[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [elegidas, setElegidas] = useState<string[]>(preseleccionadas)

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return herramientas.filter((h) => {
      if (cats.length > 0 && !cats.includes(h.categoria)) return false
      if (!texto) return true
      return [h.nombre, h.codigo, h.marca]
        .filter(Boolean)
        .some((c) => (c as string).toLowerCase().includes(texto))
    })
  }, [herramientas, busqueda, cats])

  const paraImprimir = herramientas.filter((h) => elegidas.includes(h.id))

  const alternar = (id: string) =>
    setElegidas((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <>
      <div className="no-imprimir">
        <BarraFiltros>
          <div className="px-4 pt-3">
            <Buscador
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              alLimpiar={() => setBusqueda('')}
              placeholder="Buscar herramienta…"
            />
          </div>
          <ChipsFiltro
            chips={categorias.map((c) => ({ valor: c, texto: c }))}
            activos={cats}
            alCambiar={setCats}
            textoTodos="Todas"
            multiple
          />
        </BarraFiltros>

        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <p className="text-menor text-grafito">
            {elegidas.length === 0
              ? 'Elegí las herramientas'
              : `${plural(elegidas.length, 'etiqueta')} · ${Math.ceil(elegidas.length / 24)} hoja${Math.ceil(elegidas.length / 24) === 1 ? '' : 's'}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setElegidas(filtradas.map((h) => h.id))}
              className="text-menor text-grafito underline"
            >
              Todas
            </button>
            {elegidas.length > 0 && (
              <button
                type="button"
                onClick={() => setElegidas([])}
                className="text-menor text-grafito underline"
              >
                Ninguna
              </button>
            )}
          </div>
        </div>

        {filtradas.length === 0 ? (
          <EstadoVacio
            titulo="No hay herramientas que coincidan"
            mensaje="Probá con otra búsqueda."
          />
        ) : (
          <Lista>
            {filtradas.map((h) => {
              const elegida = elegidas.includes(h.id)
              return (
                <FilaLista
                  key={h.id}
                  titulo={h.nombre}
                  subtitulo={`${h.codigo}${h.marca ? ` · ${h.marca}` : ''}`}
                  izquierda={
                    <span
                      aria-hidden
                      className={`flex size-6 shrink-0 items-center justify-center rounded-[4px] border-2 ${
                        elegida ? 'border-negro bg-negro' : 'border-acero'
                      }`}
                    >
                      {elegida && (
                        <span className="block size-2 rounded-[1px] bg-blanco" />
                      )}
                    </span>
                  }
                  alTocar={() => alternar(h.id)}
                  flecha={false}
                />
              )
            })}
          </Lista>
        )}

        {elegidas.length > 0 && (
          <div className="px-4 pt-5">
            <Boton
              ancho
              tamano="grande"
              iconoIzquierda={<Printer aria-hidden className="size-5" />}
              onClick={() => window.print()}
            >
              Imprimir {plural(elegidas.length, 'etiqueta')}
            </Boton>
            <p className="mt-2 text-center text-menor text-acero">
              Entran 24 por hoja A4. Imprimí sin márgenes y sin escalar.
            </p>
          </div>
        )}
      </div>

      {/* La hoja: en pantalla se ve como una vista previa, al imprimir es
          lo único que sale. */}
      {paraImprimir.length > 0 && (
        <>
          <div className="no-imprimir">
            <TituloSeccion>Vista previa</TituloSeccion>
          </div>
          <div className="hoja-etiquetas bg-blanco px-4 pb-8">
            <div className="grid grid-cols-3 gap-[2mm]">
              {paraImprimir.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col items-center justify-center gap-1 border border-niebla p-[2mm] text-center"
                  style={{ breakInside: 'avoid' }}
                >
                  <Image
                    src={h.qr}
                    alt=""
                    width={120}
                    height={120}
                    unoptimized
                    className="size-[22mm]"
                  />
                  <span className="cifras text-[9pt] leading-tight font-bold text-negro">
                    {h.codigo}
                  </span>
                  <span className="line-clamp-2 text-[7pt] leading-tight text-grafito">
                    {h.nombre}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          body {
            background: #fff;
          }
          .hoja-etiquetas {
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  )
}
