import Image from 'next/image'
import Link from 'next/link'
import { Pencil, Printer } from 'lucide-react'
import { TipoControlHerramienta } from '@prisma/client'
import type { HerramientaFicha } from '@/server/herramientas/queries'
import {
  AvisoFijo,
  Dato,
  FilaLista,
  Insignia,
  Lista,
  ListaDatos,
  Tarjeta,
  TituloSeccion,
} from '@/components/ui'
import {
  CONDICION_TEXTO,
  InsigniaEstadoHerramienta,
  MOVIMIENTO_TEXTO,
} from './estado'
import { AccionesHerramienta } from './AccionesHerramienta'
import type { OpcionesMovimiento } from './HojaMovimiento'
import {
  fechaCorta,
  fechaYHora,
  moneda,
  numero,
  plural,
  textoVencimiento,
} from '@/lib/formato'

export function FichaHerramienta({
  herramienta,
  qr,
  opciones,
  puedeOperar,
  puedeEditar,
}: {
  herramienta: HerramientaFicha
  qr: string
  opciones: OpcionesMovimiento
  puedeOperar: boolean
  puedeEditar: boolean
}) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const vencida =
    herramienta.estado === 'EN_OBRA' &&
    herramienta.fechaDevolucionPrevista !== null &&
    herramienta.fechaDevolucionPrevista < hoy

  const mantenimientoVencido =
    herramienta.proximoMantenimiento !== null &&
    herramienta.proximoMantenimiento < hoy &&
    herramienta.estado !== 'BAJA'

  const esPorCantidad =
    herramienta.tipoControl === TipoControlHerramienta.CANTIDAD

  const stockTotal = herramienta.existencias.reduce(
    (a, e) => a + e.cantidad,
    0,
  )

  const ubicacion =
    herramienta.deposito?.nombre ??
    (herramienta.obra
      ? `${herramienta.obra.codigo} · ${herramienta.obra.nombre}`
      : herramienta.estado === 'EN_REPARACION'
        ? 'En el taller'
        : herramienta.estado === 'EXTRAVIADA'
          ? 'Sin ubicar'
          : '—')

  const ultimoMantenimiento = herramienta.mantenimientos[0] ?? null

  return (
    <div className="pb-8">
      {/* Estado y avisos */}
      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <InsigniaEstadoHerramienta estado={herramienta.estado} />
        <Insignia tono="neutro">{herramienta.categoria.nombre}</Insignia>
        <Insignia
          tono={
            herramienta.condicion === 'BUENA'
              ? 'correcto'
              : herramienta.condicion === 'REGULAR'
                ? 'aviso'
                : 'critico'
          }
        >
          Condición {CONDICION_TEXTO[herramienta.condicion].toLowerCase()}
        </Insignia>
      </div>

      {(vencida || mantenimientoVencido) && (
        <div className="space-y-2 px-4 pt-4">
          {vencida && (
            <AvisoFijo tono="critico" titulo="Devolución vencida">
              Tenía que volver el{' '}
              {fechaCorta(herramienta.fechaDevolucionPrevista)}
              {herramienta.responsableActual
                ? `. La tiene ${herramienta.responsableActual.nombre} ${herramienta.responsableActual.apellido}.`
                : '.'}
            </AvisoFijo>
          )}
          {mantenimientoVencido && (
            <AvisoFijo tono="aviso" titulo="Mantenimiento vencido">
              Tenía que hacerse el{' '}
              {fechaCorta(herramienta.proximoMantenimiento)}. Usarla así acorta
              su vida útil.
            </AvisoFijo>
          )}
        </div>
      )}

      {/* Dónde está ahora: es la pregunta que trae a esta pantalla */}
      <TituloSeccion>Dónde está</TituloSeccion>
      <Tarjeta className="mx-4">
        {esPorCantidad ? (
          <>
            <p className="cifras text-cifra font-medium text-negro">
              {numero(stockTotal)}
            </p>
            <p className="text-menor text-grafito">unidades en total</p>
          </>
        ) : (
          <>
            <p className="text-titulo font-medium text-negro">{ubicacion}</p>
            {herramienta.responsableActual && (
              <p className="mt-0.5 text-menor text-grafito">
                A cargo de {herramienta.responsableActual.nombre}{' '}
                {herramienta.responsableActual.apellido} · legajo{' '}
                {herramienta.responsableActual.legajo}
              </p>
            )}
            {herramienta.fechaDevolucionPrevista && (
              <p className="mt-1 text-menor text-acero">
                {textoVencimiento(herramienta.fechaDevolucionPrevista)}
              </p>
            )}
          </>
        )}
      </Tarjeta>

      {esPorCantidad && herramienta.existencias.length > 0 && (
        <>
          <TituloSeccion>Repartida en</TituloSeccion>
          <Lista>
            {herramienta.existencias
              .filter((e) => e.cantidad > 0)
              .map((e) => (
                <FilaLista
                  key={e.id}
                  titulo={
                    e.deposito?.nombre ??
                    (e.obra ? `${e.obra.codigo} · ${e.obra.nombre}` : 'Sin ubicar')
                  }
                  derecha={numero(e.cantidad)}
                  flecha={false}
                />
              ))}
          </Lista>
        </>
      )}

      <AccionesHerramienta
        herramienta={{
          id: herramienta.id,
          codigo: herramienta.codigo,
          nombre: herramienta.nombre,
          estado: herramienta.estado,
          tipoControl: herramienta.tipoControl,
          depositoId: herramienta.depositoId,
          obraId: herramienta.obraId,
        }}
        nombre={herramienta.nombre}
        stockDisponible={esPorCantidad ? stockTotal : undefined}
        opciones={opciones}
        puedeOperar={puedeOperar}
      />

      {/* Datos */}
      <TituloSeccion
        accion={
          puedeEditar ? (
            <Link
              href={`/herramientas/${herramienta.id}/editar`}
              className="flex items-center gap-1 text-menor text-grafito underline"
            >
              <Pencil aria-hidden className="size-3" />
              Editar
            </Link>
          ) : undefined
        }
      >
        Datos
      </TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Código">{herramienta.codigo}</Dato>
          <Dato etiqueta="Marca">{herramienta.marca ?? '—'}</Dato>
          <Dato etiqueta="Modelo">{herramienta.modelo ?? '—'}</Dato>
          <Dato etiqueta="Nº de serie">{herramienta.nroSerie ?? '—'}</Dato>
          <Dato etiqueta="Fecha de compra">
            {fechaCorta(herramienta.fechaCompra)}
          </Dato>
          <Dato etiqueta="Valor de compra">
            {herramienta.valorCompra ? moneda(herramienta.valorCompra) : '—'}
          </Dato>
          {herramienta.costoDiarioImputable && (
            <Dato etiqueta="Costo diario a la obra">
              {moneda(herramienta.costoDiarioImputable)}
            </Dato>
          )}
          <Dato etiqueta="Proveedor">{herramienta.proveedor ?? '—'}</Dato>
        </ListaDatos>
        {herramienta.notas && (
          <p className="px-0 pb-4 text-chico text-grafito">{herramienta.notas}</p>
        )}
      </div>

      {/* QR */}
      <TituloSeccion
        accion={
          <Link
            href={`/herramientas/etiquetas?ids=${herramienta.id}`}
            className="flex items-center gap-1 text-menor text-grafito underline"
          >
            <Printer aria-hidden className="size-3" />
            Imprimir etiqueta
          </Link>
        }
      >
        Código QR
      </TituloSeccion>
      <div className="flex flex-col items-center gap-2 border-y border-niebla bg-blanco px-4 py-5">
        <Image
          src={qr}
          alt={`Código QR de ${herramienta.codigo}`}
          width={160}
          height={160}
          unoptimized
          className="size-40"
        />
        <p className="cifras text-base font-medium text-negro">
          {herramienta.codigo}
        </p>
        <p className="text-menor text-acero">
          Escaneándolo se abre esta ficha.
        </p>
      </div>

      {/* Mantenimiento */}
      <TituloSeccion
        accion={
          puedeEditar ? (
            <Link
              href={`/herramientas/${herramienta.id}/mantenimiento`}
              className="text-menor text-grafito underline"
            >
              Registrar
            </Link>
          ) : undefined
        }
      >
        Mantenimiento
      </TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Cada">
            {herramienta.mantenimientoCadaDias
              ? plural(herramienta.mantenimientoCadaDias, 'día')
              : 'Sin frecuencia definida'}
          </Dato>
          <Dato etiqueta="Último">
            {ultimoMantenimiento ? fechaCorta(ultimoMantenimiento.fecha) : '—'}
          </Dato>
          <Dato etiqueta="Próximo">
            {herramienta.proximoMantenimiento
              ? textoVencimiento(herramienta.proximoMantenimiento)
              : '—'}
          </Dato>
        </ListaDatos>
      </div>

      {herramienta.mantenimientos.length > 0 && (
        <Lista>
          {herramienta.mantenimientos.slice(0, 5).map((m) => (
            <FilaLista
              key={m.id}
              titulo={m.descripcion}
              subtitulo={`${m.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo'} · ${fechaCorta(m.fecha)}`}
              detalle={m.proveedor ?? undefined}
              derecha={m.costo ? moneda(m.costo) : undefined}
              flecha={false}
            />
          ))}
        </Lista>
      )}

      {/* Línea de tiempo */}
      <TituloSeccion>Historial</TituloSeccion>
      <Lista>
        {herramienta.movimientos.map((m) => {
          const desde =
            m.origenDeposito?.nombre ??
            (m.origenObra ? `${m.origenObra.codigo}` : null)
          const hasta =
            m.destinoDeposito?.nombre ??
            (m.destinoObra ? `${m.destinoObra.codigo}` : null)

          return (
            <FilaLista
              key={m.id}
              titulo={MOVIMIENTO_TEXTO[m.tipo]}
              subtitulo={
                [
                  desde && hasta ? `${desde} → ${hasta}` : (hasta ?? desde),
                  m.recibidoPor
                    ? `Recibió ${m.recibidoPor.nombre} ${m.recibidoPor.apellido}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              detalle={
                [
                  fechaYHora(m.fecha),
                  `por ${m.registradoPor.nombre}`,
                  m.condicion ? `condición ${CONDICION_TEXTO[m.condicion].toLowerCase()}` : null,
                  m.observaciones,
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              flecha={false}
            />
          )
        })}
      </Lista>
    </div>
  )
}
