'use client'

import { useMemo, useState } from 'react'
import { Truck } from 'lucide-react'
import { EstadoVehiculo, TipoVehiculo } from '@prisma/client'
import type { ResumenFlota, VehiculoDeLista } from '@/server/vehiculos/queries'
import {
  BarraFiltrosTabla,
  Buscador,
  ChipsFiltro,
  EstadoVacio,
  FilaLista,
  GrillaResumen,
  TablaAdaptable,
  useAtajoBuscar,
  type ColumnaTabla,
  Insignia,
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
  const campoBusqueda = useAtajoBuscar()

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

  /*
   * En escritorio la flota se mira en tabla: capacidad, chofer,
   * kilómetros y el estado de los papeles de un vistazo. Es lo que se
   * necesita para contestar "¿con qué mando este flete?" sin abrir
   * vehículo por vehículo.
   */
  const columnas: Array<ColumnaTabla<VehiculoDeLista>> = [
    {
      clave: 'patente',
      titulo: 'Patente',
      ancho: '120px',
      comparar: (a, b) => a.patente.localeCompare(b.patente, 'es'),
      celda: (v) => (
        <span className="cifras font-medium text-negro">{patente(v.patente)}</span>
      ),
    },
    {
      clave: 'vehiculo',
      titulo: 'Vehículo',
      comparar: (a, b) =>
        `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`, 'es'),
      celda: (v) => (
        <span>
          <span className="block text-negro">
            {v.marca} {v.modelo}
          </span>
          <span className="block text-micro text-metadato">
            {TIPO_VEHICULO[v.tipo]}
            {v.interno ? ` · ${v.interno}` : ''}
          </span>
        </span>
      ),
    },
    {
      clave: 'capacidad',
      titulo: 'Capacidad',
      alineacion: 'derecha',
      ancho: '110px',
      comparar: (a, b) => (a.capacidadCargaKg ?? -1) - (b.capacidadCargaKg ?? -1),
      celda: (v) =>
        v.capacidadCargaKg ? (
          peso(v.capacidadCargaKg)
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'chofer',
      titulo: 'Chofer habitual',
      comparar: (a, b) => (a.chofer ?? '').localeCompare(b.chofer ?? '', 'es'),
      celda: (v) => v.chofer ?? <span className="text-acero">Sin asignar</span>,
    },
    {
      clave: 'km',
      titulo: 'Kilómetros',
      alineacion: 'derecha',
      ancho: '120px',
      comparar: (a, b) => a.kmActual - b.kmActual,
      celda: (v) => kilometros(v.kmActual),
    },
    {
      clave: 'donde',
      titulo: 'Dónde está',
      soloAncho: true,
      celda: (v) =>
        v.viajeActual ? (
          <span className="text-grafito">
            A {v.viajeActual.destino}
            {v.viajeActual.obra ? ` · ${v.viajeActual.obra}` : ''}
          </span>
        ) : (
          <span className="text-acero">En la base</span>
        ),
    },
    {
      clave: 'service',
      titulo: 'Service',
      ancho: '120px',
      comparar: (a, b) => Number(a.serviceUrgente) - Number(b.serviceUrgente),
      celda: (v) =>
        v.serviceUrgente ? (
          <Insignia tono="aviso">Próximo</Insignia>
        ) : (
          <span className="text-acero">—</span>
        ),
    },
    {
      clave: 'papeles',
      titulo: 'Papeles',
      ancho: '140px',
      comparar: (a, b) => a.documentosVencidos - b.documentosVencidos,
      celda: (v) =>
        v.documentosVencidos > 0 ? (
          <Insignia tono="critico">
            {plural(v.documentosVencidos, 'vencido', 'vencidos')}
          </Insignia>
        ) : (
          <Insignia tono="correcto">Al día</Insignia>
        ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: '130px',
      celda: (v) => <InsigniaEstadoVehiculo estado={v.estado} />,
    },
  ]

  return (
    <>
      <GrillaResumen columnas={4}>
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

      <BarraFiltrosTabla
        buscador={
          <Buscador
            ref={campoBusqueda}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            alLimpiar={() => setBusqueda('')}
            placeholder="Patente, marca o chofer…"
          />
        }
      >
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
          className="pt-0 lg:pt-0"
        />
      </BarraFiltrosTabla>

      <p className="px-4 py-2 text-menor text-grafito">
        {plural(filtrados.length, 'vehículo')}
      </p>

      <TablaAdaptable
        datos={filtrados}
        columnas={columnas}
        claveFila={(v) => v.id}
        href={(v) => `/vehiculos/${v.id}`}
        tono={(v) =>
          v.documentosVencidos > 0
            ? 'critico'
            : v.serviceUrgente
              ? 'aviso'
              : 'neutro'
        }
        ordenInicial={{ clave: 'patente' }}
        vacio={
          <EstadoVacio
            titulo="No hay vehículos que coincidan"
            mensaje="Probá con otra búsqueda o sacá algún filtro."
            icono={<Truck className="size-8" strokeWidth={1.5} />}
          />
        }
        filaMovil={(v) => (
            <FilaLista
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
        )}
      />
    </>
  )
}
