'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, UserMinus } from 'lucide-react'
import {
  accionAsignarAObra,
  accionQuitarAsignacion,
} from '@/server/personal/asignaciones'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoSelect,
  CampoTexto,
  EstadoVacio,
  FilaLista,
  HojaInferior,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { fechaCorta, plural, textoEnum } from '@/lib/formato'

/* =====================================================================
   Planificación semanal: las obras en filas y la gente asignada a cada
   una. Arriba, los que quedaron sin asignar esta semana.
   ===================================================================== */

export interface AsignacionVista {
  id: string
  obraId: string
  desde: Date
  hasta: Date | null
  tarea: string | null
  empleado: {
    id: string
    nombre: string
    apellido: string
    legajo: string
    categoria: string
  } | null
  cuadrilla: { id: string; nombre: string; miembros: number } | null
  subcontratista: { id: string; razonSocial: string; rubro: string } | null
}

export function Planificacion({
  obras,
  asignaciones,
  sinAsignar,
  superpuestos,
  desde,
  hasta,
  empleados,
  cuadrillas,
  subcontratistas,
  puedeAsignar,
}: {
  obras: Array<{ id: string; codigo: string; nombre: string; esInterior: boolean }>
  asignaciones: AsignacionVista[]
  sinAsignar: Array<{
    id: string
    nombre: string
    apellido: string
    legajo: string
    categoria: string
  }>
  superpuestos: string[]
  desde: Date
  hasta: Date
  empleados: Array<{ id: string; nombre: string; apellido: string; legajo: string }>
  cuadrillas: Array<{ id: string; nombre: string }>
  subcontratistas: Array<{ id: string; razonSocial: string }>
  puedeAsignar: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()
  const [asignando, setAsignando] = useState<string | null>(null)
  const [quitando, setQuitando] = useState<AsignacionVista | null>(null)
  const [tipo, setTipo] = useState<'empleado' | 'cuadrilla' | 'subcontratista'>(
    'empleado',
  )

  const irASemana = (dias: number) => {
    const nueva = new Date(desde)
    nueva.setDate(nueva.getDate() + dias)
    router.push(`/personal/planificacion?desde=${nueva.toISOString().slice(0, 10)}`)
  }

  const asignar = (datos: FormData) => {
    empezar(async () => {
      const r = await accionAsignarAObra({}, datos)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Asignado')
        if (r.aviso) avisos.mostrar(r.aviso, 'aviso')
        setAsignando(null)
        router.refresh()
      }
    })
  }

  const quitar = () => {
    if (!quitando) return
    empezar(async () => {
      const r = await accionQuitarAsignacion(quitando.id)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Listo')
        setQuitando(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="pb-8">
      {/* Navegación entre semanas */}
      <div className="flex items-center justify-between gap-2 border-b border-niebla bg-blanco px-2 py-2">
        <button
          type="button"
          onClick={() => irASemana(-7)}
          aria-label="Semana anterior"
          className="flex size-11 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <p className="text-base font-medium text-negro">
          {fechaCorta(desde)} al {fechaCorta(hasta)}
        </p>
        <button
          type="button"
          onClick={() => irASemana(7)}
          aria-label="Semana siguiente"
          className="flex size-11 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      {/* Los que quedaron afuera */}
      {sinAsignar.length > 0 && (
        <>
          <div className="px-4 pt-4">
            <AvisoFijo tono="aviso" titulo="Sin asignación esta semana">
              {plural(sinAsignar.length, 'persona activa', 'personas activas')} sin
              obra. Se les paga igual.
            </AvisoFijo>
          </div>
          <Lista>
            {sinAsignar.map((e) => (
              <FilaLista
                key={e.id}
                titulo={`${e.apellido}, ${e.nombre}`}
                subtitulo={`${e.legajo} · ${textoEnum(e.categoria)}`}
                izquierda={
                  <UserMinus aria-hidden className="size-4 shrink-0 text-aviso" />
                }
                tono="aviso"
                href={`/personal/empleados/${e.id}`}
              />
            ))}
          </Lista>
        </>
      )}

      {/* Una sección por obra */}
      {obras.length === 0 ? (
        <EstadoVacio
          titulo="No hay obras en curso"
          mensaje="Cuando haya una obra activa, vas a poder asignarle gente."
        />
      ) : (
        obras.map((obra) => {
          const suyas = asignaciones.filter((a) => a.obraId === obra.id)

          return (
            <div key={obra.id}>
              <TituloSeccion
                accion={
                  puedeAsignar ? (
                    <button
                      type="button"
                      onClick={() => setAsignando(obra.id)}
                      className="flex items-center gap-1 text-menor text-grafito underline"
                    >
                      <Plus aria-hidden className="size-3" />
                      Asignar
                    </button>
                  ) : undefined
                }
              >
                <Link href={`/obras/${obra.id}`} className="hover:underline">
                  {obra.codigo} · {obra.nombre}
                </Link>
                {obra.esInterior && ' · interior'}
              </TituloSeccion>

              {suyas.length === 0 ? (
                <p className="px-4 pb-2 text-chico text-grafito">
                  Nadie asignado esta semana.
                </p>
              ) : (
                <Lista>
                  {suyas.map((a) => {
                    const nombre = a.empleado
                      ? `${a.empleado.apellido}, ${a.empleado.nombre}`
                      : a.cuadrilla
                        ? a.cuadrilla.nombre
                        : (a.subcontratista?.razonSocial ?? '—')

                    const detalle = a.empleado
                      ? `${a.empleado.legajo} · ${textoEnum(a.empleado.categoria)}`
                      : a.cuadrilla
                        ? plural(a.cuadrilla.miembros, 'persona')
                        : a.subcontratista
                          ? textoEnum(a.subcontratista.rubro)
                          : undefined

                    const doble =
                      a.empleado && superpuestos.includes(a.empleado.id)

                    return (
                      <FilaLista
                        key={a.id}
                        titulo={nombre}
                        subtitulo={detalle}
                        detalle={
                          [
                            `Desde ${fechaCorta(a.desde)}`,
                            a.hasta ? `hasta ${fechaCorta(a.hasta)}` : null,
                            a.tarea,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        }
                        tono={doble ? 'aviso' : 'neutro'}
                        debajoDerecha={
                          <div className="flex flex-col items-end gap-1">
                            {a.cuadrilla && <Insignia tono="neutro">Cuadrilla</Insignia>}
                            {a.subcontratista && (
                              <Insignia tono="neutro">Subcontrato</Insignia>
                            )}
                            {doble && <Insignia tono="aviso">En dos obras</Insignia>}
                          </div>
                        }
                        alTocar={puedeAsignar ? () => setQuitando(a) : undefined}
                        flecha={false}
                      />
                    )
                  })}
                </Lista>
              )}
            </div>
          )
        })
      )}

      {/* Asignar */}
      <HojaInferior
        abierta={asignando !== null}
        alCerrar={() => setAsignando(null)}
        titulo="Asignar a la obra"
        descripcion={obras.find((o) => o.id === asignando)?.nombre}
        alto="alto"
      >
        <form action={asignar} className="space-y-4">
          <input type="hidden" name="obraId" value={asignando ?? ''} />

          <CampoSelect
            name="tipo"
            etiqueta="Qué asignás"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as 'empleado' | 'cuadrilla' | 'subcontratista')
            }
            opciones={[
              { valor: 'empleado', texto: 'Una persona' },
              { valor: 'cuadrilla', texto: 'Una cuadrilla entera' },
              { valor: 'subcontratista', texto: 'Un subcontratista' },
            ]}
          />

          {tipo === 'empleado' && (
            <CampoSelect
              name="empleadoId"
              etiqueta="Empleado"
              vacio="Elegí una persona…"
              required
              opciones={empleados.map((e) => ({
                valor: e.id,
                texto: `${e.apellido}, ${e.nombre} · ${e.legajo}`,
              }))}
            />
          )}

          {tipo === 'cuadrilla' && (
            <CampoSelect
              name="cuadrillaId"
              etiqueta="Cuadrilla"
              vacio="Elegí una cuadrilla…"
              required
              opciones={cuadrillas.map((c) => ({ valor: c.id, texto: c.nombre }))}
              ayuda="Se asigna la cuadrilla y también a cada uno de sus integrantes."
            />
          )}

          {tipo === 'subcontratista' && (
            <CampoSelect
              name="subcontratistaId"
              etiqueta="Subcontratista"
              vacio="Elegí uno…"
              required
              opciones={subcontratistas.map((s) => ({
                valor: s.id,
                texto: s.razonSocial,
              }))}
            />
          )}

          <CampoFecha
            name="desde"
            etiqueta="Desde"
            defaultValue={desde.toISOString().slice(0, 10)}
            required
          />
          <CampoFecha
            name="hasta"
            etiqueta="Hasta"
            ayuda="Dejalo vacío si no tiene fecha de fin."
          />
          <CampoTexto name="tarea" etiqueta="Tarea" placeholder="Armado de encofrado" />

          <Boton type="submit" ancho tamano="grande" cargando={pendiente}>
            Asignar
          </Boton>
        </form>
      </HojaInferior>

      {/* Quitar */}
      <HojaInferior
        abierta={quitando !== null}
        alCerrar={() => setQuitando(null)}
        titulo="Sacar de la obra"
        pie={
          <div className="flex gap-2">
            <Boton variante="secundario" ancho onClick={() => setQuitando(null)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" ancho cargando={pendiente} onClick={quitar}>
              Sacar
            </Boton>
          </div>
        }
      >
        <p className="text-base text-grafito">
          La asignación se cierra con fecha de hoy. Los partes que ya se
          cargaron no se tocan.
        </p>
      </HojaInferior>
    </div>
  )
}
