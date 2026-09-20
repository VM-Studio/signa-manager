'use client'

import { useState } from 'react'
import { Asistencia, EstadoObra } from '@prisma/client'
import type { EmpleadoFicha } from '@/server/personal/queries'
import { TEXTO_ASISTENCIA } from '@/server/personal/reglas'
import {
  AvisoFijo,
  Boton,
  Dato,
  EnlaceBoton,
  FichaDosColumnas,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  ListaDatos,
  Pestanas,
  TituloSeccion,
} from '@/components/ui'
import { HojasEmpleado, type HojaEmpleado } from './HojasEmpleado'
import { cn } from '@/lib/cn'
import {
  cuil as formatoCuil,
  dni as formatoDni,
  fechaCorta,
  horas,
  moneda,
  nombreNatural,
  numero,
  textoEnum,
  textoVencimiento,
} from '@/lib/formato'

interface DiaAsistencia {
  fecha: Date
  asistencia: Asistencia
  horas: number
  horasNormales: number
  horasExtra50: number
  horasExtra100: number
  costo: number
  obra: string
  aprobado: boolean
}

/** Color de cada tipo de asistencia en el calendario. */
const COLOR_ASISTENCIA: Record<Asistencia, string> = {
  PRESENTE: 'bg-[var(--color-correcto-suave)] text-correcto border-[color-mix(in_srgb,var(--color-correcto)_30%,transparent)]',
  MEDIA_JORNADA: 'bg-niebla text-grafito border-niebla',
  AUSENTE_CON_AVISO: 'bg-[var(--color-aviso-suave)] text-aviso border-[color-mix(in_srgb,var(--color-aviso)_30%,transparent)]',
  AUSENTE_SIN_AVISO: 'bg-[var(--color-critico-suave)] text-critico border-[color-mix(in_srgb,var(--color-critico)_30%,transparent)]',
  LICENCIA: 'bg-hueso text-grafito border-niebla',
  VACACIONES: 'bg-hueso text-grafito border-niebla',
  FERIADO: 'bg-hueso text-metadato border-niebla',
  SUSPENSION_POR_LLUVIA: 'bg-hueso text-metadato border-dashed border-acero',
}

export function FichaEmpleado({
  empleado,
  asistencia,
  puedeEditar,
  obras,
}: {
  empleado: EmpleadoFicha
  puedeEditar: boolean
  obras: Array<{ id: string; codigo: string; nombre: string }>
  asistencia: {
    dias: DiaAsistencia[]
    totales: {
      horasNormales: number
      horasExtra50: number
      horasExtra100: number
      costo: number
      presentes: number
      ausencias: number
    }
  }
}) {
  const [pestana, setPestana] = useState('datos')
  const [hoja, setHoja] = useState<HojaEmpleado | null>(null)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const docsVencidos = empleado.documentos.filter(
    (d) => d.vencimiento !== null && d.vencimiento < hoy,
  )
  const asignacionVigente = empleado.asignaciones.find(
    (a) => a.hasta === null || a.hasta >= hoy,
  )
  const cuadrilla = empleado.cuadrillas[0]?.cuadrilla ?? null

  /*
   * El panel de la derecha contesta "¿quién es y qué le pasa?". Las
   * pestañas —asistencia, documentación, historial— se llevan el ancho,
   * que es donde un calendario de 31 días o una lista de movimientos se
   * agradecen.
   */
  const panel = (
    <>
      <div className="flex items-start gap-3 border-b border-niebla bg-blanco px-4 py-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-niebla text-titulo font-medium text-grafito">
          {empleado.nombre.charAt(0)}
          {empleado.apellido.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-titulo font-medium text-negro">
            {nombreNatural(empleado)}
          </p>
          <p className="truncate text-menor text-grafito">
            Legajo {empleado.legajo} · {textoEnum(empleado.categoria)}
            {empleado.especialidad ? ` · ${empleado.especialidad}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Insignia tono={empleado.activo ? 'correcto' : 'neutro'}>
              {empleado.activo ? 'Activo' : 'Inactivo'}
            </Insignia>
            {asignacionVigente ? (
              <Insignia tono="neutro">{asignacionVigente.obra.codigo}</Insignia>
            ) : (
              <Insignia tono="aviso">Sin asignar</Insignia>
            )}
          </div>
        </div>
      </div>

      {puedeEditar && (
        <div className="scroll-lateral sin-barra flex gap-2 border-b border-niebla bg-blanco px-4 py-3 lg:flex-wrap lg:overflow-visible">
          <EnlaceBoton
            tamano="chico"
            href={`/personal/empleados/${empleado.id}/editar`}
          >
            Editar ficha
          </EnlaceBoton>
          <Boton
            tamano="chico"
            variante="secundario"
            onClick={() => setHoja('valorHora')}
          >
            Valor hora
          </Boton>
          <Boton
            tamano="chico"
            variante="secundario"
            onClick={() => setHoja('novedad')}
          >
            Novedad
          </Boton>
          <Boton
            tamano="chico"
            variante="secundario"
            onClick={() => setHoja('pago')}
          >
            Pago
          </Boton>
          <Boton
            tamano="chico"
            variante="fantasma"
            onClick={() => setHoja('baja')}
          >
            {empleado.activo ? 'Dar de baja' : 'Reactivar'}
          </Boton>
        </div>
      )}

      {docsVencidos.length > 0 && (
        <div className="px-4 py-4">
          <AvisoFijo tono="critico" titulo="Documentación vencida">
            {docsVencidos.map((d) => textoEnum(d.tipo)).join(', ')}. Por
            seguridad y por responsabilidad legal no debería entrar a la obra
            así.
          </AvisoFijo>
        </div>
      )}
    </>
  )

  return (
    <FichaDosColumnas panel={panel} className="pb-8">
      <Pestanas
        activa={pestana}
        alCambiar={setPestana}
        className="mt-4"
        pestanas={[
          { id: 'datos', texto: 'Datos' },
          {
            id: 'documentacion',
            texto: 'Documentación',
            cantidad: docsVencidos.length,
          },
          { id: 'epp', texto: 'Protección', cantidad: empleado.entregasEpp.length },
          { id: 'asistencia', texto: 'Asistencia' },
          {
            id: 'herramientas',
            texto: 'Herramientas',
            cantidad: empleado.herramientasACargo.length,
          },
          { id: 'novedades', texto: 'Novedades' },
        ]}
      />

      {/* ------------------------------ DATOS ------------------------------ */}
      {pestana === 'datos' && (
        <>
          <TituloSeccion>Personales</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="DNI">{formatoDni(empleado.dni)}</Dato>
              <Dato etiqueta="CUIL">{formatoCuil(empleado.cuil)}</Dato>
              <Dato etiqueta="Teléfono">{empleado.telefono ?? '—'}</Dato>
              <Dato etiqueta="Dirección">
                {[empleado.direccion, empleado.localidad].filter(Boolean).join(', ') || '—'}
              </Dato>
              <Dato etiqueta="Ingreso">{fechaCorta(empleado.fechaIngreso)}</Dato>
              {empleado.fechaEgreso && (
                <Dato etiqueta="Egreso">{fechaCorta(empleado.fechaEgreso)}</Dato>
              )}
            </ListaDatos>
          </div>

          <TituloSeccion>Trabajo</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Categoría">{textoEnum(empleado.categoria)}</Dato>
              <Dato etiqueta="Especialidad">{empleado.especialidad ?? '—'}</Dato>
              <Dato etiqueta="Valor hora">{moneda(empleado.valorHora)}</Dato>
              <Dato etiqueta="Cuadrilla">
                {cuadrilla ? cuadrilla.nombre : 'Sin cuadrilla'}
              </Dato>
              {empleado.usuario && (
                <Dato etiqueta="Usuario">{empleado.usuario.email}</Dato>
              )}
            </ListaDatos>
          </div>

          <TituloSeccion
            accion={
              puedeEditar ? (
                <Boton
                  tamano="chico"
                  variante="secundario"
                  onClick={() => setHoja('valorHora')}
                >
                  Cambiar
                </Boton>
              ) : undefined
            }
          >
            Historial de valor hora
          </TituloSeccion>
          <Lista>
            {empleado.historialValorHora.map((h) => (
              <FilaLista
                key={h.id}
                titulo={moneda(h.valorHora)}
                subtitulo={`Desde ${fechaCorta(h.desde)}`}
                detalle={h.motivo ?? undefined}
                flecha={false}
              />
            ))}
          </Lista>

          <TituloSeccion>Talles y emergencia</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Talle de ropa">{empleado.talleRopa ?? '—'}</Dato>
              <Dato etiqueta="Talle de calzado">{empleado.talleCalzado ?? '—'}</Dato>
              <Dato etiqueta="Contacto de emergencia">
                {empleado.contactoEmergenciaNombre ?? '—'}
              </Dato>
              <Dato etiqueta="Teléfono de emergencia">
                {empleado.contactoEmergenciaTelefono ?? '—'}
              </Dato>
            </ListaDatos>
          </div>

          <TituloSeccion>Obras</TituloSeccion>
          <Lista>
            {empleado.asignaciones.map((a) => (
              <FilaLista
                key={a.id}
                titulo={a.obra.nombre}
                subtitulo={`${a.obra.codigo} · desde ${fechaCorta(a.desde)}${a.hasta ? ` hasta ${fechaCorta(a.hasta)}` : ''}`}
                detalle={a.tarea ?? undefined}
                debajoDerecha={
                  a.obra.estado === EstadoObra.EN_CURSO &&
                  (a.hasta === null || a.hasta >= hoy) ? (
                    <Insignia tono="correcto">Vigente</Insignia>
                  ) : undefined
                }
                href={`/obras/${a.obra.id}`}
              />
            ))}
          </Lista>
        </>
      )}

      {/* --------------------------- DOCUMENTACIÓN ------------------------- */}
      {pestana === 'documentacion' && (
        <>
          <TituloSeccion
            accion={
              puedeEditar ? (
                <Boton
                  tamano="chico"
                  variante="secundario"
                  onClick={() => setHoja('documento')}
                >
                  Cargar
                </Boton>
              ) : undefined
            }
          >
            Documentación
          </TituloSeccion>
          {empleado.documentos.length === 0 ? (
            <EstadoVacio
              titulo="Sin documentación cargada"
              mensaje="Cargá el apto médico, el alta de ART y el curso de seguridad."
            />
          ) : (
            <Lista>
              {empleado.documentos.map((d) => {
                const vencido = d.vencimiento !== null && d.vencimiento < hoy
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
                      d.emision ? `Emitido ${fechaCorta(d.emision)}` : undefined
                    }
                    tono={vencido ? 'critico' : porVencer ? 'aviso' : 'neutro'}
                    debajoDerecha={
                      <Insignia
                        tono={vencido ? 'critico' : porVencer ? 'aviso' : 'correcto'}
                      >
                        {textoVencimiento(d.vencimiento)}
                      </Insignia>
                    }
                    flecha={false}
                  />
                )
              })}
            </Lista>
          )}
        </>
      )}

      {/* ------------------------------- EPP ------------------------------- */}
      {pestana === 'epp' && (
        <>
          <TituloSeccion
            accion={
              puedeEditar ? (
                <Boton
                  tamano="chico"
                  variante="secundario"
                  onClick={() => setHoja('epp')}
                >
                  Registrar
                </Boton>
              ) : undefined
            }
          >
            Elementos entregados
          </TituloSeccion>
          {empleado.entregasEpp.length === 0 ? (
            <EstadoVacio
              titulo="Sin entregas registradas"
              mensaje="Registrá la ropa y los elementos de protección que se le entregaron."
            />
          ) : (
            <Lista>
              {empleado.entregasEpp.map((e) => (
                <FilaLista
                  key={e.id}
                  titulo={e.elemento}
                  subtitulo={`${fechaCorta(e.fecha)}${e.marca ? ` · ${e.marca}` : ''}`}
                  derecha={numero(e.cantidad)}
                  debajoDerecha={
                    <Insignia tono={e.firmado ? 'correcto' : 'aviso'}>
                      {e.firmado ? 'Firmado' : 'Sin firmar'}
                    </Insignia>
                  }
                  flecha={false}
                />
              ))}
            </Lista>
          )}
        </>
      )}

      {/* --------------------------- ASISTENCIA ---------------------------- */}
      {pestana === 'asistencia' && (
        <>
          <TituloSeccion>
            {hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </TituloSeccion>

          {asistencia.dias.length === 0 ? (
            <EstadoVacio
              titulo="Sin partes este mes"
              mensaje="Cuando se carguen los partes de su obra, la asistencia aparece acá."
            />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 px-4 pb-3">
                {asistencia.dias.map((d) => (
                  <div
                    key={d.fecha.toISOString()}
                    title={`${fechaCorta(d.fecha)}: ${TEXTO_ASISTENCIA[d.asistencia]}`}
                    className={cn(
                      'flex aspect-square flex-col items-center justify-center rounded-[var(--radius-control)] border',
                      COLOR_ASISTENCIA[d.asistencia],
                    )}
                  >
                    <span className="cifras text-base font-medium">
                      {d.fecha.getDate()}
                    </span>
                    {d.horas > 0 && (
                      <span className="cifras text-micro leading-none">
                        {d.horas}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-y border-niebla bg-blanco">
                <ListaDatos>
                  <Dato etiqueta="Días presentes">
                    {numero(asistencia.totales.presentes)}
                  </Dato>
                  <Dato etiqueta="Ausencias">
                    {numero(asistencia.totales.ausencias)}
                  </Dato>
                  <Dato etiqueta="Horas normales">
                    {horas(asistencia.totales.horasNormales)}
                  </Dato>
                  <Dato etiqueta="Horas al 50%">
                    {horas(asistencia.totales.horasExtra50)}
                  </Dato>
                  <Dato etiqueta="Horas al 100%">
                    {horas(asistencia.totales.horasExtra100)}
                  </Dato>
                  <Dato etiqueta="Costo del mes">
                    {moneda(asistencia.totales.costo)}
                  </Dato>
                </ListaDatos>
              </div>
            </>
          )}
        </>
      )}

      {/* -------------------------- HERRAMIENTAS --------------------------- */}
      {pestana === 'herramientas' && (
        <>
          {empleado.herramientasACargo.length === 0 ? (
            <EstadoVacio
              titulo="No tiene herramientas a cargo"
              mensaje="Cuando el pañol le entregue una, aparece acá."
            />
          ) : (
            <Lista>
              {empleado.herramientasACargo.map((h) => {
                const vencida =
                  h.fechaDevolucionPrevista !== null &&
                  h.fechaDevolucionPrevista < hoy
                return (
                  <FilaLista
                    key={h.id}
                    titulo={h.nombre}
                    subtitulo={h.codigo}
                    tono={vencida ? 'critico' : 'neutro'}
                    debajoDerecha={
                      h.fechaDevolucionPrevista ? (
                        <Insignia tono={vencida ? 'critico' : 'neutro'}>
                          {textoVencimiento(h.fechaDevolucionPrevista)}
                        </Insignia>
                      ) : undefined
                    }
                    href={`/herramientas/${h.id}`}
                  />
                )
              })}
            </Lista>
          )}
        </>
      )}

      {/* --------------------------- NOVEDADES ----------------------------- */}
      {pestana === 'novedades' && (
        <>
          <TituloSeccion
            accion={
              puedeEditar ? (
                <Boton
                  tamano="chico"
                  variante="secundario"
                  onClick={() => setHoja('novedad')}
                >
                  Cargar
                </Boton>
              ) : undefined
            }
          >
            Novedades
          </TituloSeccion>
          {empleado.novedades.length === 0 ? (
            <EstadoVacio
              titulo="Sin novedades"
              mensaje="Adelantos, viáticos, premios y descuentos aparecen acá."
            />
          ) : (
            <Lista>
              {empleado.novedades.map((n) => (
                <FilaLista
                  key={n.id}
                  titulo={textoEnum(n.tipo)}
                  subtitulo={fechaCorta(n.fecha)}
                  detalle={
                    [n.descripcion, n.obra?.codigo].filter(Boolean).join(' · ') ||
                    undefined
                  }
                  derecha={moneda(n.monto)}
                  flecha={false}
                />
              ))}
            </Lista>
          )}

          <TituloSeccion
            accion={
              puedeEditar ? (
                <Boton
                  tamano="chico"
                  variante="secundario"
                  onClick={() => setHoja('pago')}
                >
                  Registrar
                </Boton>
              ) : undefined
            }
          >
            Pagos
          </TituloSeccion>
          {empleado.pagos.length === 0 ? (
            <EstadoVacio titulo="Sin pagos registrados" mensaje="—" />
          ) : (
            <Lista>
              {empleado.pagos.map((p) => (
                <FilaLista
                  key={p.id}
                  titulo={p.concepto ?? 'Pago'}
                  subtitulo={`${fechaCorta(p.fecha)} · ${textoEnum(p.medio)}`}
                  derecha={moneda(p.monto)}
                  flecha={false}
                />
              ))}
            </Lista>
          )}
        </>
      )}

      <HojasEmpleado
        hoja={hoja}
        alCerrar={() => setHoja(null)}
        empleado={empleado}
        obras={obras}
      />
    </FichaDosColumnas>
  )
}
