'use client'

import { useMemo, useState } from 'react'
import { Truck } from 'lucide-react'
import { EstadoVehiculo, TipoVehiculo } from '@prisma/client'
import type { ResumenFlota, VehiculoDeLista } from '@/server/vehiculos/queries'
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
import { InsigniaEstadoVehiculo, TIPO_VEHICULO } from './estado'
import { hora, kilometros, numero, patente, peso, plural } from '@/lib/formato'

type Foco = 'todos' | 'disponibles' | 'viaje' | 'taller' | 'vencidos'

export function ListaFlota({
  vehiculos,
  resumen,
  focoInicial = 'todos',
}: {
  vehiculos: VehiculoDeLista[]
  resumen: ResumenFlota
  focoInicial?: Foco
}) {
  const [busqueda, setBusqueda] = useState('')
  const [foco, setFoco] = useState<Foco>(focoInicial)
  const [tipos, setTipos] = useState<string[]>([])
  const [capacidadMinima, setCapacidadMinima] = useState<string[]>([])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return vehiculos.filter((v) => {
      switch (foco) {
        case 'disponibles':
          if (v.estado !== EstadoVehiculo.DISPONIBLE) return false
          break
        case 'viaje':
          if (v.estado !== EstadoVehiculo.EN_VIAJE) return false
          break
        case 'taller':
          if (v.estado !== EstadoVehiculo.EN_TALLER) return false
          break
        case 'vencidos':
          if (v.documentosVencidos === 0) return false
          break
      }

      if (tipos.length > 0 && !tipos.includes(v.tipo)) return false

      if (capacidadMinima.length > 0) {
        const minimo = Math.max(...capacidadMinima.map(Number))
        if ((v.capacidadCargaKg ?? 0) < minimo) return false
      }

      if (!texto) return true
      return [v.patente, v.marca, v.modelo, v.interno, v.chofer]
        .filter(Boolean)
        .some((c) => (c as string).toLowerCase().includes(texto))
    })
  }, [vehiculos, busqueda, foco, tipos, capacidadMinima])

  const tiposPresentes = [...new Set(vehiculos.map((v) => v.tipo))] as TipoVehiculo[]

  return (
    <>
      <GrillaResumen columnas={2}>
        <NumeroResumen
          etiqueta="Disponibles"
          valor={numero(resumen.disponibles)}
          tono="correcto"
          activo={foco === 'disponibles'}
          alTocar={() => setFoco('disponibles')}
        />
        <NumeroResumen
          etiqueta="En viaje"
          valor={numero(resumen.enViaje)}
          activo={foco === 'viaje'}
          alTocar={() => setFoco('viaje')}
        />
        <NumeroResumen
          etiqueta="En taller"
          valor={numero(resumen.enTaller)}
          tono={resumen.enTaller > 0 ? 'aviso' : 'neutro'}
          activo={foco === 'taller'}
          alTocar={() => setFoco('taller')}
        />
        <NumeroResumen
          etiqueta="Con doc. vencido"
          valor={numero(resumen.conDocumentoVencido)}
          tono={resumen.conDocumentoVencido > 0 ? 'critico' : 'neutro'}
          activo={foco === 'vencidos'}
          alTocar={() => setFoco('vencidos')}
        />
      </GrillaResumen>

      <BarraFiltros>
        <div className="px-4 pt-3">
          <Buscador
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            alLimpiar={() => setBusqueda('')}
            placeholder="Patente, marca, modelo o chofer…"
          />
        </div>
        <ChipsFiltro
          chips={tiposPresentes.map((t) => ({
            valor: t,
            texto: TIPO_VEHICULO[t],
          }))}
          activos={tipos}
          alCambiar={setTipos}
          textoTodos="Todos los tipos"
          multiple
        />
        <ChipsFiltro
          chips={[
            { valor: '1000', texto: 'Desde 1 t' },
            { valor: '3500', texto: 'Desde 3,5 t' },
            { valor: '8000', texto: 'Desde 8 t' },
            { valor: '15000', texto: 'Desde 15 t' },
          ]}
          activos={capacidadMinima}
          alCambiar={setCapacidadMinima}
          textoTodos="Cualquier carga"
          className="pt-0"
        />
      </BarraFiltros>

      <p className="px-4 py-2 text-menor text-grafito">
        {plural(filtrados.length, 'vehículo')}
      </p>

      {filtrados.length === 0 ? (
        <EstadoVacio
          titulo="No hay vehículos que coincidan"
          mensaje="Probá con otra búsqueda o sacá algún filtro."
          icono={<Truck className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {filtrados.map((v) => (
            <FilaLista
              key={v.id}
              titulo={patente(v.patente)}
              subtitulo={`${TIPO_VEHICULO[v.tipo]} · ${v.marca} ${v.modelo}${v.capacidadCargaKg ? ` · ${peso(v.capacidadCargaKg)}` : ''}`}
              detalle={
                v.viajeActual
                  ? `A ${v.viajeActual.destino}${v.viajeActual.obra ? ` para ${v.viajeActual.obra}` : ''} desde las ${hora(v.viajeActual.desde)}`
                  : [v.chofer, kilometros(v.kmActual)].filter(Boolean).join(' · ')
              }
              tono={
                v.documentosVencidos > 0
                  ? 'critico'
                  : v.serviceUrgente
                    ? 'aviso'
                    : 'neutro'
              }
              debajoDerecha={
                <div className="flex flex-col items-end gap-1">
                  {v.documentosVencidos > 0 ? (
                    <Insignia tono="critico">
                      {plural(v.documentosVencidos, 'doc. vencido', 'docs. vencidos')}
                    </Insignia>
                  ) : (
                    <InsigniaEstadoVehiculo estado={v.estado} />
                  )}
                  {v.serviceUrgente && v.documentosVencidos === 0 && (
                    <Insignia tono="aviso">Service próximo</Insignia>
                  )}
                </div>
              }
              href={`/vehiculos/${v.id}`}
            />
          ))}
        </Lista>
      )}
    </>
  )
}
