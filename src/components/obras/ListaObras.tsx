'use client'

import { useMemo, useState } from 'react'
import { Building2, MapPin } from 'lucide-react'
import { EstadoObra } from '@prisma/client'
import type { ObraDeLista } from '@/server/obras/queries'
import {
  BarraFiltrosTabla,
  Buscador,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  TablaAdaptable,
  useAtajoBuscar,
  type ColumnaTabla,
} from '@/components/ui'
import { InsigniaEstadoObra } from './EstadoObra'
import { plural } from '@/lib/formato'

/* =====================================================================
   Listado de obras con buscador y filtros.
   El filtrado es en el cliente a propósito: son once obras, no hace
   falta ir al servidor por cada letra que se escribe.
   ===================================================================== */

export function ListaObras({
  obras,
  unidades,
  conteoPorEstado,
}: {
  obras: ObraDeLista[]
  unidades: Array<{ id: string; nombre: string }>
  conteoPorEstado: Record<EstadoObra, number>
}) {
  const [busqueda, setBusqueda] = useState('')
  const [estados, setEstados] = useState<string[]>([])
  const [unidadesElegidas, setUnidades] = useState<string[]>([])
  const campoBusqueda = useAtajoBuscar()

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return obras.filter((o) => {
      if (estados.length > 0 && !estados.includes(o.estado)) return false
      if (
        unidadesElegidas.length > 0 &&
        !unidadesElegidas.includes(o.unidadNegocio)
      ) {
        return false
      }
      if (!texto) return true

      return [o.codigo, o.nombre, o.cliente, o.localidad, o.jefeObra]
        .filter(Boolean)
        .some((campo) => (campo as string).toLowerCase().includes(texto))
    })
  }, [obras, busqueda, estados, unidadesElegidas])

  const chipsEstado = (
    [
      ['EN_CURSO', 'En curso'],
      ['PLANIFICADA', 'Planificadas'],
      ['PAUSADA', 'Pausadas'],
      ['FINALIZADA', 'Finalizadas'],
    ] as Array<[EstadoObra, string]>
  )
    .filter(([valor]) => conteoPorEstado[valor] > 0)
    .map(([valor, texto]) => ({
      valor,
      texto,
      cantidad: conteoPorEstado[valor],
    }))

  const columnas: Array<ColumnaTabla<ObraDeLista>> = [
    {
      clave: 'codigo',
      titulo: 'Código',
      ancho: '140px',
      comparar: (a, b) => a.codigo.localeCompare(b.codigo, 'es'),
      celda: (o) => <span className="cifras text-grafito">{o.codigo}</span>,
    },
    {
      clave: 'nombre',
      titulo: 'Obra',
      comparar: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      celda: (o) => (
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-negro">{o.nombre}</span>
          {o.esInterior && (
            <span
              title="En el interior del país"
              className="flex items-center gap-0.5 text-micro text-metadato"
            >
              <MapPin aria-hidden className="size-3" />
              Interior
            </span>
          )}
        </span>
      ),
    },
    {
      clave: 'unidad',
      titulo: 'Unidad de negocio',
      ancho: '200px',
      comparar: (a, b) => a.unidadNegocio.localeCompare(b.unidadNegocio, 'es'),
      celda: (o) => <span className="text-grafito">{o.unidadNegocio}</span>,
    },
    {
      clave: 'cliente',
      titulo: 'Cliente',
      soloAncho: true,
      comparar: (a, b) => (a.cliente ?? '').localeCompare(b.cliente ?? '', 'es'),
      celda: (o) => o.cliente ?? <span className="text-acero">—</span>,
    },
    {
      clave: 'jefe',
      titulo: 'Jefe de obra',
      comparar: (a, b) => (a.jefeObra ?? '').localeCompare(b.jefeObra ?? '', 'es'),
      celda: (o) => o.jefeObra ?? <span className="text-acero">Sin asignar</span>,
    },
    {
      clave: 'localidad',
      titulo: 'Localidad',
      soloAncho: true,
      comparar: (a, b) =>
        (a.localidad ?? '').localeCompare(b.localidad ?? '', 'es'),
      celda: (o) => o.localidad ?? <span className="text-acero">—</span>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: '140px',
      comparar: (a, b) => a.estado.localeCompare(b.estado),
      celda: (o) => <InsigniaEstadoObra estado={o.estado} />,
    },
  ]

  return (
    <>
      <BarraFiltrosTabla
        buscador={
          <Buscador
            ref={campoBusqueda}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            alLimpiar={() => setBusqueda('')}
            placeholder="Código, nombre o cliente…"
          />
        }
      >
        <ChipsFiltro
          chips={chipsEstado}
          activos={estados}
          alCambiar={setEstados}
          textoTodos="Todos los estados"
          multiple
        />

        {unidades.length > 1 && (
          <ChipsFiltro
            chips={unidades.map((u) => ({ valor: u.nombre, texto: u.nombre }))}
            activos={unidadesElegidas}
            alCambiar={setUnidades}
            textoTodos="Todas las unidades"
            multiple
            className="pt-0 lg:pt-0"
          />
        )}
      </BarraFiltrosTabla>

      <p className="px-4 py-2 text-menor text-grafito">
        {plural(filtradas.length, 'obra')}
      </p>

      <TablaAdaptable
        datos={filtradas}
        columnas={columnas}
        claveFila={(o) => o.id}
        href={(o) => `/obras/${o.id}`}
        ordenInicial={{ clave: 'codigo' }}
        vacio={
          <EstadoVacio
            titulo="No hay obras que coincidan"
            mensaje={
              busqueda || estados.length > 0 || unidadesElegidas.length > 0
                ? 'Probá con otra búsqueda o sacá algún filtro.'
                : 'Todavía no hay obras cargadas. Creá la primera.'
            }
            icono={<Building2 className="size-8" strokeWidth={1.5} />}
          />
        }
        filaMovil={(o) => (
            <FilaLista
              titulo={o.nombre}
              subtitulo={`${o.codigo} · ${o.unidadNegocio}`}
              detalle={
                [o.jefeObra, o.cliente, o.localidad].filter(Boolean).join(' · ') ||
                undefined
              }
              debajoDerecha={
                <div className="flex flex-col items-end gap-1">
                  <InsigniaEstadoObra estado={o.estado} />
                  {o.esInterior && (
                    <span className="flex items-center gap-1 text-micro text-metadato">
                      <MapPin aria-hidden className="size-3" />
                      Interior
                    </span>
                  )}
                </div>
              }
              href={`/obras/${o.id}`}
            />
        )}
      />
    </>
  )
}
