'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ClipboardList, RotateCcw } from 'lucide-react'
import { Clima, EstadoParte } from '@prisma/client'
import {
  accionAprobarParte,
  accionAprobarVarios,
  accionReabrirParte,
} from '@/server/personal/partes'
import {
  AvisoFijo,
  Boton,
  CampoSelect,
  CampoTextoLargo,
  EstadoVacio,
  FilaLista,
  HojaInferior,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { fechaCorta, haceCuanto, horas, plural, primeraMayuscula } from '@/lib/formato'

export interface ParteParaAprobar {
  id: string
  fecha: Date
  clima: Clima
  enviadoEn: Date | null
  obraId: string
  obra: string
  obraNombre: string
  cargadoPor: string
  personas: number
  presentes: number
  ausentes: number
  totalHoras: number
  horasExtra: number
}

export interface DiaDelCalendario {
  fecha: Date
  parteId: string | null
  estado: EstadoParte | null
  personas: number
  falta: boolean
}

export function BandejaPartes({
  partes,
  obras,
  obraElegida,
  calendario,
  puedeAprobar,
  puedeCargar,
}: {
  partes: ParteParaAprobar[]
  obras: Array<{ id: string; codigo: string; nombre: string }>
  obraElegida: string | null
  calendario: DiaDelCalendario[]
  puedeAprobar: boolean
  puedeCargar: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()
  const [reabriendo, setReabriendo] = useState<ParteParaAprobar | null>(null)

  const aprobar = (id: string) => {
    empezar(async () => {
      const r = await accionAprobarParte(id)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Aprobado')
        router.refresh()
      }
    })
  }

  const aprobarTodos = () => {
    empezar(async () => {
      const r = await accionAprobarVarios(partes.map((p) => p.id))
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Aprobados')
        router.refresh()
      }
    })
  }

  const reabrir = (datos: FormData) => {
    if (!reabriendo) return
    empezar(async () => {
      const r = await accionReabrirParte(
        reabriendo.id,
        String(datos.get('motivo') ?? ''),
      )
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Devuelto')
        setReabriendo(null)
        router.refresh()
      }
    })
  }

  const faltantes = calendario.filter((d) => d.falta)

  return (
    <div className="pb-8">
      {/* Lo que hay que aprobar */}
      <TituloSeccion
        accion={
          puedeAprobar && partes.length > 1 ? (
            <button
              type="button"
              onClick={aprobarTodos}
              disabled={pendiente}
              className="text-menor text-grafito underline disabled:opacity-50"
            >
              Aprobar todos
            </button>
          ) : undefined
        }
      >
        {partes.length === 0
          ? 'Nada para aprobar'
          : plural(partes.length, 'parte esperando', 'partes esperando')}
      </TituloSeccion>

      {partes.length === 0 ? (
        <EstadoVacio
          titulo="No hay partes para aprobar"
          mensaje="Cuando un capataz envíe uno, aparece acá."
          icono={<ClipboardList className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {partes.map((p) => (
            <div key={p.id} className="bg-blanco">
              <FilaLista
                titulo={primeraMayuscula(fechaCorta(p.fecha))}
                subtitulo={`${p.obra} · ${p.obraNombre}`}
                detalle={`${p.presentes} presentes · ${p.ausentes} ausentes · ${horas(p.totalHoras)}${p.horasExtra > 0 ? ` · ${horas(p.horasExtra)} extra` : ''}`}
                tono={p.horasExtra > 0 ? 'aviso' : 'neutro'}
                debajoDerecha={
                  <div className="flex flex-col items-end gap-1">
                    <Insignia tono="aviso">Sin aprobar</Insignia>
                    {p.enviadoEn && (
                      <span className="text-micro text-acero">
                        {haceCuanto(p.enviadoEn)}
                      </span>
                    )}
                  </div>
                }
                href={`/personal/partes/nuevo?obra=${p.obraId}&fecha=${p.fecha.toISOString().slice(0, 10)}`}
              />
              {puedeAprobar && (
                <div className="flex gap-2 px-4 pb-3">
                  <Boton
                    variante="secundario"
                    tamano="chico"
                    ancho
                    iconoIzquierda={<RotateCcw aria-hidden className="size-4" />}
                    onClick={() => setReabriendo(p)}
                  >
                    Devolver
                  </Boton>
                  <Boton
                    tamano="chico"
                    ancho
                    cargando={pendiente}
                    iconoIzquierda={<Check aria-hidden className="size-4" />}
                    onClick={() => aprobar(p.id)}
                  >
                    Aprobar
                  </Boton>
                </div>
              )}
            </div>
          ))}
        </Lista>
      )}

      {/* Calendario por obra: qué días hay parte y cuáles faltan */}
      <TituloSeccion>Calendario del mes</TituloSeccion>
      <div className="px-4 pb-2">
        <CampoSelect
          name="obra"
          etiqueta="Obra"
          value={obraElegida ?? ''}
          onChange={(e) => {
            const id = e.target.value
            router.push(id ? `/personal/partes?obra=${id}` : '/personal/partes')
          }}
          vacio="Elegí una obra…"
          opciones={obras.map((o) => ({
            valor: o.id,
            texto: `${o.codigo} · ${o.nombre}`,
          }))}
        />
      </div>

      {obraElegida && (
        <>
          {faltantes.length > 0 && (
            <div className="px-4 pb-3">
              <AvisoFijo tono="aviso" titulo="Días sin parte">
                Faltan {plural(faltantes.length, 'día hábil', 'días hábiles')} de
                este mes. Sin parte no hay horas, y sin horas no hay costo de
                mano de obra.
              </AvisoFijo>
            </div>
          )}

          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <span
                key={i}
                className="pb-1 text-center text-micro text-acero"
                aria-hidden
              >
                {d}
              </span>
            ))}

            {/* Relleno hasta el primer día hábil del mes */}
            {calendario.length > 0 &&
              Array.from({
                length: (calendario[0].fecha.getDay() + 6) % 7,
              }).map((_, i) => <span key={`hueco-${i}`} />)}

            {calendario.map((d) => {
              const contenido = (
                <>
                  <span className="cifras text-base font-medium">
                    {d.fecha.getDate()}
                  </span>
                  {!d.falta && (
                    <span className="text-micro leading-none">{d.personas}</span>
                  )}
                </>
              )

              const clases = cn(
                'flex aspect-square flex-col items-center justify-center rounded-[var(--radius-control)] border',
                d.falta
                  ? 'border-aviso bg-[var(--color-aviso-suave)] text-aviso'
                  : d.estado === EstadoParte.APROBADO
                    ? 'border-[color-mix(in_srgb,var(--color-correcto)_30%,transparent)] bg-[var(--color-correcto-suave)] text-correcto'
                    : d.estado === EstadoParte.ENVIADO
                      ? 'border-niebla bg-blanco text-grafito'
                      : 'border-dashed border-acero bg-blanco text-acero',
              )

              return (
                <Link
                  key={d.fecha.toISOString()}
                  href={`/personal/partes/nuevo?obra=${obraElegida}&fecha=${d.fecha.toISOString().slice(0, 10)}`}
                  className={clases}
                  aria-label={`${fechaCorta(d.fecha)}: ${
                    d.falta
                      ? 'sin parte'
                      : d.estado === EstadoParte.APROBADO
                        ? 'aprobado'
                        : d.estado === EstadoParte.ENVIADO
                          ? 'enviado'
                          : 'borrador'
                  }`}
                >
                  {contenido}
                </Link>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3 px-4 pb-4 text-micro text-grafito">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-[color-mix(in_srgb,var(--color-correcto)_30%,transparent)] bg-[var(--color-correcto-suave)]" />
              Aprobado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-niebla bg-blanco" />
              Enviado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-dashed border-acero bg-blanco" />
              Borrador
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-aviso bg-[var(--color-aviso-suave)]" />
              Falta
            </span>
          </div>
        </>
      )}

      {puedeCargar && obraElegida && (
        <div className="px-4">
          <Boton
            ancho
            tamano="grande"
            onClick={() =>
              router.push(`/personal/partes/nuevo?obra=${obraElegida}`)
            }
          >
            Cargar el parte de hoy
          </Boton>
        </div>
      )}

      <HojaInferior
        abierta={reabriendo !== null}
        alCerrar={() => setReabriendo(null)}
        titulo="Devolver el parte"
        descripcion={
          reabriendo
            ? `${reabriendo.obra} · ${fechaCorta(reabriendo.fecha)}`
            : undefined
        }
      >
        <form action={reabrir} className="space-y-4">
          <CampoTextoLargo
            name="motivo"
            etiqueta="¿Qué hay que corregir?"
            required
            rows={3}
            placeholder="Faltan las horas extra de la cuadrilla de hormigón."
            ayuda="El capataz ve esta nota al abrir el parte."
          />
          <Boton type="submit" ancho cargando={pendiente}>
            Devolver al capataz
          </Boton>
        </form>
      </HojaInferior>
    </div>
  )
}
