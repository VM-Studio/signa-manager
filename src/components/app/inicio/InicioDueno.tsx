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
import { numero, plural } from '@/lib/formato'

export function InicioDueno({
  resumen,
  rol,
}: {
  resumen: ResumenEmpresa
  rol: Rol
}) {
  return (
    <>
      <TituloSeccion>La empresa hoy</TituloSeccion>
      <GrillaResumen columnas={2}>
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
            {plural(resumen.alertasCriticas, 'alerta crítica', 'alertas críticas')} sin
            resolver. <Link href="/alertas" className="underline">Ver cuáles</Link>.
          </AvisoFijo>
        </div>
      )}

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

      <div className="px-4 pt-5">
        <Link
          href="/tablero"
          className="flex min-h-[64px] items-center gap-3 rounded-[var(--radius-panel)] bg-negro px-4 py-3 text-blanco active:bg-carbon"
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
      </div>

      {rol === Rol.ADMINISTRACION && (
        <div className="px-4 pt-3">
          <Link
            href="/personal/quincenas"
            className="flex min-h-[56px] items-center gap-3 rounded-[var(--radius-panel)] border border-niebla bg-blanco px-4 py-3 active:bg-hueso"
          >
            <span className="min-w-0 flex-1 text-base text-negro">
              Quincenas y pagos
            </span>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-acero" />
          </Link>
        </div>
      )}
    </>
  )
}
