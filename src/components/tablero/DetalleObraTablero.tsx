'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Info } from 'lucide-react'
import type { ObraTablero } from '@/lib/calculos/tablero'
import type { MesDeObra } from '@/lib/calculos/tablero'
import { accionExplicar } from '@/server/tablero/acciones'
import type { Explicacion, TipoCifra } from '@/server/tablero/queries'
import {
  AvisoFijo,
  BarraProgreso,
  Dato,
  FilaLista,
  HojaInferior,
  Insignia,
  Lista,
  ListaDatos,
  TituloSeccion,
} from '@/components/ui'
import { BarraComposicion, LineaEvolucion } from './Graficos'
import { cn } from '@/lib/cn'
import {
  fechaCorta,
  horas as formatoHoras,
  moneda,
  monedaCorta,
  numero,
  plural,
  porcentaje,
  textoEnum,
} from '@/lib/formato'

interface PedidoDemorado {
  id: string
  numero: string | null
  descripcion: string
  estado: string
  monto: number | null
  proveedor: string | null
  fechaNecesariaEnObra: Date | null
  diasDeAtraso: number
}

export function DetalleObraTablero({
  obra,
  evolucion,
  pedidos,
  horasPorSemana,
  periodo,
}: {
  obra: ObraTablero
  evolucion: MesDeObra[]
  pedidos: PedidoDemorado[]
  horasPorSemana: Array<{ semana: string; horas: number }>
  periodo: { desde: string; hasta: string; etiqueta: string }
}) {
  const [, empezar] = useTransition()
  const [explicando, setExplicando] = useState<Explicacion | null>(null)

  const explicar = (tipo: TipoCifra) => {
    empezar(async () => {
      setExplicando(
        await accionExplicar(tipo, obra.obraId, periodo.desde, periodo.hasta),
      )
    })
  }

  const partes = [
    { nombre: 'Materiales', monto: obra.materiales },
    { nombre: 'Mano de obra', monto: obra.manoObra + obra.viaticos },
    { nombre: 'Subcontratos', monto: obra.subcontratos },
    { nombre: 'Equipos', monto: obra.equipos },
    { nombre: 'Vehículos', monto: obra.vehiculos },
    { nombre: 'Herramientas', monto: obra.herramientas },
    { nombre: 'Otros', monto: obra.otrosExternos },
  ]

  const totalHoras = horasPorSemana.reduce((a, s) => a + s.horas, 0)

  return (
    <div data-ancho="tablero" className="pb-8">
      {/* Los tres números que importan */}
      <div className="grid grid-cols-3 gap-px border-y border-niebla bg-niebla">
        {[
          ['Ingresos', obra.ingresos, 'text-negro'],
          ['Costo', obra.costoTotal, 'text-negro'],
          [
            'Resultado',
            obra.resultado,
            obra.resultado < 0 ? 'text-critico' : 'text-correcto',
          ],
        ].map(([etiqueta, valor, color]) => (
          <div key={etiqueta as string} className="bg-blanco px-3 py-3">
            <p className="text-menor text-grafito">{etiqueta as string}</p>
            <p className={cn('cifras mt-0.5 text-cifra font-medium', color as string)}>
              {monedaCorta(valor as number)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <Insignia tono={obra.resultado < 0 ? 'critico' : 'correcto'}>
          Margen {porcentaje(obra.margen)}
        </Insignia>
        <Insignia tono="neutro">{obra.unidadNegocio}</Insignia>
        <Insignia tono="neutro">{textoEnum(obra.estado)}</Insignia>
      </div>

      {/* Evolución mensual */}
      <TituloSeccion>Evolución de los últimos 6 meses</TituloSeccion>
      <div className="border-y border-niebla bg-blanco px-2 py-3">
        <LineaEvolucion
          datos={evolucion.map((m) => ({
            etiqueta: m.etiqueta,
            ingresos: m.ingresos,
            costos: m.costos,
            resultado: m.resultado,
          }))}
        />
      </div>

      {/* Composición del costo */}
      <TituloSeccion>De qué está hecho el costo</TituloSeccion>
      <div className="border-y border-niebla bg-blanco px-4 py-4">
        <BarraComposicion partes={partes} total={obra.costoTotal} />
      </div>

      <Lista>
        {partes
          .filter((p) => p.monto > 0)
          .sort((a, b) => b.monto - a.monto)
          .map((p) => (
            <FilaLista
              key={p.nombre}
              titulo={p.nombre}
              subtitulo={`${porcentaje(p.monto / obra.costoTotal)} del costo`}
              derecha={moneda(p.monto)}
              alTocar={
                p.nombre === 'Materiales'
                  ? () => explicar('materiales')
                  : p.nombre === 'Mano de obra'
                    ? () => explicar('manoObra')
                    : p.nombre === 'Vehículos'
                      ? () => explicar('vehiculos')
                      : p.nombre === 'Herramientas'
                        ? () => explicar('herramientas')
                        : undefined
              }
              flecha={false}
              debajoDerecha={
                ['Materiales', 'Mano de obra', 'Vehículos', 'Herramientas'].includes(
                  p.nombre,
                ) ? (
                  <Info aria-hidden className="size-3 text-acero" />
                ) : undefined
              }
            />
          ))}
      </Lista>

      {/* Presupuesto de mano de obra */}
      {obra.presupuestoManoObra && obra.consumoPresupuesto !== null && (
        <>
          <TituloSeccion>Presupuesto de mano de obra</TituloSeccion>
          <div className="border-y border-niebla bg-blanco px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="cifras text-grande font-medium text-negro">
                {moneda(obra.consumoPresupuesto * obra.presupuestoManoObra)}
              </span>
              <span className="text-menor text-grafito">
                de {moneda(obra.presupuestoManoObra)}
              </span>
            </div>
            <BarraProgreso
              fraccion={obra.consumoPresupuesto}
              etiqueta={`${porcentaje(obra.consumoPresupuesto)} consumido`}
              className="mt-2"
            />
            {obra.consumoPresupuesto > 1 && (
              <div className="mt-3">
                <AvisoFijo tono="critico">
                  Se pasó{' '}
                  {moneda(
                    obra.consumoPresupuesto * obra.presupuestoManoObra -
                      obra.presupuestoManoObra,
                  )}{' '}
                  del presupuesto de mano de obra.
                </AvisoFijo>
              </div>
            )}
          </div>
        </>
      )}

      {/* Horas por semana */}
      <TituloSeccion>Horas trabajadas por semana</TituloSeccion>
      {horasPorSemana.length === 0 ? (
        <p className="px-4 text-chico text-grafito">
          No hay partes aprobados en este período.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-1 border-y border-niebla bg-blanco px-4 py-4">
            {horasPorSemana.map((s) => {
              const maximo = Math.max(...horasPorSemana.map((x) => x.horas))
              const alto = maximo > 0 ? (s.horas / maximo) * 100 : 0
              return (
                <div
                  key={s.semana}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`Semana del ${fechaCorta(new Date(`${s.semana}T00:00:00`))}: ${formatoHoras(s.horas)}`}
                >
                  <span className="cifras text-micro text-acero">
                    {Math.round(s.horas)}
                  </span>
                  <div
                    className="w-full rounded-t-[2px] bg-negro"
                    style={{ height: `${Math.max(alto, 3)}px`, minHeight: 3 }}
                  />
                  <span className="text-micro text-acero">
                    {new Date(`${s.semana}T00:00:00`).getDate()}/
                    {new Date(`${s.semana}T00:00:00`).getMonth() + 1}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="px-4 pt-2 text-menor text-acero">
            {formatoHoras(totalHoras)} en el período.
          </p>
        </>
      )}

      {/* Viajes */}
      <TituloSeccion>Viajes</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Viajes en el período">
            {numero(obra.origen.viajes)}
          </Dato>
          <Dato etiqueta="Costo">{moneda(obra.vehiculos)}</Dato>
        </ListaDatos>
      </div>

      {/* Pedidos demorados */}
      <TituloSeccion>Pedidos de compra demorados</TituloSeccion>
      {pedidos.length === 0 ? (
        <p className="px-4 pb-4 text-chico text-grafito">
          Ningún pedido trabado. Los pedidos se cargan y se aprueban en el
          sistema base.
        </p>
      ) : (
        <>
          <div className="px-4 pb-2">
            <AvisoFijo tono="critico">
              {plural(pedidos.length, 'pedido trabado', 'pedidos trabados')}. Esto
              es lo que frena una obra.
            </AvisoFijo>
          </div>
          <Lista>
            {pedidos.map((p) => (
              <FilaLista
                key={p.id}
                titulo={p.descripcion}
                subtitulo={[p.numero, p.proveedor].filter(Boolean).join(' · ')}
                detalle={
                  p.fechaNecesariaEnObra
                    ? `Necesario en obra el ${fechaCorta(p.fechaNecesariaEnObra)}`
                    : textoEnum(p.estado)
                }
                tono="critico"
                derecha={p.monto ? moneda(p.monto) : undefined}
                debajoDerecha={
                  p.diasDeAtraso > 0 ? (
                    <Insignia tono="critico">
                      {plural(p.diasDeAtraso, 'día')} de atraso
                    </Insignia>
                  ) : (
                    <Insignia tono="aviso">{textoEnum(p.estado)}</Insignia>
                  )
                }
                flecha={false}
              />
            ))}
          </Lista>
        </>
      )}

      <div className="px-4 pt-5">
        <Link
          href={`/obras/${obra.obraId}`}
          className="flex min-h-[48px] items-center justify-center rounded-[var(--radius-control)] border border-niebla bg-blanco text-base font-medium text-negro active:bg-hueso"
        >
          Ver la ficha completa de la obra
        </Link>
      </div>

      <HojaInferior
        abierta={explicando !== null}
        alCerrar={() => setExplicando(null)}
        titulo={explicando?.titulo ?? ''}
        descripcion={periodo.etiqueta}
      >
        {explicando && (
          <ListaDatos className="px-0">
            {explicando.lineas.map((l) => (
              <Dato key={l.etiqueta} etiqueta={l.etiqueta}>
                {l.valor}
              </Dato>
            ))}
          </ListaDatos>
        )}
      </HojaInferior>
    </div>
  )
}
