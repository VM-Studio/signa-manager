'use client'

import { useMemo, useState } from 'react'
import { HardHat } from 'lucide-react'
import { CategoriaLaboral } from '@prisma/client'
import {
  BarraFiltrosTabla,
  Buscador,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  Insignia,
  TablaAdaptable,
  useAtajoBuscar,
  type ColumnaTabla,
} from '@/components/ui'
import { moneda, plural, textoEnum } from '@/lib/formato'

/* =====================================================================
   Listado de empleados.

   En celular, filas táctiles. En escritorio, una tabla con la categoría,
   la obra donde está hoy, el valor hora y el estado de su
   documentación, que es lo que se mira cuando hay que armar una
   cuadrilla o saber quién no puede entrar a la obra.
   ===================================================================== */

const porTexto = <T,>(valor: (x: T) => string | null) => (a: T, b: T) => {
  const ta = valor(a) ?? ''
  const tb = valor(b) ?? ''
  if (!ta) return 1
  if (!tb) return -1
  return ta.localeCompare(tb, 'es')
}

export interface EmpleadoDeLista {
  id: string
  legajo: string
  nombre: string
  apellido: string
  categoria: CategoriaLaboral
  especialidad: string | null
  valorHora: number
  activo: boolean
  obra: { id: string; codigo: string; nombre: string } | null
  documentosVencidos: number
}

export function ListaEmpleados({
  empleados,
  categorias,
}: {
  empleados: EmpleadoDeLista[]
  categorias: CategoriaLaboral[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [soloProblemas, setSoloProblemas] = useState(false)
  const campoBusqueda = useAtajoBuscar()

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return empleados.filter((e) => {
      if (cats.length > 0 && !cats.includes(e.categoria)) return false
      if (soloProblemas && e.documentosVencidos === 0) return false
      if (!texto) return true
      return [e.nombre, e.apellido, e.legajo, e.especialidad, e.obra?.codigo]
        .filter(Boolean)
        .some((c) => (c as string).toLowerCase().includes(texto))
    })
  }, [empleados, busqueda, cats, soloProblemas])

  const conProblemas = empleados.filter((e) => e.documentosVencidos > 0).length

  const columnas: Array<ColumnaTabla<EmpleadoDeLista>> = [
    {
      clave: 'legajo',
      titulo: 'Legajo',
      ancho: '90px',
      comparar: porTexto((e) => e.legajo),
      celda: (e) => <span className="cifras text-grafito">{e.legajo}</span>,
    },
    {
      clave: 'nombre',
      titulo: 'Nombre',
      comparar: porTexto((e) => `${e.apellido} ${e.nombre}`),
      celda: (e) => (
        <span className="font-medium text-negro">
          {e.apellido}, {e.nombre}
        </span>
      ),
    },
    {
      clave: 'categoria',
      titulo: 'Categoría',
      desde: 'lg',
      ancho: '170px',
      comparar: porTexto((e) => textoEnum(e.categoria)),
      celda: (e) => <span className="text-grafito">{textoEnum(e.categoria)}</span>,
    },
    {
      clave: 'especialidad',
      titulo: 'Especialidad',
      desde: 'xl',
      comparar: porTexto((e) => e.especialidad),
      celda: (e) => e.especialidad ?? <span className="text-acero">—</span>,
    },
    {
      clave: 'obra',
      titulo: 'Obra de hoy',
      comparar: porTexto((e) => e.obra?.codigo ?? null),
      celda: (e) =>
        e.obra ? (
          <span className="text-grafito">
            <span className="cifras">{e.obra.codigo}</span> · {e.obra.nombre}
          </span>
        ) : (
          <Insignia tono="aviso">Sin asignar</Insignia>
        ),
    },
    {
      clave: 'valorHora',
      titulo: 'Valor hora',
      desde: 'lg',
      alineacion: 'derecha',
      ancho: '120px',
      comparar: (a, b) => a.valorHora - b.valorHora,
      celda: (e) => moneda(e.valorHora),
    },
    {
      clave: 'documentacion',
      titulo: 'Documentación',
      ancho: '160px',
      comparar: (a, b) => a.documentosVencidos - b.documentosVencidos,
      celda: (e) =>
        e.documentosVencidos > 0 ? (
          <Insignia tono="critico">
            {plural(e.documentosVencidos, 'vencido', 'vencidos')}
          </Insignia>
        ) : (
          <Insignia tono="correcto">Al día</Insignia>
        ),
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
            placeholder="Nombre, legajo, DNI…"
          />
        }
      >
        <ChipsFiltro
          chips={[
            ...(conProblemas > 0
              ? [{ valor: '__docs', texto: 'Documentación vencida', cantidad: conProblemas }]
              : []),
            ...categorias.map((c) => ({ valor: c, texto: textoEnum(c) })),
          ]}
          activos={[...(soloProblemas ? ['__docs'] : []), ...cats]}
          alCambiar={(activos) => {
            setSoloProblemas(activos.includes('__docs'))
            setCats(activos.filter((a) => a !== '__docs'))
          }}
          textoTodos="Todos"
          multiple
        />
      </BarraFiltrosTabla>

      <p className="px-4 py-2 text-menor text-grafito">
        {plural(filtrados.length, 'empleado')}
      </p>

      <TablaAdaptable
        datos={filtrados}
        columnas={columnas}
        claveFila={(e) => e.id}
        href={(e) => `/personal/empleados/${e.id}`}
        tono={(e) => (e.documentosVencidos > 0 ? 'critico' : 'neutro')}
        ordenInicial={{ clave: 'nombre' }}
        vacio={
          <EstadoVacio
            titulo="No hay empleados que coincidan"
            mensaje={
              busqueda || cats.length > 0 || soloProblemas
                ? 'Probá con otra búsqueda o sacá algún filtro.'
                : 'Todavía no hay empleados cargados.'
            }
            icono={<HardHat className="size-8" strokeWidth={1.5} />}
          />
        }
        filaMovil={(e) => (
          <FilaLista
            titulo={`${e.apellido}, ${e.nombre}`}
            subtitulo={`Legajo ${e.legajo} · ${textoEnum(e.categoria)}`}
            detalle={
              [e.especialidad, e.obra ? `En ${e.obra.codigo}` : 'Sin asignar']
                .filter(Boolean)
                .join(' · ')
            }
            tono={e.documentosVencidos > 0 ? 'critico' : 'neutro'}
            derecha={moneda(e.valorHora)}
            debajoDerecha={
              e.documentosVencidos > 0 ? (
                <Insignia tono="critico">
                  {plural(
                    e.documentosVencidos,
                    'doc. vencido',
                    'docs. vencidos',
                  )}
                </Insignia>
              ) : !e.obra ? (
                <Insignia tono="aviso">Sin asignar</Insignia>
              ) : undefined
            }
            href={`/personal/empleados/${e.id}`}
          />
        )}
      />
    </>
  )
}
