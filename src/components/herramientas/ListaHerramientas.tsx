'use client'

import { useMemo, useState } from 'react'
import { Hammer } from 'lucide-react'
import { EstadoHerramienta } from '@prisma/client'
import type {
  HerramientaDeLista,
  ResumenHerramientas,
} from '@/server/herramientas/queries'
import {
  BarraFiltrosTabla,
  Buscador,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  GrillaResumen,
  Insignia,
  NumeroResumen,
  TablaAdaptable,
  useAtajoBuscar,
  type ColumnaTabla,
} from '@/components/ui'
import { InsigniaEstadoHerramienta } from './estado'
import { fechaCorta, numero, plural } from '@/lib/formato'

/* =====================================================================
   Listado de herramientas.

   Los números de arriba filtran la lista al tocarlos: es la forma más
   rápida de contestar "¿qué tenemos disponible?" o "¿qué está vencido?".

   En celular son filas táctiles de tres líneas. En escritorio, una tabla
   con marca, categoría, responsable y fecha de devolución, que en el
   celular no entran.
   ===================================================================== */

type Foco = 'todas' | 'disponibles' | 'en-obra' | 'reparacion' | 'vencidas'

/** Ordena textos en español y deja los vacíos al final. */
const porTexto = <T,>(valor: (x: T) => string | null) => (a: T, b: T) => {
  const ta = valor(a) ?? ''
  const tb = valor(b) ?? ''
  if (!ta) return 1
  if (!tb) return -1
  return ta.localeCompare(tb, 'es')
}

export function ListaHerramientas({
  herramientas,
  resumen,
  categorias,
  focoInicial = 'todas',
}: {
  herramientas: HerramientaDeLista[]
  resumen: ResumenHerramientas
  categorias: Array<{ id: string; nombre: string }>
  focoInicial?: Foco
}) {
  const [busqueda, setBusqueda] = useState('')
  const [foco, setFoco] = useState<Foco>(focoInicial)
  const [cats, setCats] = useState<string[]>([])
  const campoBusqueda = useAtajoBuscar()

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return herramientas.filter((h) => {
      switch (foco) {
        case 'disponibles':
          if (h.estado !== EstadoHerramienta.DISPONIBLE) return false
          break
        case 'en-obra':
          if (h.estado !== EstadoHerramienta.EN_OBRA) return false
          break
        case 'reparacion':
          if (h.estado !== EstadoHerramienta.EN_REPARACION) return false
          break
        case 'vencidas':
          if (!h.vencida) return false
          break
      }

      if (cats.length > 0 && !cats.includes(h.categoria)) return false
      if (!texto) return true

      return [h.nombre, h.codigo, h.marca, h.ubicacion, h.responsable]
        .filter(Boolean)
        .some((c) => (c as string).toLowerCase().includes(texto))
    })
  }, [herramientas, busqueda, foco, cats])

  const columnas: Array<ColumnaTabla<HerramientaDeLista>> = [
    {
      clave: 'codigo',
      titulo: 'Código',
      ancho: '120px',
      comparar: porTexto((h) => h.codigo),
      celda: (h) => <span className="cifras text-grafito">{h.codigo}</span>,
    },
    {
      clave: 'nombre',
      titulo: 'Herramienta',
      comparar: porTexto((h) => h.nombre),
      celda: (h) => <span className="font-medium text-negro">{h.nombre}</span>,
    },
    {
      clave: 'marca',
      titulo: 'Marca',
      ancho: '140px',
      desde: 'xl',
      comparar: porTexto((h) => h.marca),
      celda: (h) => h.marca ?? <span className="text-acero">—</span>,
    },
    {
      clave: 'categoria',
      titulo: 'Categoría',
      desde: 'lg',
      ancho: '160px',
      comparar: porTexto((h) => h.categoria),
      celda: (h) => <span className="text-grafito">{h.categoria}</span>,
    },
    {
      clave: 'ubicacion',
      titulo: 'Dónde está',
      comparar: porTexto((h) => h.ubicacion),
      celda: (h) => <span className="text-grafito">{h.ubicacion}</span>,
    },
    {
      clave: 'responsable',
      titulo: 'Quién la tiene',
      desde: 'xl',
      comparar: porTexto((h) => h.responsable),
      celda: (h) => h.responsable ?? <span className="text-acero">—</span>,
    },
    {
      clave: 'devolucion',
      titulo: 'Devolución',
      desde: 'lg',
      alineacion: 'derecha',
      ancho: '130px',
      comparar: (a, b) =>
        (a.fechaDevolucionPrevista?.getTime() ?? Infinity) -
        (b.fechaDevolucionPrevista?.getTime() ?? Infinity),
      celda: (h) =>
        h.fechaDevolucionPrevista ? (
          <span className={h.vencida ? 'text-critico' : 'text-grafito'}>
            {fechaCorta(h.fechaDevolucionPrevista)}
          </span>
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'stock',
      titulo: 'Stock',
      desde: 'lg',
      alineacion: 'derecha',
      ancho: '80px',
      comparar: (a, b) => (a.stockTotal ?? -1) - (b.stockTotal ?? -1),
      celda: (h) =>
        h.stockTotal !== null ? (
          numero(h.stockTotal)
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: '150px',
      celda: (h) =>
        h.vencida ? (
          <Insignia tono="critico">
            {plural(h.diasDeAtraso, 'día', 'días')} de atraso
          </Insignia>
        ) : (
          <InsigniaEstadoHerramienta estado={h.estado} />
        ),
    },
  ]

  return (
    <>
      <GrillaResumen columnas={5}>
        <NumeroResumen
          etiqueta="Total"
          valor={numero(resumen.total)}
          activo={foco === 'todas'}
          alTocar={() => setFoco('todas')}
        />
        <NumeroResumen
          etiqueta="Disponibles"
          valor={numero(resumen.disponibles)}
          tono="correcto"
          activo={foco === 'disponibles'}
          alTocar={() => setFoco('disponibles')}
        />
        <NumeroResumen
          etiqueta="En obra"
          valor={numero(resumen.enObra)}
          activo={foco === 'en-obra'}
          alTocar={() => setFoco('en-obra')}
        />
        <NumeroResumen
          etiqueta="En reparación"
          valor={numero(resumen.enReparacion)}
          tono={resumen.enReparacion > 0 ? 'aviso' : 'neutro'}
          activo={foco === 'reparacion'}
          alTocar={() => setFoco('reparacion')}
        />
        <NumeroResumen
          etiqueta="Devolución vencida"
          valor={numero(resumen.vencidas)}
          tono={resumen.vencidas > 0 ? 'critico' : 'neutro'}
          activo={foco === 'vencidas'}
          alTocar={() => setFoco('vencidas')}
        />
      </GrillaResumen>

      <BarraFiltrosTabla
        buscador={
          <Buscador
            ref={campoBusqueda}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            alLimpiar={() => setBusqueda('')}
            placeholder="Nombre, código, marca…"
          />
        }
      >
        <ChipsFiltro
          chips={categorias.map((c) => ({ valor: c.nombre, texto: c.nombre }))}
          activos={cats}
          alCambiar={setCats}
          textoTodos="Todas las categorías"
          multiple
        />
      </BarraFiltrosTabla>

      <p className="px-4 py-2 text-menor text-grafito">
        {plural(filtradas.length, 'herramienta')}
      </p>

      <TablaAdaptable
        datos={filtradas}
        columnas={columnas}
        claveFila={(h) => h.id}
        href={(h) => `/herramientas/${h.id}`}
        tono={(h) => (h.vencida ? 'critico' : 'neutro')}
        ordenInicial={{ clave: 'codigo' }}
        vacio={
          <EstadoVacio
            titulo="No hay herramientas que coincidan"
            mensaje={
              busqueda || cats.length > 0 || foco !== 'todas'
                ? 'Probá con otra búsqueda o sacá algún filtro.'
                : 'Todavía no hay herramientas cargadas. Cargá la primera.'
            }
            icono={<Hammer className="size-8" strokeWidth={1.5} />}
          />
        }
        filaMovil={(h) => (
          <FilaLista
            titulo={h.nombre}
            subtitulo={`${h.codigo}${h.marca ? ` · ${h.marca}` : ''}`}
            detalle={
              [h.ubicacion, h.responsable].filter(Boolean).join(' · ') ||
              undefined
            }
            tono={h.vencida ? 'critico' : 'neutro'}
            derecha={h.stockTotal !== null ? numero(h.stockTotal) : undefined}
            debajoDerecha={
              h.vencida ? (
                <Insignia tono="critico">
                  {plural(h.diasDeAtraso, 'día', 'días')} de atraso
                </Insignia>
              ) : (
                <InsigniaEstadoHerramienta estado={h.estado} />
              )
            }
            href={`/herramientas/${h.id}`}
          />
        )}
      />
    </>
  )
}
