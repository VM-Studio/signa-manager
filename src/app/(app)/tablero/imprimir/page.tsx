import Image from 'next/image'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import {
  armarPeriodo,
  calcularTablero,
  type ClavePeriodo,
} from '@/lib/calculos/tablero'
import { operacionHoy } from '@/server/tablero/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { BotonImprimir } from '@/components/tablero/BotonImprimir'
import {
  fechaLarga,
  moneda,
  numero,
  porcentaje,
  porcentajeDirecto,
  primeraMayuscula,
} from '@/lib/formato'

export const dynamic = 'force-dynamic'

/**
 * El resumen del período listo para imprimir o guardar como PDF.
 *
 * No se genera el PDF en el servidor a propósito: el "Guardar como PDF"
 * del navegador ya lo hace, sale con el tipografía correcta y no hay que
 * mantener una librería de 40 MB para esto.
 */
export default async function PaginaImprimir({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>
}) {
  const sesion = await sesionConPermiso('tablero.ver')
  if (!sesion) return <SinPermiso titulo="Resumen" />

  const sp = await searchParams
  const periodo = armarPeriodo(
    (sp.periodo as ClavePeriodo) ?? 'este-mes',
    sp.desde,
    sp.hasta,
  )

  const [datos, operacion] = await Promise.all([
    calcularTablero(periodo),
    operacionHoy(periodo.desde, periodo.hasta),
  ])

  return (
    <div className="bg-blanco px-6 py-6 print:px-0 print:py-0">
      <div className="no-imprimir mb-6">
        <BotonImprimir />
      </div>

      {/* Membrete */}
      <header className="mb-6 flex items-start justify-between gap-4 border-b-2 border-negro pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center bg-negro">
            <Image
              src="/signalogo.png"
              alt="Signa"
              width={80}
              height={45}
              className="h-auto w-10 object-contain"
            />
          </span>
          <div>
            <p className="text-titulo font-bold text-negro">SIGNA</p>
            <p className="text-menor text-grafito">Resumen de resultados</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-medium text-negro">
            {primeraMayuscula(periodo.etiqueta)}
          </p>
          <p className="text-menor text-grafito">
            Emitido el {fechaLarga(new Date())}
          </p>
        </div>
      </header>

      {/* La empresa */}
      <section className="mb-6">
        <h2 className="mb-2 text-chico font-medium text-grafito">La empresa</h2>
        <table className="w-full border-collapse text-left">
          <tbody className="divide-y divide-niebla">
            {[
              ['Ingresos', moneda(datos.empresa.ingresos)],
              ['Costo de las obras', moneda(datos.empresa.costoTotal)],
              ['Resultado de las obras', moneda(datos.empresa.resultado)],
              ['Margen de las obras', porcentaje(datos.empresa.margen)],
              ['Gastos de estructura', moneda(datos.empresa.estructura.total)],
              [
                'Estructura sobre ingresos',
                porcentajeDirecto(datos.empresa.estructura.porcentajeDeIngresos),
              ],
            ].map(([etiqueta, valor]) => (
              <tr key={etiqueta}>
                <td className="py-1.5 text-base text-grafito">{etiqueta}</td>
                <td className="cifras py-1.5 text-right text-base text-negro">
                  {valor}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-negro">
              <td className="py-2 text-titulo font-medium text-negro">
                Resultado neto
              </td>
              <td className="cifras py-2 text-right text-titulo font-bold text-negro">
                {moneda(datos.empresa.resultadoNeto)} ·{' '}
                {porcentaje(datos.empresa.margenNeto)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Por unidad */}
      <section className="mb-6" style={{ breakInside: 'avoid' }}>
        <h2 className="mb-2 text-chico font-medium text-grafito">
          Por unidad de negocio
        </h2>
        <table className="w-full border-collapse text-left text-chico">
          <thead>
            <tr className="border-b border-negro">
              {['Unidad', 'Obras', 'Ingresos', 'Costo', 'Resultado', 'Margen'].map(
                (h) => (
                  <th key={h} className="py-1.5 font-medium text-grafito">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-niebla">
            {datos.unidades.map((u) => (
              <tr key={u.unidadId}>
                <td className="py-1.5 text-negro">{u.nombre}</td>
                <td className="cifras py-1.5">{u.obras}</td>
                <td className="cifras py-1.5">{moneda(u.ingresos)}</td>
                <td className="cifras py-1.5">{moneda(u.costoTotal)}</td>
                <td className="cifras py-1.5 font-medium">{moneda(u.resultado)}</td>
                <td className="cifras py-1.5">{porcentaje(u.margen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Por obra */}
      <section className="mb-6">
        <h2 className="mb-2 text-chico font-medium text-grafito">Por obra</h2>
        <table className="w-full border-collapse text-left text-menor">
          <thead>
            <tr className="border-b border-negro">
              {[
                'Código',
                'Obra',
                'Ingresos',
                'Materiales',
                'Mano de obra',
                'Otros',
                'Costo',
                'Resultado',
                'Margen',
              ].map((h) => (
                <th key={h} className="py-1.5 font-medium text-grafito">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-niebla">
            {datos.obras.map((o) => (
              <tr key={o.obraId} style={{ breakInside: 'avoid' }}>
                <td className="cifras py-1.5">{o.codigo}</td>
                <td className="py-1.5 text-negro">{o.nombre}</td>
                <td className="cifras py-1.5">{moneda(o.ingresos)}</td>
                <td className="cifras py-1.5">{moneda(o.materiales)}</td>
                <td className="cifras py-1.5">{moneda(o.manoObra + o.viaticos)}</td>
                <td className="cifras py-1.5">
                  {moneda(
                    o.subcontratos + o.equipos + o.vehiculos + o.herramientas + o.otrosExternos,
                  )}
                </td>
                <td className="cifras py-1.5">{moneda(o.costoTotal)}</td>
                <td
                  className={`cifras py-1.5 font-medium ${o.resultado < 0 ? 'text-critico' : ''}`}
                >
                  {moneda(o.resultado)}
                </td>
                <td className="cifras py-1.5">{porcentaje(o.margen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Operación */}
      <section style={{ breakInside: 'avoid' }}>
        <h2 className="mb-2 text-chico font-medium text-grafito">La operación</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Personas trabajando', numero(operacion.personasTrabajando)],
            ['Ausentismo del mes', porcentajeDirecto(operacion.ausentismo.porcentaje)],
            ['Vehículos en viaje', numero(operacion.vehiculosEnViaje)],
            ['Herramientas en obra', numero(operacion.herramientasEnObra)],
            ['Compras evitadas', moneda(operacion.comprasEvitadas.monto)],
            ['Alertas críticas', numero(operacion.alertasCriticas)],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta} className="border border-niebla p-2">
              <p className="text-micro text-grafito">{etiqueta}</p>
              <p className="cifras text-base font-medium text-negro">{valor}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-6 border-t border-niebla pt-3 text-micro text-acero">
        Todos los montos están expresados en pesos. Los movimientos en dólares
        se convierten con el tipo de cambio de cada operación.
        {datos.sincronizacion.ultima && (
          <> Última sincronización con el sistema base: {fechaLarga(datos.sincronizacion.ultima)}.</>
        )}
      </footer>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: #fff; }
          .no-imprimir { display: none !important; }
        }
      `}</style>
    </div>
  )
}
