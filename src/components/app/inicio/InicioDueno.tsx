import { Rol } from '@prisma/client'
import { ArrowRight, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { ResumenEmpresa } from '@/server/nucleo/inicio'
import {
  AvisoFijo,
  GrillaResumen,
  NumeroResumen,
  TituloSeccion,
} from '@/components/ui'
import { monedaCorta, numero, plural, porcentaje } from '@/lib/formato'

/* =====================================================================
   El inicio del dueño y de administración.

   En celular todo va apilado en una columna. En escritorio pasa a una
   grilla de 12 columnas y los bloques cortos se acomodan lado a lado,
   en vez de dejar medio monitor vacío.

   Los bloques van agrupados en contenedores de columna y no sueltos con
   row-start: varios de estos avisos aparecen solo a veces, y con
   row-start fijo el día que no hay alertas críticas se desarma todo.
   ===================================================================== */

export function InicioDueno({
  resumen,
  rol,
}: {
  resumen: ResumenEmpresa
  rol: Rol
}) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-6">
      {resumen.sincronizacionAtrasada && (
        <div className="px-4 pt-4 lg:col-span-12">
          <AvisoFijo tono="aviso" titulo="Datos posiblemente desactualizados">
            La sincronización con el sistema base está atrasada.{' '}
            <Link href="/mas/sincronizacion" className="underline">
              Sincronizar
            </Link>
            .
          </AvisoFijo>
        </div>
      )}

      {/* ---- Versión compacta del bloque 1 del tablero: el resultado ---- */}
      <div className="lg:col-span-12">
        <TituloSeccion
          accion={
            <Link
              href="/tablero"
              className="text-menor text-grafito underline hover:text-negro"
            >
              Ver el tablero
            </Link>
          }
        >
          Este mes
        </TituloSeccion>

        <div className="grid grid-cols-3 gap-px border-y border-niebla bg-niebla">
          <Cifra etiqueta="Ingresos" valor={monedaCorta(resumen.mes.ingresos)} />
          <Cifra etiqueta="Costos" valor={monedaCorta(resumen.mes.costoTotal)} />
          <Cifra
            etiqueta="Resultado"
            valor={monedaCorta(resumen.mes.resultado)}
            pie={porcentaje(resumen.mes.margen)}
            tono={resumen.mes.resultado < 0 ? 'critico' : 'correcto'}
          />
        </div>

        {resumen.mes.estructura > 0 && (
          <p className="px-4 pt-2 text-menor text-metadato">
            Después de {monedaCorta(resumen.mes.estructura)} de estructura, el
            resultado neto es{' '}
            <span
              className={
                resumen.mes.resultadoNeto < 0 ? 'text-critico' : 'text-correcto'
              }
            >
              {monedaCorta(resumen.mes.resultadoNeto)}
            </span>
            .
          </p>
        )}
      </div>

      {/* ------------------------ La empresa hoy ------------------------ */}
      <div className="lg:col-span-8">
        <TituloSeccion>La empresa hoy</TituloSeccion>
        <GrillaResumen columnas={4}>
          <NumeroResumen
            etiqueta="Obras en curso"
            valor={numero(resumen.obrasEnCurso)}
            href="/obras"
          />
          <NumeroResumen
            etiqueta="Personas en obra"
            valor={numero(resumen.personasEnObra)}
            href="/personal/empleados"
          />
          <NumeroResumen
            etiqueta="Vehículos en viaje"
            valor={numero(resumen.vehiculosEnViaje)}
            href="/vehiculos/ahora"
          />
          <NumeroResumen
            etiqueta="Alertas críticas"
            valor={numero(resumen.alertasCriticas)}
            tono={resumen.alertasCriticas > 0 ? 'critico' : 'neutro'}
            href="/alertas"
          />
        </GrillaResumen>

        {resumen.alertasCriticas > 0 && (
          <div className="px-4 pb-1">
            <AvisoFijo tono="critico" titulo="Hay problemas que frenan obra">
              {plural(
                resumen.alertasCriticas,
                'alerta crítica',
                'alertas críticas',
              )}{' '}
              sin resolver.{' '}
              <Link href="/alertas" className="underline">
                Ver cuáles
              </Link>
              .
            </AvisoFijo>
          </div>
        )}
      </div>

      {/* ----------------------- Pañol y compras ----------------------- */}
      <div className="lg:col-span-4">
        <TituloSeccion>Pañol y compras</TituloSeccion>
        <GrillaResumen columnas={2}>
          <NumeroResumen
            etiqueta="Herramientas en obra"
            valor={numero(resumen.herramientasEnObra)}
            href="/herramientas?ubicacion=obra"
          />
          <NumeroResumen
            etiqueta="Solicitudes pendientes"
            valor={numero(resumen.solicitudesPendientes)}
            tono={resumen.solicitudesPendientes > 0 ? 'aviso' : 'neutro'}
            href="/herramientas/solicitudes"
          />
        </GrillaResumen>

        {resumen.comprasEvitadas > 0 && (
          <div className="px-4 pb-1">
            <AvisoFijo tono="correcto" titulo="Compras evitadas este mes">
              {monedaCorta(resumen.comprasEvitadas)} en herramientas que la
              empresa ya tenía y se prestaron en vez de comprar.
            </AvisoFijo>
          </div>
        )}
      </div>

      {/* --------------------------- accesos --------------------------- */}
      <div className="px-4 pt-5 lg:col-span-12 lg:flex lg:gap-3 lg:pt-6">
        <Link
          href="/tablero"
          className="flex min-h-[64px] items-center gap-3 rounded-[var(--radius-panel)] bg-negro px-4 py-3 text-blanco transition-colors hover:bg-carbon active:bg-carbon lg:flex-1"
        >
          <BarChart3 aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">Tablero</span>
            <span className="block text-menor text-acero">
              Costo real y resultado por obra y por área
            </span>
          </span>
          <ArrowRight aria-hidden className="size-4 shrink-0 text-acero" />
        </Link>

        {rol === Rol.ADMINISTRACION && (
          <Link
            href="/personal/quincenas"
            className="mt-3 flex min-h-[56px] items-center gap-3 rounded-[var(--radius-panel)] border border-niebla bg-blanco px-4 py-3 transition-colors hover:bg-hueso active:bg-hueso lg:mt-0 lg:min-h-[64px] lg:flex-1"
          >
            <span className="min-w-0 flex-1 text-base text-negro">
              Quincenas y pagos
            </span>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-metadato" />
          </Link>
        )}
      </div>
    </div>
  )
}

function Cifra({
  etiqueta,
  valor,
  pie,
  tono = 'neutro',
}: {
  etiqueta: string
  valor: string
  pie?: string
  tono?: 'neutro' | 'correcto' | 'critico'
}) {
  const color =
    tono === 'critico'
      ? 'text-critico'
      : tono === 'correcto'
        ? 'text-correcto'
        : 'text-negro'

  return (
    <div className="bg-blanco px-3 py-3 lg:px-5 lg:py-4">
      <p className="text-menor text-grafito">{etiqueta}</p>
      <p className={`cifras mt-0.5 text-grande font-medium lg:text-cifra ${color}`}>
        {valor}
      </p>
      {pie && <p className="text-micro text-metadato">{pie}</p>}
    </div>
  )
}
