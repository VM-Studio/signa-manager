'use client'

import { useMemo, useState } from 'react'
import { Hammer } from 'lucide-react'
import { EstadoHerramienta } from '@prisma/client'
import type { HerramientaDeLista } from '@/server/herramientas/queries'
import type { ResumenHerramientas } from '@/server/herramientas/queries'
import {
  BarraFiltros,
  Buscador,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  GrillaResumen,
  Insignia,
  Lista,
  NumeroResumen,
} from '@/components/ui'
import { InsigniaEstadoHerramienta } from './estado'
import { numero, plural } from '@/lib/formato'

/* =====================================================================
   Listado de herramientas.

   Los números de arriba filtran la lista al tocarlos: es la forma más
   rápida de contestar "¿qué tenemos disponible?" o "¿qué está vencido?".
   ===================================================================== */

type Foco = 'todas' | 'disponibles' | 'en-obra' | 'reparacion' | 'vencidas'

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

  return (
    <>
      <GrillaResumen columnas={3}>
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
      </GrillaResumen>

      <GrillaResumen columnas={2} className="pt-0">
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

      <BarraFiltros>
        <div className="px-4 pt-3">
          <Buscador
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            alLimpiar={() => setBusqueda('')}
            placeholder="Nombre, código, marca o número de serie…"
          />
        </div>
        <ChipsFiltro
          chips={categorias.map((c) => ({ valor: c.nombre, texto: c.nombre }))}
          activos={cats}
          alCambiar={setCats}
          textoTodos="Todas las categorías"
          multiple
        />
      </BarraFiltros>

      <p className="px-4 py-2 text-menor text-grafito">
        {plural(filtradas.length, 'herramienta')}
      </p>

      {filtradas.length === 0 ? (
        <EstadoVacio
          titulo="No hay herramientas que coincidan"
          mensaje={
            busqueda || cats.length > 0 || foco !== 'todas'
              ? 'Probá con otra búsqueda o sacá algún filtro.'
              : 'Todavía no hay herramientas cargadas. Cargá la primera.'
          }
          icono={<Hammer className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {filtradas.map((h) => (
            <FilaLista
              key={h.id}
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
          ))}
        </Lista>
      )}
    </>
  )
}
