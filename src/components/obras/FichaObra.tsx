import Link from 'next/link'
import { MapPin, RefreshCw } from 'lucide-react'
import { EstadoObra, OrigenDato, TipoObra } from '@prisma/client'
import type {
  PedidoDeObra,
  ResumenObra,
  comprasDeObra,
  herramientasDeObra,
  personalDeObra,
  vehiculosDeObra,
} from '@/server/obras/queries'
import {
  AvisoFijo,
  BarraProgreso,
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
import { InsigniaEstadoObra } from './EstadoObra'
import {
  fechaCorta,
  haceCuanto,
  hora,
  moneda,
  monedaCorta,
  numero,
  patente,
  plural,
  porcentaje,
  textoEnum,
  textoVencimiento,
} from '@/lib/formato'

type Personal = Awaited<ReturnType<typeof personalDeObra>>
type Herramientas = Awaited<ReturnType<typeof herramientasDeObra>>
type Vehiculos = Awaited<ReturnType<typeof vehiculosDeObra>>
type Compras = Awaited<ReturnType<typeof comprasDeObra>>

interface ObraVista {
  id: string
  codigo: string
  nombre: string
  tipo: TipoObra
  estado: EstadoObra
  cliente: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  esInterior: boolean
  fechaInicio: Date | null
  fechaFinPrevista: Date | null
  fechaFinReal: Date | null
  presupuestoManoObra: number | null
  presupuestoTotal: number | null
  origen: OrigenDato
  ultimaSync: Date | null
  unidadNegocio: { id: string; nombre: string }
  jefeObra: { id: string; nombre: string; email: string } | null
}

export function FichaObra({
  obra,
  activa,
  resumen,
  personal,
  herramientas,
  vehiculos,
  compras,
}: {
  obra: ObraVista
  activa: string
  resumen: ResumenObra
  personal: Personal | null
  herramientas: Herramientas | null
  vehiculos: Vehiculos | null
  compras: Compras | null
}) {
  const base = `/obras/${obra.id}`

  return (
    <>
      <Pestanas
        activa={activa}
        pestanas={[
          { id: 'resumen', texto: 'Resumen', href: base },
          {
            id: 'personal',
            texto: 'Personal',
            cantidad: resumen.personasAsignadas,
            href: `${base}?pestana=personal`,
          },
          {
            id: 'herramientas',
            texto: 'Herramientas',
            cantidad: resumen.herramientasEnObra,
            href: `${base}?pestana=herramientas`,
          },
          {
            id: 'vehiculos',
            texto: 'Vehículos',
            href: `${base}?pestana=vehiculos`,
          },
          {
            id: 'compras',
            texto: 'Compras',
            cantidad: resumen.pedidosPendientes,
            href: `${base}?pestana=compras`,
          },
        ]}
      />

      {activa === 'resumen' && <PanelResumen obra={obra} resumen={resumen} />}
      {activa === 'personal' && personal && (
        <PanelPersonal obra={obra} personal={personal} resumen={resumen} />
      )}
      {activa === 'herramientas' && herramientas && (
        <PanelHerramientas datos={herramientas} />
      )}
      {activa === 'vehiculos' && vehiculos && <PanelVehiculos datos={vehiculos} />}
      {activa === 'compras' && compras && <PanelCompras pedidos={compras} />}
    </>
  )
}

/* ============================== RESUMEN ============================== */

function PanelResumen({
  obra,
  resumen,
}: {
  obra: ObraVista
  resumen: ResumenObra
}) {
  const presupuesto = obra.presupuestoManoObra ?? 0
  const consumo = presupuesto > 0 ? resumen.costoManoObra / presupuesto : 0

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
        <InsigniaEstadoObra estado={obra.estado} />
        <Insignia tono="neutro">{obra.unidadNegocio.nombre}</Insignia>
        <Insignia tono="neutro">
          {obra.tipo === TipoObra.PROPIA ? 'Obra propia' : 'Para terceros'}
        </Insignia>
        {obra.esInterior && (
          <Insignia tono="neutro" icono={<MapPin className="size-3" />}>
            Interior
          </Insignia>
        )}
      </div>

      {/* Presupuesto de mano de obra contra lo gastado: es el número que
          más mira el jefe de obra. */}
      {presupuesto > 0 && (
        <>
          <TituloSeccion>Mano de obra</TituloSeccion>
          <div className="border-y border-niebla bg-blanco px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="cifras text-cifra font-medium text-negro">
                {moneda(resumen.costoManoObra)}
              </span>
              <span className="text-menor text-grafito">
                de {moneda(presupuesto)}
              </span>
            </div>
            <BarraProgreso
              fraccion={consumo}
              etiqueta={`${porcentaje(consumo)} del presupuesto de mano de obra`}
              className="mt-3"
            />
            {consumo > 1 && (
              <div className="mt-3">
                <AvisoFijo tono="critico" titulo="Se pasó del presupuesto">
                  Lleva {moneda(resumen.costoManoObra - presupuesto)} por encima
                  de lo previsto.
                </AvisoFijo>
              </div>
            )}
            {consumo > 0.85 && consumo <= 1 && (
              <div className="mt-3">
                <AvisoFijo tono="aviso">
                  Quedan {moneda(presupuesto - resumen.costoManoObra)} de
                  presupuesto de mano de obra.
                </AvisoFijo>
              </div>
            )}
          </div>
        </>
      )}

      <TituloSeccion>En la obra ahora</TituloSeccion>
      <GrillaResumen columnas={3}>
        <NumeroResumen
          etiqueta="Personas"
          valor={numero(resumen.personasAsignadas)}
        />
        <NumeroResumen
          etiqueta="Herramientas"
          valor={numero(resumen.herramientasEnObra)}
          detalle={
            resumen.valorHerramientas > 0
              ? monedaCorta(resumen.valorHerramientas)
              : undefined
          }
        />
        <NumeroResumen etiqueta="Viajes del mes" valor={numero(resumen.viajesDelMes)} />
      </GrillaResumen>

      {resumen.partesSinAprobar > 0 && (
        <div className="px-4 pb-1">
          <AvisoFijo tono="aviso" titulo="Hay partes sin aprobar">
            {plural(resumen.partesSinAprobar, 'parte enviado', 'partes enviados')}{' '}
            esperando aprobación.{' '}
            <Link href="/personal/partes" className="underline">
              Revisarlos
            </Link>
            .
          </AvisoFijo>
        </div>
      )}

      <TituloSeccion>Datos de la obra</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Código">{obra.codigo}</Dato>
          <Dato etiqueta="Unidad de negocio">{obra.unidadNegocio.nombre}</Dato>
          {obra.cliente && <Dato etiqueta="Cliente">{obra.cliente}</Dato>}
          <Dato etiqueta="Jefe de obra">{obra.jefeObra?.nombre ?? 'Sin asignar'}</Dato>
          <Dato etiqueta="Ubicación">
            {[obra.direccion, obra.localidad, obra.provincia]
              .filter(Boolean)
              .join(', ') || '—'}
          </Dato>
        </ListaDatos>
      </div>

      <TituloSeccion>Fechas</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Inicio">{fechaCorta(obra.fechaInicio)}</Dato>
          <Dato etiqueta="Fin previsto">{fechaCorta(obra.fechaFinPrevista)}</Dato>
          {obra.fechaFinReal && (
            <Dato etiqueta="Fin real">{fechaCorta(obra.fechaFinReal)}</Dato>
          )}
        </ListaDatos>
      </div>

      <TituloSeccion>Presupuesto</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Total de la obra">
            {obra.presupuestoTotal ? moneda(obra.presupuestoTotal) : '—'}
          </Dato>
          <Dato etiqueta="Mano de obra">
            {obra.presupuestoManoObra ? moneda(obra.presupuestoManoObra) : '—'}
          </Dato>
          <Dato etiqueta="Gastado en mano de obra">
            {moneda(resumen.costoManoObra)}
          </Dato>
        </ListaDatos>
      </div>

      {/* Si la obra viene del sistema base, se dice de dónde salen los
          datos y cuándo se trajeron por última vez. */}
      {obra.origen === OrigenDato.SISTEMA_BASE && (
        <>
          <TituloSeccion>Sistema base</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Última sincronización">
                {obra.ultimaSync ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw aria-hidden className="size-3 text-metadato" />
                    {haceCuanto(obra.ultimaSync)}
                  </span>
                ) : (
                  'Nunca'
                )}
              </Dato>
            </ListaDatos>
            <p className="pb-4 text-menor text-metadato">
              El código, el nombre, el cliente, el estado y el presupuesto
              total se editan en el sistema base.
            </p>
          </div>
        </>
      )}
    </>
  )
}

/* ============================== PERSONAL ============================= */

function PanelPersonal({
  obra,
  personal,
  resumen,
}: {
  obra: ObraVista
  personal: Personal
  resumen: ResumenObra
}) {
  const presupuesto = obra.presupuestoManoObra ?? 0
  const consumo = presupuesto > 0 ? resumen.costoManoObra / presupuesto : 0

  return (
    <>
      {presupuesto > 0 && (
        <div className="border-b border-niebla bg-blanco px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-menor text-grafito">
              Costo de mano de obra
            </span>
            <span className="cifras text-grande font-medium text-negro">
              {moneda(resumen.costoManoObra)}
            </span>
          </div>
          <BarraProgreso
            fraccion={consumo}
            etiqueta={`${porcentaje(consumo)} de ${moneda(presupuesto)}`}
            className="mt-2"
          />
        </div>
      )}

      {personal.ultimoParte && (
        <>
          <TituloSeccion
            accion={
              <Link href="/personal/partes" className="text-menor text-grafito underline">
                Ver partes
              </Link>
            }
          >
            Último parte diario
          </TituloSeccion>
          <Lista>
            <FilaLista
              titulo={fechaCorta(personal.ultimoParte.fecha)}
              subtitulo={`${plural(personal.ultimoParte._count.lineas, 'persona')} en el parte`}
              debajoDerecha={
                <Insignia
                  tono={
                    personal.ultimoParte.estado === 'APROBADO'
                      ? 'correcto'
                      : personal.ultimoParte.estado === 'ENVIADO'
                        ? 'aviso'
                        : 'neutro'
                  }
                >
                  {textoEnum(personal.ultimoParte.estado)}
                </Insignia>
              }
            />
          </Lista>
        </>
      )}

      <TituloSeccion>Asignados a la obra</TituloSeccion>
      {personal.empleados.length === 0 ? (
        <EstadoVacio
          titulo="Nadie asignado a esta obra"
          mensaje="Asigná personal desde la planificación."
          accion={{ texto: 'Ir a planificación', href: '/personal/planificacion' }}
        />
      ) : (
        <Lista>
          {personal.empleados.map((e) => (
            <FilaLista
              key={e.asignacionId}
              titulo={`${e.apellido}, ${e.nombre}`}
              subtitulo={`Legajo ${e.legajo} · ${textoEnum(e.categoria)}`}
              detalle={e.especialidad ?? e.tarea ?? undefined}
              href={`/personal/empleados/${e.id}`}
            />
          ))}
        </Lista>
      )}

      {personal.subcontratistas.length > 0 && (
        <>
          <TituloSeccion>Subcontratistas</TituloSeccion>
          <Lista>
            {personal.subcontratistas.map((s) => (
              <FilaLista
                key={s.id}
                titulo={s.razonSocial}
                subtitulo={textoEnum(s.rubro)}
                href={`/personal/subcontratistas/${s.id}`}
              />
            ))}
          </Lista>
        </>
      )}
    </>
  )
}

/* ============================ HERRAMIENTAS =========================== */

function PanelHerramientas({ datos }: { datos: Herramientas }) {
  const valorTotal = datos.unitarias.reduce((a, h) => a + h.valorCompra, 0)
  const vencidas = datos.unitarias.filter((h) => h.vencida)

  if (datos.unitarias.length === 0 && datos.existencias.length === 0) {
    return (
      <EstadoVacio
        titulo="No hay herramientas en esta obra"
        mensaje="Cuando el pañol entregue una herramienta a esta obra, aparece acá."
        accion={{ texto: 'Ir a herramientas', href: '/herramientas' }}
      />
    )
  }

  return (
    <>
      <GrillaResumen columnas={3}>
        <NumeroResumen
          etiqueta="Herramientas"
          valor={numero(datos.unitarias.length)}
          detalle={valorTotal > 0 ? `${monedaCorta(valorTotal)} en valor` : undefined}
        />
        <NumeroResumen
          etiqueta="Vencidas"
          valor={numero(vencidas.length)}
          tono={vencidas.length > 0 ? 'critico' : 'neutro'}
        />
        <NumeroResumen
          etiqueta="Costo del mes"
          valor={monedaCorta(datos.costoImputado)}
          detalle="días en obra"
        />
      </GrillaResumen>

      {datos.unitarias.length > 0 && (
        <>
          <TituloSeccion>En la obra</TituloSeccion>
          <Lista>
            {datos.unitarias.map((h) => (
              <FilaLista
                key={h.id}
                titulo={h.nombre}
                subtitulo={`${h.codigo}${h.marca ? ` · ${h.marca}` : ''}`}
                detalle={
                  h.responsableActual
                    ? `${h.responsableActual.nombre} ${h.responsableActual.apellido}`
                    : 'Sin responsable asignado'
                }
                tono={h.vencida ? 'critico' : 'neutro'}
                debajoDerecha={
                  h.fechaDevolucionPrevista ? (
                    <Insignia tono={h.vencida ? 'critico' : 'neutro'}>
                      {textoVencimiento(h.fechaDevolucionPrevista)}
                    </Insignia>
                  ) : undefined
                }
                href={`/herramientas/${h.id}`}
              />
            ))}
          </Lista>
        </>
      )}

      {datos.existencias.length > 0 && (
        <>
          <TituloSeccion>Por cantidad</TituloSeccion>
          <Lista>
            {datos.existencias.map((e) => (
              <FilaLista
                key={e.id}
                titulo={e.herramienta.nombre}
                subtitulo={e.herramienta.codigo}
                derecha={numero(e.cantidad)}
                href={`/herramientas/${e.herramienta.id}`}
              />
            ))}
          </Lista>
        </>
      )}
    </>
  )
}

/* ============================== VEHÍCULOS ============================ */

function PanelVehiculos({ datos }: { datos: Vehiculos }) {
  const programados = datos.viajes.filter(
    (v) => v.estado === 'PROGRAMADO' || v.estado === 'EN_CURSO',
  )
  const hechos = datos.viajes.filter((v) => v.estado === 'FINALIZADO')

  return (
    <>
      <GrillaResumen columnas={3}>
        <NumeroResumen etiqueta="Viajes hechos" valor={numero(hechos.length)} />
        <NumeroResumen
          etiqueta="Programados"
          valor={numero(programados.length)}
        />
        <NumeroResumen
          etiqueta="Costo del mes"
          valor={monedaCorta(datos.costoDelMes)}
        />
      </GrillaResumen>

      {datos.solicitudesPendientes > 0 && (
        <div className="px-4 pb-1">
          <AvisoFijo tono="aviso">
            {plural(
              datos.solicitudesPendientes,
              'solicitud de viaje pendiente',
              'solicitudes de viaje pendientes',
            )}
            .{' '}
            <Link href="/vehiculos/solicitudes" className="underline">
              Ver
            </Link>
            .
          </AvisoFijo>
        </div>
      )}

      {programados.length > 0 && (
        <>
          <TituloSeccion>Programados y en curso</TituloSeccion>
          <Lista>
            {programados.map((v) => (
              <FilaLista
                key={v.id}
                titulo={v.destino}
                subtitulo={`${patente(v.vehiculo.patente)} · ${v.chofer.nombre} ${v.chofer.apellido}`}
                derecha={`${fechaCorta(v.salidaPrevista)} ${hora(v.salidaPrevista)}`}
                debajoDerecha={
                  <Insignia tono={v.estado === 'EN_CURSO' ? 'correcto' : 'neutro'}>
                    {v.estado === 'EN_CURSO' ? 'En viaje' : 'Programado'}
                  </Insignia>
                }
                href={`/vehiculos/viajes/${v.id}`}
              />
            ))}
          </Lista>
        </>
      )}

      <TituloSeccion>Viajes hechos</TituloSeccion>
      {hechos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hubo viajes a esta obra"
          mensaje="Cuando logística asigne un viaje, aparece acá."
        />
      ) : (
        <Lista>
          {hechos.map((v) => (
            <FilaLista
              key={v.id}
              titulo={v.destino}
              subtitulo={`${patente(v.vehiculo.patente)} · ${textoEnum(v.tipo)}`}
              detalle={fechaCorta(v.salidaPrevista)}
              derecha={v.costoCalculado > 0 ? moneda(v.costoCalculado) : undefined}
              href={`/vehiculos/viajes/${v.id}`}
            />
          ))}
        </Lista>
      )}
    </>
  )
}

/* =============================== COMPRAS ============================= */

const ESTADO_PEDIDO: Record<string, { texto: string; tono: 'neutro' | 'correcto' | 'aviso' | 'critico' }> = {
  BORRADOR: { texto: 'Borrador', tono: 'neutro' },
  PENDIENTE_APROBACION: { texto: 'Sin aprobar', tono: 'aviso' },
  APROBADO: { texto: 'Aprobado', tono: 'neutro' },
  COMPRADO: { texto: 'Comprado', tono: 'neutro' },
  ENTREGADO_PARCIAL: { texto: 'Entrega parcial', tono: 'aviso' },
  ENTREGADO: { texto: 'Entregado', tono: 'correcto' },
  CANCELADO: { texto: 'Cancelado', tono: 'neutro' },
}

function PanelCompras({ pedidos }: { pedidos: PedidoDeObra[] }) {
  const demorados = pedidos.filter(
    (p) => p.diasDeDemora !== null && p.fechaEntregaReal === null,
  )

  return (
    <>
      {/* Esta aclaración evita la pregunta que va a hacer todo el mundo. */}
      <p className="border-b border-niebla bg-hueso px-4 py-2.5 text-menor text-grafito">
        Los pedidos se cargan y se aprueban en el sistema base. Acá se ven
        para saber qué está trabado.
      </p>

      {demorados.length > 0 && (
        <div className="px-4 pt-3">
          <AvisoFijo tono="critico" titulo="Material que no llegó">
            {plural(demorados.length, 'pedido pasó', 'pedidos pasaron')} la fecha
            en que tenía que estar en obra.
          </AvisoFijo>
        </div>
      )}

      {pedidos.length === 0 ? (
        <EstadoVacio
          titulo="No hay pedidos de compra para esta obra"
          mensaje="Cuando se carguen en el sistema base y se sincronicen, aparecen acá."
        />
      ) : (
        <>
          <TituloSeccion>{plural(pedidos.length, 'pedido')}</TituloSeccion>
          <Lista>
            {pedidos.map((p) => {
              const estado = ESTADO_PEDIDO[p.estado] ?? {
                texto: textoEnum(p.estado),
                tono: 'neutro' as const,
              }
              const sinEntregar = p.diasDeDemora !== null && !p.fechaEntregaReal

              return (
                <FilaLista
                  key={p.id}
                  titulo={p.descripcion}
                  subtitulo={
                    [p.numero, p.proveedor].filter(Boolean).join(' · ') || undefined
                  }
                  detalle={
                    p.fechaNecesariaEnObra
                      ? `Necesario en obra: ${fechaCorta(p.fechaNecesariaEnObra)}`
                      : `Pedido: ${fechaCorta(p.fechaSolicitud)}`
                  }
                  tono={sinEntregar ? 'critico' : 'neutro'}
                  derecha={p.monto ? moneda(p.monto) : undefined}
                  debajoDerecha={
                    <div className="flex flex-col items-end gap-1">
                      <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                      {p.diasDeDemora !== null && (
                        <Insignia tono={sinEntregar ? 'critico' : 'aviso'}>
                          {plural(p.diasDeDemora, 'día', 'días')} de demora
                        </Insignia>
                      )}
                    </div>
                  }
                  flecha={false}
                />
              )
            })}
          </Lista>
        </>
      )}
    </>
  )
}
