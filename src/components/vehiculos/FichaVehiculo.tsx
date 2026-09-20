'use client'

import { useState } from 'react'
import type { VehiculoFicha } from '@/server/vehiculos/queries'
import type { ProximoService } from '@/server/vehiculos/reglas'
import { DOCUMENTOS_BLOQUEANTES } from '@/server/vehiculos/reglas'
import {
  AvisoFijo,
  Dato,
  EstadoVacio,
  FilaLista,
  GrillaResumen,
  Insignia,
  Lista,
  ListaDatos,
  NumeroResumen,
  Pestanas,
  TituloSeccion,
} from '@/components/ui'
import {
  InsigniaEstadoVehiculo,
  InsigniaEstadoViaje,
  TIPO_VEHICULO,
} from './estado'
import {
  consumo as formatoConsumo,
  fechaCorta,
  kilometros,
  litros,
  moneda,
  monedaCorta,
  numero,
  patente,
  peso,
  plural,
  textoEnum,
  textoVencimiento,
} from '@/lib/formato'

export interface IndicadoresVehiculo {
  consumo: number | null
  consumoAnormal: { anormal: boolean; promedio: number | null; reciente: number | null }
  service: ProximoService | null
  costoDelMes: {
    combustible: number
    mantenimiento: number
    incidentes: number
    total: number
  }
  viajesDelMes: number
  costoViajesDelMes: number
}

export function FichaVehiculo({
  vehiculo,
  indicadores,
}: {
  vehiculo: VehiculoFicha
  indicadores: IndicadoresVehiculo
}) {
  const [pestana, setPestana] = useState('datos')
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const bloqueantesVencidos = vehiculo.documentos.filter(
    (d) =>
      DOCUMENTOS_BLOQUEANTES.includes(d.tipo) &&
      d.vencimiento !== null &&
      d.vencimiento < hoy,
  )

  const incidentesAbiertos = vehiculo.incidentes.filter((i) => !i.resuelto)

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <InsigniaEstadoVehiculo estado={vehiculo.estado} />
        <Insignia tono="neutro">{TIPO_VEHICULO[vehiculo.tipo]}</Insignia>
        {vehiculo.capacidadCargaKg && (
          <Insignia tono="neutro">{peso(vehiculo.capacidadCargaKg)}</Insignia>
        )}
        {vehiculo.interno && <Insignia tono="neutro">{vehiculo.interno}</Insignia>}
      </div>

      {bloqueantesVencidos.length > 0 && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico" titulo="No puede salir a la calle">
            {bloqueantesVencidos
              .map((d) => `${textoEnum(d.tipo)} vencida el ${fechaCorta(d.vencimiento)}`)
              .join('. ')}
            . El sistema no lo deja asignar a ningún viaje hasta que se
            renueve.
          </AvisoFijo>
        </div>
      )}

      {indicadores.service?.urgente && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="aviso" titulo="Service próximo">
            {indicadores.service.vence === 'km' &&
            indicadores.service.kmRestantes !== null
              ? `Faltan ${kilometros(indicadores.service.kmRestantes)} para el próximo service.`
              : indicadores.service.diasRestantes !== null
                ? `Faltan ${plural(indicadores.service.diasRestantes, 'día')} para el próximo service.`
                : 'Hay que hacerle el service.'}
          </AvisoFijo>
        </div>
      )}

      {indicadores.consumoAnormal.anormal && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="aviso" titulo="Está consumiendo más de lo normal">
            Las últimas cargas dan{' '}
            {formatoConsumo(indicadores.consumoAnormal.reciente ?? 0)}, contra un
            promedio de {formatoConsumo(indicadores.consumoAnormal.promedio ?? 0)}.
            Puede ser una falla mecánica o una pérdida.
          </AvisoFijo>
        </div>
      )}

      {/* El costo del vehículo en el mes, arriba de todo */}
      <TituloSeccion>Este mes</TituloSeccion>
      <GrillaResumen columnas={3}>
        <NumeroResumen
          etiqueta="Costo total"
          valor={monedaCorta(indicadores.costoDelMes.total)}
          detalle="combustible + taller"
        />
        <NumeroResumen
          etiqueta="Viajes"
          valor={numero(indicadores.viajesDelMes)}
        />
        <NumeroResumen
          etiqueta="Consumo"
          valor={
            indicadores.consumo !== null
              ? formatoConsumo(indicadores.consumo).replace(' L/100 km', '')
              : '—'
          }
          detalle="L/100 km"
          tono={indicadores.consumoAnormal.anormal ? 'aviso' : 'neutro'}
        />
      </GrillaResumen>

      <Pestanas
        activa={pestana}
        alCambiar={setPestana}
        className="mt-2"
        pestanas={[
          { id: 'datos', texto: 'Datos' },
          {
            id: 'documentacion',
            texto: 'Documentación',
            cantidad: bloqueantesVencidos.length,
          },
          { id: 'viajes', texto: 'Viajes', cantidad: vehiculo.viajes.length },
          { id: 'combustible', texto: 'Combustible' },
          { id: 'mantenimiento', texto: 'Mantenimiento' },
          {
            id: 'incidentes',
            texto: 'Incidentes',
            cantidad: incidentesAbiertos.length,
          },
        ]}
      />

      {/* ------------------------------ DATOS ----------------------------- */}
      {pestana === 'datos' && (
        <>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Patente">{patente(vehiculo.patente)}</Dato>
              <Dato etiqueta="Interno">{vehiculo.interno ?? '—'}</Dato>
              <Dato etiqueta="Tipo">{TIPO_VEHICULO[vehiculo.tipo]}</Dato>
              <Dato etiqueta="Marca y modelo">
                {vehiculo.marca} {vehiculo.modelo}
              </Dato>
              <Dato etiqueta="Año">{vehiculo.anio ?? '—'}</Dato>
              <Dato etiqueta="Combustible">{textoEnum(vehiculo.combustible)}</Dato>
              <Dato etiqueta="Kilómetros">{kilometros(vehiculo.kmActual)}</Dato>
              {vehiculo.horasActual !== null && (
                <Dato etiqueta="Horómetro">{numero(vehiculo.horasActual)} h</Dato>
              )}
            </ListaDatos>
          </div>

          <TituloSeccion>Capacidad</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Carga">
                {vehiculo.capacidadCargaKg ? peso(vehiculo.capacidadCargaKg) : '—'}
              </Dato>
              <Dato etiqueta="Volumen">
                {vehiculo.volumenM3 ? `${numero(vehiculo.volumenM3, 1)} m³` : '—'}
              </Dato>
              <Dato etiqueta="Pasajeros">
                {vehiculo.cantidadPasajeros ?? '—'}
              </Dato>
              <Dato etiqueta="Costo por km estimado">
                {vehiculo.costoKmEstimado ? moneda(vehiculo.costoKmEstimado) : '—'}
              </Dato>
            </ListaDatos>
          </div>

          <TituloSeccion>Chofer habitual</TituloSeccion>
          {vehiculo.choferHabitual ? (
            <Lista>
              <FilaLista
                titulo={`${vehiculo.choferHabitual.apellido}, ${vehiculo.choferHabitual.nombre}`}
                subtitulo={`Legajo ${vehiculo.choferHabitual.legajo}`}
                href={`/personal/empleados/${vehiculo.choferHabitual.id}`}
              />
            </Lista>
          ) : (
            <p className="px-4 text-chico text-grafito">Sin chofer habitual.</p>
          )}
        </>
      )}

      {/* --------------------------- DOCUMENTACIÓN ------------------------ */}
      {pestana === 'documentacion' && (
        <>
          {vehiculo.documentos.length === 0 ? (
            <EstadoVacio
              titulo="Sin documentación cargada"
              mensaje="Cargá el seguro, la VTV y la patente con sus vencimientos."
            />
          ) : (
            <>
              <Lista>
                {vehiculo.documentos.map((d) => {
                  const vencido = d.vencimiento !== null && d.vencimiento < hoy
                  const bloquea = DOCUMENTOS_BLOQUEANTES.includes(d.tipo)
                  const porVencer =
                    d.vencimiento !== null &&
                    !vencido &&
                    (d.vencimiento.getTime() - hoy.getTime()) / 86_400_000 <= 15

                  return (
                    <FilaLista
                      key={d.id}
                      titulo={textoEnum(d.tipo)}
                      subtitulo={d.descripcion ?? undefined}
                      detalle={
                        bloquea
                          ? 'Sin esto el vehículo no puede salir'
                          : undefined
                      }
                      tono={
                        vencido && bloquea
                          ? 'critico'
                          : vencido || porVencer
                            ? 'aviso'
                            : 'neutro'
                      }
                      derecha={d.costo ? moneda(d.costo) : undefined}
                      debajoDerecha={
                        <Insignia
                          tono={
                            vencido
                              ? bloquea
                                ? 'critico'
                                : 'aviso'
                              : porVencer
                                ? 'aviso'
                                : 'correcto'
                          }
                        >
                          {textoVencimiento(d.vencimiento)}
                        </Insignia>
                      }
                      flecha={false}
                    />
                  )
                })}
              </Lista>

              <div className="px-4 pt-3">
                <p className="text-menor text-acero">
                  Costo de documentación del año:{' '}
                  {moneda(
                    vehiculo.documentos.reduce(
                      (a, d) => a + Number(d.costo ?? 0),
                      0,
                    ),
                  )}
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* ------------------------------ VIAJES ---------------------------- */}
      {pestana === 'viajes' && (
        <>
          {vehiculo.viajes.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hizo viajes"
              mensaje="Cuando logística le asigne uno, aparece acá."
            />
          ) : (
            <Lista>
              {vehiculo.viajes.map((v) => (
                <FilaLista
                  key={v.id}
                  titulo={v.destino}
                  subtitulo={`${fechaCorta(v.salidaPrevista)} · ${v.chofer.nombre} ${v.chofer.apellido}`}
                  detalle={
                    [
                      v.obra?.codigo,
                      v.kmSalida !== null && v.kmLlegada !== null
                        ? kilometros(v.kmLlegada - v.kmSalida)
                        : null,
                      textoEnum(v.tipo),
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  }
                  derecha={v.costoCalculado ? moneda(v.costoCalculado) : undefined}
                  debajoDerecha={<InsigniaEstadoViaje estado={v.estado} />}
                  href={`/vehiculos/viajes/${v.id}`}
                />
              ))}
            </Lista>
          )}
        </>
      )}

      {/* ---------------------------- COMBUSTIBLE ------------------------- */}
      {pestana === 'combustible' && (
        <>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Consumo promedio">
                {indicadores.consumo !== null
                  ? formatoConsumo(indicadores.consumo)
                  : 'Hacen falta al menos dos cargas con kilometraje'}
              </Dato>
              <Dato etiqueta="Gasto del mes">
                {moneda(indicadores.costoDelMes.combustible)}
              </Dato>
            </ListaDatos>
          </div>

          {vehiculo.cargas.length === 0 ? (
            <EstadoVacio
              titulo="Sin cargas registradas"
              mensaje="El chofer las carga desde su pantalla de viajes."
            />
          ) : (
            <Lista>
              {vehiculo.cargas.map((c) => (
                <FilaLista
                  key={c.id}
                  titulo={litros(c.litros)}
                  subtitulo={`${fechaCorta(c.fecha)}${c.estacion ? ` · ${c.estacion}` : ''}`}
                  detalle={
                    [
                      c.km ? kilometros(c.km) : null,
                      c.chofer ? `${c.chofer.nombre} ${c.chofer.apellido}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  derecha={moneda(c.monto)}
                  flecha={false}
                />
              ))}
            </Lista>
          )}
        </>
      )}

      {/* --------------------------- MANTENIMIENTO ------------------------ */}
      {pestana === 'mantenimiento' && (
        <>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Próximo por km">
                {indicadores.service?.porKm
                  ? `${kilometros(indicadores.service.porKm)}${
                      indicadores.service.kmRestantes !== null
                        ? ` · faltan ${kilometros(indicadores.service.kmRestantes)}`
                        : ''
                    }`
                  : '—'}
              </Dato>
              <Dato etiqueta="Próximo por fecha">
                {indicadores.service?.porFecha
                  ? textoVencimiento(indicadores.service.porFecha)
                  : '—'}
              </Dato>
              <Dato etiqueta="Gasto del mes">
                {moneda(indicadores.costoDelMes.mantenimiento)}
              </Dato>
            </ListaDatos>
            <p className="pb-4 text-menor text-acero">
              Se toma lo que ocurra primero: los kilómetros o la fecha.
            </p>
          </div>

          {vehiculo.mantenimientos.length === 0 ? (
            <EstadoVacio
              titulo="Sin mantenimientos registrados"
              mensaje="Registrá el primer service para que el sistema agende el próximo."
            />
          ) : (
            <Lista>
              {vehiculo.mantenimientos.map((m) => (
                <FilaLista
                  key={m.id}
                  titulo={m.descripcion}
                  subtitulo={`${m.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo'} · ${fechaCorta(m.fecha)}`}
                  detalle={
                    [m.taller, m.km ? kilometros(m.km) : null]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  derecha={m.costo ? moneda(m.costo) : undefined}
                  flecha={false}
                />
              ))}
            </Lista>
          )}
        </>
      )}

      {/* ---------------------------- INCIDENTES -------------------------- */}
      {pestana === 'incidentes' && (
        <>
          {vehiculo.incidentes.length === 0 ? (
            <EstadoVacio
              titulo="Sin incidentes"
              mensaje="Multas, siniestros y roturas se registran acá."
            />
          ) : (
            <Lista>
              {vehiculo.incidentes.map((i) => (
                <FilaLista
                  key={i.id}
                  titulo={textoEnum(i.tipo)}
                  subtitulo={fechaCorta(i.fecha)}
                  detalle={
                    [
                      i.descripcion,
                      i.chofer ? `${i.chofer.nombre} ${i.chofer.apellido}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  }
                  tono={!i.resuelto ? 'aviso' : 'neutro'}
                  derecha={i.monto ? moneda(i.monto) : undefined}
                  debajoDerecha={
                    <Insignia tono={i.resuelto ? 'correcto' : 'aviso'}>
                      {i.resuelto ? 'Resuelto' : 'Abierto'}
                    </Insignia>
                  }
                  flecha={false}
                />
              ))}
            </Lista>
          )}
        </>
      )}
    </div>
  )
}
