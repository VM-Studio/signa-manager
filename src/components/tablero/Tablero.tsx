'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Download, Info, Minus } from 'lucide-react'
import type { DatosTablero, ObraTablero } from '@/lib/calculos/tablero'
import type { OperacionHoy } from '@/server/tablero/queries'
import { accionExplicar } from '@/server/tablero/acciones'
import type { Explicacion, TipoCifra } from '@/server/tablero/queries'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoSelect,
  Dato,
  FilaLista,
  HojaInferior,
  Insignia,
  Lista,
  ListaDatos,
  TituloSeccion,
} from '@/components/ui'
import { BarrasPorUnidad, BarraComposicion } from './Graficos'
import { cn } from '@/lib/cn'
import {
  haceCuanto,
  moneda,
  monedaCorta,
  numero,
  plural,
  porcentaje,
  porcentajeDirecto,
  primeraMayuscula,
} from '@/lib/formato'

/* =====================================================================
   El tablero del dueño.

   Es la pantalla que decide si el proyecto se aprueba. Tiene que ser
   clara, confiable y verse bien tanto en el celular como en una
   pantalla grande.
   ===================================================================== */

export function Tablero({
  datos,
  operacion,
  unidades,
  periodoClave,
  unidadFiltrada,
}: {
  datos: DatosTablero
  operacion: OperacionHoy
  unidades: Array<{ id: string; nombre: string }>
  periodoClave: string
  unidadFiltrada: string | null
}) {
  const router = useRouter()
  const [, empezar] = useTransition()
  const [personalizado, setPersonalizado] = useState(
    periodoClave === 'personalizado',
  )
  const [explicando, setExplicando] = useState<Explicacion | null>(null)
  const [cargandoExplicacion, setCargandoExplicacion] = useState(false)

  const { empresa, unidades: porUnidad, obras, anterior, sincronizacion } = datos

  const irA = (parametros: Record<string, string | null>) => {
    const url = new URLSearchParams()
    if (parametros.periodo ?? periodoClave) {
      url.set('periodo', parametros.periodo ?? periodoClave)
    }
    const unidad = parametros.unidad !== undefined ? parametros.unidad : unidadFiltrada
    if (unidad) url.set('unidad', unidad)
    if (parametros.desde) url.set('desde', parametros.desde)
    if (parametros.hasta) url.set('hasta', parametros.hasta)
    empezar(() => router.push(`/tablero?${url.toString()}`))
  }

  const explicar = (tipo: TipoCifra, obraId: string | null = null) => {
    setCargandoExplicacion(true)
    setExplicando(null)
    empezar(async () => {
      const e = await accionExplicar(
        tipo,
        obraId,
        datos.periodo.desde.toISOString(),
        datos.periodo.hasta.toISOString(),
      )
      setExplicando(e)
      setCargandoExplicacion(false)
    })
  }

  const variacion = (actual: number, previo: number): number | null => {
    if (previo === 0) return null
    return ((actual - previo) / Math.abs(previo)) * 100
  }

  const varIngresos = variacion(empresa.ingresos, anterior.ingresos)
  const varResultado = variacion(empresa.resultado, anterior.resultado)

  return (
    <div data-ancho="tablero" className="pb-8">
      {/* Un tablero con datos viejos es peor que no tener tablero. */}
      {sincronizacion.atrasada && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico" titulo="Los datos pueden estar desactualizados">
            {sincronizacion.ultima
              ? `La última sincronización con el sistema base fue ${haceCuanto(sincronizacion.ultima)}.`
              : 'Todavía no se sincronizó nunca con el sistema base.'}{' '}
            <Link href="/mas/sincronizacion" className="underline">
              Sincronizar ahora
            </Link>
            .
          </AvisoFijo>
        </div>
      )}

      {/* Selector de período */}
      <div className="border-b border-niebla bg-blanco px-4 py-3">
        <CampoSelect
          name="periodo"
          etiqueta="Período"
          contenedorClassName="lg:max-w-[280px]"
          value={periodoClave}
          onChange={(e) => {
            const v = e.target.value
            setPersonalizado(v === 'personalizado')
            if (v !== 'personalizado') irA({ periodo: v })
          }}
          opciones={[
            { valor: 'este-mes', texto: 'Este mes' },
            { valor: 'mes-anterior', texto: 'Mes anterior' },
            { valor: 'ultimos-3-meses', texto: 'Últimos 3 meses' },
            { valor: 'este-ano', texto: 'Este año' },
            { valor: 'personalizado', texto: 'Personalizado' },
          ]}
        />

        {personalizado && (
          <form
            className="mt-3 grid grid-cols-2 gap-2"
            action={(fd: FormData) =>
              irA({
                periodo: 'personalizado',
                desde: String(fd.get('desde') ?? ''),
                hasta: String(fd.get('hasta') ?? ''),
              })
            }
          >
            <CampoFecha
              name="desde"
              etiqueta="Desde"
              defaultValue={datos.periodo.desde.toISOString().slice(0, 10)}
              required
            />
            <CampoFecha
              name="hasta"
              etiqueta="Hasta"
              defaultValue={datos.periodo.hasta.toISOString().slice(0, 10)}
              required
            />
            <Boton type="submit" ancho tamano="chico" className="col-span-2">
              Aplicar
            </Boton>
          </form>
        )}

        <p className="mt-2 text-menor text-metadato">
          {primeraMayuscula(datos.periodo.etiqueta)} · todos los montos en pesos
        </p>
      </div>

      {/* ===================== BLOQUE 1: LA EMPRESA ==================== */}
      <TituloSeccion>La empresa</TituloSeccion>

      <div className="grid grid-cols-2 gap-px border-y border-niebla bg-niebla sm:grid-cols-4">
        <Cifra
          etiqueta="Ingresos"
          valor={empresa.ingresos}
          variacion={varIngresos}
          alExplicar={() => explicar('ingresos')}
        />
        <Cifra
          etiqueta="Costos"
          valor={empresa.costoTotal}
          invertirColor
          alExplicar={() => explicar('materiales')}
        />
        <Cifra
          etiqueta="Resultado"
          valor={empresa.resultado}
          variacion={varResultado}
          resaltar
        />
        <Cifra
          etiqueta="Margen"
          valor={empresa.margen}
          esPorcentaje
          resaltar
        />
      </div>

      <div className="px-4 pt-3">
        <AvisoFijo
          tono={empresa.resultadoNeto >= 0 ? 'correcto' : 'critico'}
          titulo={`Resultado después de la estructura: ${moneda(empresa.resultadoNeto)}`}
        >
          Las obras dejaron {moneda(empresa.resultado)} y la estructura se llevó{' '}
          {moneda(empresa.estructura.total)}, el{' '}
          {porcentajeDirecto(empresa.estructura.porcentajeDeIngresos)} de los
          ingresos.
        </AvisoFijo>
      </div>

      {/* ============== BLOQUE 2: POR UNIDAD DE NEGOCIO ================ */}
      <TituloSeccion
        accion={
          unidadFiltrada ? (
            <button
              type="button"
              onClick={() => irA({ unidad: null })}
              className="text-menor text-grafito underline"
            >
              Ver todas
            </button>
          ) : undefined
        }
      >
        Por unidad de negocio
      </TituloSeccion>

      {/* El gráfico y el detalle lado a lado: a 1664px poner uno debajo
          del otro obliga a scrollear para comparar lo mismo. */}
      <div className="lg:flex lg:items-start lg:gap-6">
      <div className="border-y border-niebla bg-blanco px-2 py-3 lg:flex-1 lg:rounded-[var(--radius-panel)] lg:border">
        <BarrasPorUnidad
          datos={porUnidad.map((u) => ({
            nombre: u.nombre,
            ingresos: u.ingresos,
            costoTotal: u.costoTotal,
            resultado: u.resultado,
          }))}
          activa={
            unidadFiltrada
              ? (unidades.find((u) => u.id === unidadFiltrada)?.nombre ?? null)
              : null
          }
          alTocar={(nombre) => {
            const unidad = unidades.find((u) => u.nombre === nombre)
            if (unidad) {
              irA({ unidad: unidad.id === unidadFiltrada ? null : unidad.id })
            }
          }}
        />
      </div>

      <Lista className="lg:w-[440px] lg:shrink-0 lg:rounded-[var(--radius-panel)] lg:border">
        {porUnidad.map((u) => (
          <FilaLista
            key={u.unidadId}
            titulo={u.nombre}
            subtitulo={`${plural(u.obras, 'obra')} · ingresos ${monedaCorta(u.ingresos)}`}
            derecha={moneda(u.resultado)}
            tono={u.resultado < 0 ? 'critico' : 'neutro'}
            debajoDerecha={
              <Insignia tono={u.resultado < 0 ? 'critico' : 'correcto'}>
                {porcentaje(u.margen)}
              </Insignia>
            }
            alTocar={() =>
              irA({ unidad: u.unidadId === unidadFiltrada ? null : u.unidadId })
            }
            flecha={false}
          />
        ))}
      </Lista>
      </div>

      {/* ==================== BLOQUE 3: POR OBRA ====================== */}
      <TituloSeccion>Por obra</TituloSeccion>

      {obras.length === 0 ? (
        <p className="px-4 pb-4 text-chico text-grafito">
          No hay obras con movimiento en este período.
        </p>
      ) : (
        <>
          {/* En pantalla grande, tabla. En el celular, la lista de abajo. */}
          <div className="scroll-lateral scroll-fino hidden border-y border-niebla bg-blanco sm:block">
            <table className="w-full min-w-[720px] text-left lg:min-w-0">
              <thead>
                <tr className="border-b border-niebla">
                  {['Obra', 'Ingresos', 'Costo', 'Resultado', 'Margen', 'Composición'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-menor font-medium text-grafito"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-niebla">
                {obras.map((o) => (
                  <FilaTabla key={o.obraId} obra={o} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden">
            <Lista>
              {obras.map((o) => (
                <FilaLista
                  key={o.obraId}
                  titulo={o.nombre}
                  subtitulo={`${o.codigo} · ${o.unidadNegocio}`}
                  detalle={`Ingresos ${monedaCorta(o.ingresos)} · costo ${monedaCorta(o.costoTotal)}`}
                  derecha={moneda(o.resultado)}
                  tono={
                    o.resultado < 0 ||
                    (o.consumoPresupuesto !== null && o.consumoPresupuesto > 1)
                      ? 'critico'
                      : 'neutro'
                  }
                  debajoDerecha={
                    <div className="flex flex-col items-end gap-1">
                      <Insignia tono={o.resultado < 0 ? 'critico' : 'correcto'}>
                        {porcentaje(o.margen)}
                      </Insignia>
                      {o.consumoPresupuesto !== null && o.consumoPresupuesto > 0.85 && (
                        <Insignia
                          tono={o.consumoPresupuesto > 1 ? 'critico' : 'aviso'}
                        >
                          MO {porcentaje(o.consumoPresupuesto)}
                        </Insignia>
                      )}
                    </div>
                  }
                  href={`/tablero/obra/${o.obraId}?periodo=${periodoClave}`}
                />
              ))}
            </Lista>
          </div>
        </>
      )}

      {/* ================== BLOQUE 4: ESTRUCTURA ====================== */}
      <TituloSeccion>Estructura</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Gastos fijos del período">
            {moneda(empresa.estructura.total)}
          </Dato>
          <Dato etiqueta="Sobre los ingresos">
            {porcentajeDirecto(empresa.estructura.porcentajeDeIngresos)}
          </Dato>
        </ListaDatos>
      </div>

      {empresa.estructura.detalle.length > 0 && (
        <Lista>
          {empresa.estructura.detalle.slice(0, 8).map((d) => (
            <FilaLista
              key={d.descripcion}
              titulo={d.descripcion}
              derecha={moneda(d.monto)}
              flecha={false}
            />
          ))}
        </Lista>
      )}

      <p className="px-4 pt-2 text-menor text-metadato">
        Los gastos de estructura no se reparten entre las obras: son de la
        empresa.
      </p>

      {/* ================= BLOQUE 5: OPERACIÓN HOY ==================== */}
      <TituloSeccion>La operación hoy</TituloSeccion>
      <div className="grid grid-cols-2 gap-px border-y border-niebla bg-niebla sm:grid-cols-3 xl:grid-cols-6">
        <Simple
          etiqueta="Personas trabajando"
          valor={numero(operacion.personasTrabajando)}
          detalle={`en ${plural(operacion.obrasConGente, 'obra')}`}
        />
        <Simple
          etiqueta="Ausentismo del mes"
          valor={porcentajeDirecto(operacion.ausentismo.porcentaje)}
          detalle={`${operacion.ausentismo.ausencias} de ${operacion.ausentismo.jornadas} jornadas`}
          tono={operacion.ausentismo.porcentaje > 8 ? 'aviso' : 'neutro'}
        />
        <Simple
          etiqueta="Vehículos en viaje"
          valor={numero(operacion.vehiculosEnViaje)}
          detalle={`uso de flota ${porcentajeDirecto(operacion.usoFlota, 0)}`}
        />
        <Simple
          etiqueta="Herramientas en obra"
          valor={numero(operacion.herramientasEnObra)}
          detalle={monedaCorta(operacion.valorHerramientasEnObra)}
        />
        <Simple
          etiqueta="Compras evitadas"
          valor={monedaCorta(operacion.comprasEvitadas.monto)}
          detalle={plural(
            operacion.comprasEvitadas.cantidad,
            'solicitud resuelta',
            'solicitudes resueltas',
          )}
          tono="correcto"
        />
        <Simple
          etiqueta="Alertas críticas"
          valor={numero(operacion.alertasCriticas)}
          detalle={`${operacion.alertasAbiertas} abiertas`}
          tono={operacion.alertasCriticas > 0 ? 'critico' : 'neutro'}
        />
      </div>

      {/* Exportar */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-6 lg:max-w-[420px]">
        <a
          href={`/api/tablero/exportar?formato=csv&periodo=${periodoClave}&desde=${datos.periodo.desde.toISOString()}&hasta=${datos.periodo.hasta.toISOString()}`}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-[var(--radius-control)] border border-niebla bg-blanco text-base font-medium text-negro active:bg-hueso"
        >
          <Download aria-hidden className="size-4" />
          Excel
        </a>
        <a
          href={`/tablero/imprimir?periodo=${periodoClave}&desde=${datos.periodo.desde.toISOString()}&hasta=${datos.periodo.hasta.toISOString()}`}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-negro text-base font-medium text-blanco active:bg-carbon"
        >
          <Download aria-hidden className="size-4" />
          PDF
        </a>
      </div>

      {/* De dónde sale cada número */}
      <HojaInferior
        abierta={explicando !== null || cargandoExplicacion}
        alCerrar={() => setExplicando(null)}
        titulo={explicando?.titulo ?? 'De dónde sale'}
        descripcion={primeraMayuscula(datos.periodo.etiqueta)}
      >
        {cargandoExplicacion ? (
          <p className="text-base text-grafito">Buscando…</p>
        ) : explicando ? (
          <>
            <ListaDatos className="px-0">
              {explicando.lineas.map((l) => (
                <Dato key={l.etiqueta} etiqueta={l.etiqueta}>
                  {l.valor}
                </Dato>
              ))}
            </ListaDatos>
            {explicando.ultimaSync && (
              <p className="mt-3 border-t border-niebla pt-3 text-menor text-metadato">
                Última sincronización con el sistema base:{' '}
                {haceCuanto(explicando.ultimaSync)}.
              </p>
            )}
          </>
        ) : null}
      </HojaInferior>
    </div>
  )
}

/* --------------------------- PIEZAS --------------------------------- */

function Cifra({
  etiqueta,
  valor,
  variacion,
  esPorcentaje,
  resaltar,
  invertirColor,
  alExplicar,
}: {
  etiqueta: string
  valor: number
  variacion?: number | null
  esPorcentaje?: boolean
  resaltar?: boolean
  invertirColor?: boolean
  alExplicar?: () => void
}) {
  const negativo = valor < 0
  const color = resaltar
    ? negativo
      ? 'text-critico'
      : 'text-correcto'
    : 'text-negro'

  return (
    <div className="bg-blanco px-3 py-3">
      <div className="flex items-start justify-between gap-1">
        <p className="text-menor text-grafito">{etiqueta}</p>
        {alExplicar && (
          <button
            type="button"
            onClick={alExplicar}
            aria-label={`De dónde sale ${etiqueta}`}
            className="-mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded text-metadato active:bg-hueso"
          >
            <Info aria-hidden className="size-3.5" />
          </button>
        )}
      </div>

      <p className={cn('cifras mt-0.5 text-cifra font-medium', color)}>
        {esPorcentaje ? porcentaje(valor) : monedaCorta(valor)}
      </p>

      {variacion !== null && variacion !== undefined && (
        <p
          className={cn(
            'mt-0.5 flex items-center gap-0.5 text-micro',
            variacion > 0
              ? invertirColor
                ? 'text-critico'
                : 'text-correcto'
              : variacion < 0
                ? invertirColor
                  ? 'text-correcto'
                  : 'text-critico'
                : 'text-metadato',
          )}
        >
          {variacion > 0 ? (
            <ArrowUpRight aria-hidden className="size-3" />
          ) : variacion < 0 ? (
            <ArrowDownRight aria-hidden className="size-3" />
          ) : (
            <Minus aria-hidden className="size-3" />
          )}
          {porcentajeDirecto(Math.abs(variacion), 0)} vs. período anterior
        </p>
      )}
    </div>
  )
}

function Simple({
  etiqueta,
  valor,
  detalle,
  tono = 'neutro',
}: {
  etiqueta: string
  valor: string
  detalle?: string
  tono?: 'neutro' | 'correcto' | 'aviso' | 'critico'
}) {
  const colores = {
    neutro: 'text-negro',
    correcto: 'text-correcto',
    aviso: 'text-aviso',
    critico: 'text-critico',
  }

  return (
    <div className="bg-blanco px-3 py-3">
      <p className="text-menor text-grafito">{etiqueta}</p>
      <p className={cn('cifras mt-0.5 text-grande font-medium', colores[tono])}>
        {valor}
      </p>
      {detalle && <p className="text-micro text-metadato">{detalle}</p>}
    </div>
  )
}

function FilaTabla({ obra }: { obra: ObraTablero }) {
  const partes = [
    { nombre: 'Materiales', monto: obra.materiales },
    { nombre: 'Mano de obra', monto: obra.manoObra + obra.viaticos },
    { nombre: 'Subcontratos', monto: obra.subcontratos },
    { nombre: 'Equipos', monto: obra.equipos },
    { nombre: 'Vehículos', monto: obra.vehiculos },
    { nombre: 'Herramientas', monto: obra.herramientas },
    { nombre: 'Otros', monto: obra.otrosExternos },
  ]

  const enRojo =
    obra.resultado < 0 ||
    (obra.consumoPresupuesto !== null && obra.consumoPresupuesto > 1)

  return (
    <tr className={cn(enRojo && 'bg-[var(--color-critico-suave)]')}>
      <td className="px-3 py-2.5">
        <Link href={`/tablero/obra/${obra.obraId}`} className="hover:underline">
          <span className="block text-base text-negro">{obra.nombre}</span>
          <span className="block text-micro text-metadato">
            {obra.codigo} · {obra.unidadNegocio}
          </span>
        </Link>
      </td>
      <td className="cifras px-3 py-2.5 text-base text-negro">
        {monedaCorta(obra.ingresos)}
      </td>
      <td className="cifras px-3 py-2.5 text-base text-negro">
        {monedaCorta(obra.costoTotal)}
      </td>
      <td
        className={cn(
          'cifras px-3 py-2.5 text-base font-medium',
          obra.resultado < 0 ? 'text-critico' : 'text-correcto',
        )}
      >
        {monedaCorta(obra.resultado)}
      </td>
      <td className="cifras px-3 py-2.5 text-base text-negro">
        {porcentaje(obra.margen)}
      </td>
      <td className="px-3 py-2.5" style={{ minWidth: 180 }}>
        <BarraComposicion partes={partes} total={obra.costoTotal} />
      </td>
    </tr>
  )
}
