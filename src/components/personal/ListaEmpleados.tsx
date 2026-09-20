'use client'

import { useMemo, useState } from 'react'
import { HardHat } from 'lucide-react'
import { CategoriaLaboral } from '@prisma/client'
import {
  BarraFiltros,
  Buscador,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
} from '@/components/ui'
import { moneda, plural, textoEnum } from '@/lib/formato'

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

  return (
    <>
      <BarraFiltros>
        <div className="px-4 pt-3">
          <Buscador
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            alLimpiar={() => setBusqueda('')}
            placeholder="Nombre, legajo, DNI o especialidad…"
          />
        </div>
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
      </BarraFiltros>

      <p className="px-4 py-2 text-menor text-grafito">
        {plural(filtrados.length, 'empleado')}
      </p>

      {filtrados.length === 0 ? (
        <EstadoVacio
          titulo="No hay empleados que coincidan"
          mensaje={
            busqueda || cats.length > 0 || soloProblemas
              ? 'Probá con otra búsqueda o sacá algún filtro.'
              : 'Todavía no hay empleados cargados.'
          }
          icono={<HardHat className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {filtrados.map((e) => (
            <FilaLista
              key={e.id}
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
                    {plural(e.documentosVencidos, 'doc. vencido', 'docs. vencidos')}
                  </Insignia>
                ) : !e.obra ? (
                  <Insignia tono="aviso">Sin asignar</Insignia>
                ) : undefined
              }
              href={`/personal/empleados/${e.id}`}
            />
          ))}
        </Lista>
      )}
    </>
  )
}
