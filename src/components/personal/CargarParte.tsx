'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, CloudRain, Plus, Send, X } from 'lucide-react'
import { Asistencia, Clima, EstadoParte } from '@prisma/client'
import {
  accionGuardarParte,
  type LineaEnviada,
  type ResultadoParte,
} from '@/server/personal/partes'
import { TEXTO_ASISTENCIA, type ProblemaParte } from '@/server/personal/reglas'
import {
  AvisoFijo,
  Boton,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  HojaConfirmacion,
  HojaInferior,
  Insignia,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { fechaConDia, horas, plural, primeraMayuscula, textoEnum } from '@/lib/formato'

/* =====================================================================
   Carga del parte diario.

   La usa un capataz en el celular, parado en la obra, muchas veces con
   guantes y al sol. Todo está pensado para eso:

   · Al abrir ya están todos presentes con 8 horas. Solo se corrigen las
     excepciones.
   · Cada persona es una fila de un toque. Se despliega solo si hay que
     ajustar horas.
   · Si llueve y se para la obra, un botón marca a todos de una.
   · El borrador se guarda solo mientras se completa.
   ===================================================================== */

export interface PersonaParte {
  id: string
  nombre: string
  apellido: string
  legajo: string
  categoria: string
  especialidad: string | null
  asistencia: Asistencia
  horasNormales: number
  horasExtra50: number
  horasExtra100: number
  tarea: string | null
  asignado: boolean
}

interface SubDelDia {
  subcontratistaId: string
  razonSocial: string
  cantidadPersonas: number
  tarea: string | null
}

/** Los estados que se eligen de un toque; el resto va en el desplegable. */
const RAPIDOS: Asistencia[] = [
  Asistencia.PRESENTE,
  Asistencia.AUSENTE_CON_AVISO,
  Asistencia.MEDIA_JORNADA,
]

const TODAS: Asistencia[] = [
  Asistencia.PRESENTE,
  Asistencia.MEDIA_JORNADA,
  Asistencia.AUSENTE_CON_AVISO,
  Asistencia.AUSENTE_SIN_AVISO,
  Asistencia.LICENCIA,
  Asistencia.VACACIONES,
  Asistencia.FERIADO,
  Asistencia.SUSPENSION_POR_LLUVIA,
]

const HORAS_DEFECTO: Record<Asistencia, number> = {
  PRESENTE: 8,
  MEDIA_JORNADA: 4,
  AUSENTE_CON_AVISO: 0,
  AUSENTE_SIN_AVISO: 0,
  LICENCIA: 0,
  VACACIONES: 0,
  FERIADO: 0,
  SUSPENSION_POR_LLUVIA: 0,
}

export function CargarParte({
  obra,
  fecha,
  estadoInicial,
  personasIniciales,
  climaInicial,
  tareasIniciales,
  observacionesIniciales,
  subcontratistasIniciales,
  subcontratistasDisponibles,
  empleadosParaAgregar,
  soloLectura,
}: {
  obra: { id: string; codigo: string; nombre: string }
  fecha: string
  estadoInicial: EstadoParte
  personasIniciales: PersonaParte[]
  climaInicial: Clima
  tareasIniciales: string | null
  observacionesIniciales: string | null
  subcontratistasIniciales: SubDelDia[]
  subcontratistasDisponibles: Array<{ id: string; razonSocial: string; rubro: string }>
  empleadosParaAgregar: Array<{
    id: string
    nombre: string
    apellido: string
    legajo: string
    categoria: string
    especialidad: string | null
  }>
  soloLectura: boolean
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const [personas, setPersonas] = useState(personasIniciales)
  const [clima, setClima] = useState(climaInicial)
  const [tareas, setTareas] = useState(tareasIniciales ?? '')
  const [observaciones, setObservaciones] = useState(observacionesIniciales ?? '')
  const [subs, setSubs] = useState(subcontratistasIniciales)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [sumandoSub, setSumandoSub] = useState(false)
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false)
  const [confirmandoLluvia, setConfirmandoLluvia] = useState(false)
  const [problemas, setProblemas] = useState<ProblemaParte[]>([])

  const resumen = useMemo(() => {
    const presentes = personas.filter(
      (p) =>
        p.asistencia === Asistencia.PRESENTE ||
        p.asistencia === Asistencia.MEDIA_JORNADA,
    ).length
    const ausentes = personas.filter(
      (p) =>
        p.asistencia === Asistencia.AUSENTE_CON_AVISO ||
        p.asistencia === Asistencia.AUSENTE_SIN_AVISO,
    ).length
    const totalHoras = personas.reduce(
      (a, p) => a + p.horasNormales + p.horasExtra50 + p.horasExtra100,
      0,
    )
    const extras = personas.reduce((a, p) => a + p.horasExtra50 + p.horasExtra100, 0)
    return { presentes, ausentes, totalHoras, extras }
  }, [personas])

  const cambiar = (id: string, cambios: Partial<PersonaParte>) => {
    setPersonas((p) =>
      p.map((persona) =>
        persona.id === id ? { ...persona, ...cambios } : persona,
      ),
    )
  }

  const cambiarAsistencia = (id: string, asistencia: Asistencia) => {
    cambiar(id, {
      asistencia,
      horasNormales: HORAS_DEFECTO[asistencia],
      // Las horas extra se limpian si deja de estar presente.
      ...(HORAS_DEFECTO[asistencia] === 0
        ? { horasExtra50: 0, horasExtra100: 0 }
        : {}),
    })
  }

  const marcarTodosPorLluvia = () => {
    setPersonas((p) =>
      p.map((persona) => ({
        ...persona,
        asistencia: Asistencia.SUSPENSION_POR_LLUVIA,
        horasNormales: 0,
        horasExtra50: 0,
        horasExtra100: 0,
      })),
    )
    setClima(Clima.LLUVIA_CON_PARO)
    setConfirmandoLluvia(false)
    avisos.mostrar('Todos marcados como suspensión por lluvia')
  }

  const guardar = (enviar: boolean) => {
    empezar(async () => {
      const lineas: LineaEnviada[] = personas.map((p) => ({
        empleadoId: p.id,
        asistencia: p.asistencia,
        horasNormales: p.horasNormales,
        horasExtra50: p.horasExtra50,
        horasExtra100: p.horasExtra100,
        tarea: p.tarea,
      }))

      const resultado: ResultadoParte = await accionGuardarParte({
        obraId: obra.id,
        fecha,
        clima,
        tareasDelDia: tareas.trim() || null,
        observaciones: observaciones.trim() || null,
        lineas,
        subcontratistas: subs.map((s) => ({
          subcontratistaId: s.subcontratistaId,
          cantidadPersonas: s.cantidadPersonas,
          tarea: s.tarea,
        })),
        enviar,
      })

      setProblemas(resultado.problemas ?? [])
      setConfirmandoEnvio(false)

      if (resultado.error) {
        avisos.error(resultado.error)
        return
      }

      avisos.correcto(resultado.mensaje ?? 'Guardado')
      if (enviar) router.push('/personal/partes')
      else router.refresh()
    })
  }

  const errores = problemas.filter((p) => p.nivel === 'error')
  const advertencias = problemas.filter((p) => p.nivel === 'aviso')
  const problemaDe = (id: string) => problemas.find((p) => p.empleadoId === id)

  return (
    <div className="pb-8">
      {/* Cabecera del parte */}
      <div className="border-b border-niebla bg-blanco px-4 py-3">
        <p className="text-titulo font-medium text-negro">{obra.nombre}</p>
        <p className="text-menor text-grafito">
          {obra.codigo} · {primeraMayuscula(fechaConDia(new Date(`${fecha}T00:00:00`)))}
        </p>
        {estadoInicial !== EstadoParte.BORRADOR && (
          <div className="mt-2">
            <Insignia
              tono={estadoInicial === EstadoParte.APROBADO ? 'correcto' : 'aviso'}
            >
              {estadoInicial === EstadoParte.APROBADO ? 'Aprobado' : 'Enviado'}
            </Insignia>
          </div>
        )}
      </div>

      {soloLectura && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="neutro">
            Este parte ya está aprobado. Para corregirlo, pedíselo al jefe de
            obra.
          </AvisoFijo>
        </div>
      )}

      {errores.length > 0 && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico" titulo="Hay que corregir esto">
            <ul className="list-inside list-disc space-y-1">
              {errores.map((p, i) => (
                <li key={i}>{p.mensaje}</li>
              ))}
            </ul>
          </AvisoFijo>
        </div>
      )}

      {advertencias.length > 0 && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="aviso" titulo="Para mirar">
            <ul className="list-inside list-disc space-y-1">
              {advertencias.map((p, i) => (
                <li key={i}>{p.mensaje}</li>
              ))}
            </ul>
          </AvisoFijo>
        </div>
      )}

      {/* Resumen en vivo */}
      <div className="grid grid-cols-4 gap-px border-y border-niebla bg-niebla">
        {[
          ['Presentes', resumen.presentes, 'text-negro'],
          ['Ausentes', resumen.ausentes, resumen.ausentes > 0 ? 'text-aviso' : 'text-negro'],
          ['Horas', resumen.totalHoras, 'text-negro'],
          ['Extra', resumen.extras, resumen.extras > 0 ? 'text-aviso' : 'text-negro'],
        ].map(([etiqueta, valor, color]) => (
          <div key={etiqueta as string} className="bg-blanco px-2 py-2.5 text-center">
            <p className={cn('cifras text-grande font-medium', color as string)}>
              {valor as number}
            </p>
            <p className="text-micro text-grafito">{etiqueta as string}</p>
          </div>
        ))}
      </div>

      {/* Clima */}
      <TituloSeccion>Clima</TituloSeccion>
      <div className="space-y-2 px-4">
        <CampoSelect
          name="clima"
          etiqueta="Cómo estuvo el día"
          value={clima}
          onChange={(e) => setClima(e.target.value as Clima)}
          disabled={soloLectura}
          opciones={[
            { valor: Clima.DESPEJADO, texto: 'Despejado' },
            { valor: Clima.NUBLADO, texto: 'Nublado' },
            { valor: Clima.LLUVIA, texto: 'Lluvia, pero se trabajó' },
            { valor: Clima.LLUVIA_CON_PARO, texto: 'Lluvia con paro de obra' },
            { valor: Clima.VIENTO_FUERTE, texto: 'Viento fuerte' },
          ]}
        />

        {clima === Clima.LLUVIA_CON_PARO && !soloLectura && (
          <Boton
            variante="secundario"
            ancho
            iconoIzquierda={<CloudRain aria-hidden className="size-4" />}
            onClick={() => setConfirmandoLluvia(true)}
          >
            Marcar a todos como suspensión por lluvia
          </Boton>
        )}
      </div>

      {/* La gente */}
      <TituloSeccion
        accion={
          !soloLectura ? (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="flex items-center gap-1 text-menor text-grafito underline"
            >
              <Plus aria-hidden className="size-3" />
              Sumar a alguien
            </button>
          ) : undefined
        }
      >
        {plural(personas.length, 'persona')}
      </TituloSeccion>

      <div className="divide-y divide-niebla border-y border-niebla bg-blanco">
        {personas.map((p) => {
          const desplegada = abierta === p.id
          const problema = problemaDe(p.id)
          const total = p.horasNormales + p.horasExtra50 + p.horasExtra100

          return (
            <div
              key={p.id}
              className={cn(
                problema?.nivel === 'error' && 'border-l-2 border-l-critico',
                problema?.nivel === 'aviso' && 'border-l-2 border-l-aviso',
              )}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-negro">
                    {p.apellido}, {p.nombre}
                  </p>
                  <p className="truncate text-micro text-acero">
                    {p.legajo} · {textoEnum(p.categoria)}
                    {!p.asignado && ' · agregado'}
                  </p>
                </div>

                {/* Los tres estados rápidos: un toque cada uno. */}
                <div className="flex shrink-0 gap-1">
                  {RAPIDOS.map((a) => {
                    const activo = p.asistencia === a
                    const letra =
                      a === Asistencia.PRESENTE
                        ? 'P'
                        : a === Asistencia.MEDIA_JORNADA
                          ? '½'
                          : 'A'
                    return (
                      <button
                        key={a}
                        type="button"
                        disabled={soloLectura}
                        onClick={() => cambiarAsistencia(p.id, a)}
                        aria-label={TEXTO_ASISTENCIA[a]}
                        aria-pressed={activo}
                        className={cn(
                          'flex size-11 items-center justify-center rounded-[var(--radius-control)] border text-base font-medium',
                          activo
                            ? a === Asistencia.PRESENTE
                              ? 'border-negro bg-negro text-blanco'
                              : a === Asistencia.MEDIA_JORNADA
                                ? 'border-grafito bg-grafito text-blanco'
                                : 'border-aviso bg-aviso text-blanco'
                            : 'border-niebla bg-blanco text-grafito',
                          soloLectura && 'opacity-60',
                        )}
                      >
                        {letra}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setAbierta(desplegada ? null : p.id)}
                    aria-label="Ajustar horas y tarea"
                    aria-expanded={desplegada}
                    className="flex size-11 items-center justify-center rounded-[var(--radius-control)] border border-niebla text-grafito active:bg-hueso"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-4 transition-transform',
                        desplegada && 'rotate-180',
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Resumen de la fila cuando está plegada */}
              {!desplegada && total > 0 && (
                <p className="cifras px-3 pb-2 text-micro text-acero">
                  {horas(p.horasNormales)}
                  {p.horasExtra50 > 0 && ` + ${horas(p.horasExtra50)} al 50%`}
                  {p.horasExtra100 > 0 && ` + ${horas(p.horasExtra100)} al 100%`}
                  {p.tarea && ` · ${p.tarea}`}
                </p>
              )}
              {!desplegada &&
                total === 0 &&
                p.asistencia !== Asistencia.PRESENTE && (
                  <p className="px-3 pb-2 text-micro text-acero">
                    {TEXTO_ASISTENCIA[p.asistencia]}
                  </p>
                )}

              {desplegada && (
                <div className="space-y-3 bg-hueso px-3 pt-1 pb-4">
                  <CampoSelect
                    name={`asistencia-${p.id}`}
                    etiqueta="Asistencia"
                    value={p.asistencia}
                    onChange={(e) =>
                      cambiarAsistencia(p.id, e.target.value as Asistencia)
                    }
                    disabled={soloLectura}
                    opciones={TODAS.map((a) => ({
                      valor: a,
                      texto: TEXTO_ASISTENCIA[a],
                    }))}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <CampoNumero
                      name={`normales-${p.id}`}
                      etiqueta="Normales"
                      value={p.horasNormales}
                      onChange={(e) =>
                        cambiar(p.id, { horasNormales: Number(e.target.value) || 0 })
                      }
                      disabled={soloLectura}
                      min={0}
                      max={16}
                      step={0.5}
                    />
                    <CampoNumero
                      name={`extra50-${p.id}`}
                      etiqueta="Extra 50%"
                      value={p.horasExtra50}
                      onChange={(e) =>
                        cambiar(p.id, { horasExtra50: Number(e.target.value) || 0 })
                      }
                      disabled={soloLectura}
                      min={0}
                      max={8}
                      step={0.5}
                    />
                    <CampoNumero
                      name={`extra100-${p.id}`}
                      etiqueta="Extra 100%"
                      value={p.horasExtra100}
                      onChange={(e) =>
                        cambiar(p.id, { horasExtra100: Number(e.target.value) || 0 })
                      }
                      disabled={soloLectura}
                      min={0}
                      max={8}
                      step={0.5}
                    />
                  </div>

                  <CampoTexto
                    name={`tarea-${p.id}`}
                    etiqueta="Qué hizo"
                    value={p.tarea ?? ''}
                    onChange={(e) => cambiar(p.id, { tarea: e.target.value })}
                    disabled={soloLectura}
                    placeholder={p.especialidad ?? 'Tarea del día'}
                  />

                  {!p.asignado && !soloLectura && (
                    <Boton
                      variante="fantasma"
                      ancho
                      tamano="chico"
                      iconoIzquierda={<X aria-hidden className="size-4" />}
                      onClick={() => {
                        setPersonas((lista) =>
                          lista.filter((x) => x.id !== p.id),
                        )
                        setAbierta(null)
                      }}
                    >
                      Sacar del parte
                    </Boton>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Subcontratistas */}
      <TituloSeccion
        accion={
          !soloLectura ? (
            <button
              type="button"
              onClick={() => setSumandoSub(true)}
              className="flex items-center gap-1 text-menor text-grafito underline"
            >
              <Plus aria-hidden className="size-3" />
              Agregar
            </button>
          ) : undefined
        }
      >
        Subcontratistas que vinieron
      </TituloSeccion>

      {subs.length === 0 ? (
        <p className="px-4 text-chico text-grafito">
          No vino ningún subcontratista.
        </p>
      ) : (
        <div className="divide-y divide-niebla border-y border-niebla bg-blanco">
          {subs.map((s) => (
            <div
              key={s.subcontratistaId}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-negro">{s.razonSocial}</p>
                {s.tarea && (
                  <p className="truncate text-menor text-acero">{s.tarea}</p>
                )}
              </div>
              <span className="cifras text-base font-medium text-negro">
                {plural(s.cantidadPersonas, 'persona')}
              </span>
              {!soloLectura && (
                <button
                  type="button"
                  onClick={() =>
                    setSubs((p) =>
                      p.filter((x) => x.subcontratistaId !== s.subcontratistaId),
                    )
                  }
                  aria-label={`Sacar ${s.razonSocial}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded text-acero active:bg-hueso"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tareas y observaciones */}
      <TituloSeccion>El día</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoTextoLargo
          name="tareas"
          etiqueta="Qué se hizo hoy"
          value={tareas}
          onChange={(e) => setTareas(e.target.value)}
          disabled={soloLectura}
          rows={2}
          placeholder="Armado de encofrado de losa del nivel 3."
        />
        <CampoTextoLargo
          name="observaciones"
          etiqueta="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          disabled={soloLectura}
          rows={2}
          placeholder="Llegó el camión de hierro a las 11."
        />
      </div>

      {/* Guardar y enviar */}
      {!soloLectura && (
        <div className="space-y-2 px-4 pt-6">
          <Boton
            ancho
            tamano="grande"
            cargando={pendiente}
            iconoIzquierda={<Send aria-hidden className="size-5" />}
            onClick={() => setConfirmandoEnvio(true)}
          >
            Enviar parte
          </Boton>
          <Boton
            variante="secundario"
            ancho
            cargando={pendiente}
            onClick={() => guardar(false)}
          >
            Guardar borrador
          </Boton>
          <p className="text-center text-menor text-acero">
            El borrador se puede seguir editando. Una vez enviado, lo revisa el
            jefe de obra.
          </p>
        </div>
      )}

      {/* Sumar a alguien que no estaba asignado */}
      <HojaInferior
        abierta={agregando}
        alCerrar={() => setAgregando(false)}
        titulo="Sumar a alguien al parte"
        descripcion="Alguien que hoy trabajó acá pero no está asignado"
        alto="alto"
      >
        <div className="divide-y divide-niebla">
          {empleadosParaAgregar
            .filter((e) => !personas.some((p) => p.id === e.id))
            .map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setPersonas((p) => [
                    ...p,
                    {
                      ...e,
                      asistencia: Asistencia.PRESENTE,
                      horasNormales: 8,
                      horasExtra50: 0,
                      horasExtra100: 0,
                      tarea: null,
                      asignado: false,
                    },
                  ])
                  setAgregando(false)
                  avisos.mostrar(`${e.nombre} ${e.apellido} agregado`)
                }}
                className="flex min-h-[var(--toque-minimo)] w-full items-center gap-3 py-3 text-left active:bg-hueso"
              >
                <Plus aria-hidden className="size-4 shrink-0 text-acero" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-negro">
                    {e.apellido}, {e.nombre}
                  </span>
                  <span className="block truncate text-menor text-acero">
                    {e.legajo} · {textoEnum(e.categoria)}
                  </span>
                </span>
              </button>
            ))}
        </div>
      </HojaInferior>

      {/* Agregar subcontratista */}
      <HojaInferior
        abierta={sumandoSub}
        alCerrar={() => setSumandoSub(false)}
        titulo="Subcontratista que vino"
      >
        <form
          action={(datos: FormData) => {
            const id = String(datos.get('subcontratistaId') ?? '')
            const cantidad = Number(datos.get('cantidadPersonas') ?? 0)
            if (!id || cantidad < 1) {
              avisos.error('Elegí el subcontratista y cuánta gente vino')
              return
            }
            const sub = subcontratistasDisponibles.find((s) => s.id === id)
            if (!sub) return

            setSubs((p) => [
              ...p.filter((x) => x.subcontratistaId !== id),
              {
                subcontratistaId: id,
                razonSocial: sub.razonSocial,
                cantidadPersonas: cantidad,
                tarea: String(datos.get('tarea') ?? '') || null,
              },
            ])
            setSumandoSub(false)
          }}
          className="space-y-4"
        >
          <CampoSelect
            name="subcontratistaId"
            etiqueta="Subcontratista"
            vacio="Elegí uno…"
            required
            opciones={subcontratistasDisponibles.map((s) => ({
              valor: s.id,
              texto: `${s.razonSocial} · ${textoEnum(s.rubro)}`,
            }))}
          />
          <CampoNumero
            name="cantidadPersonas"
            etiqueta="Cuánta gente vino"
            defaultValue={1}
            min={1}
            required
          />
          <CampoTexto name="tarea" etiqueta="Qué hicieron" />
          <Boton type="submit" ancho>
            Agregar
          </Boton>
        </form>
      </HojaInferior>

      <HojaConfirmacion
        abierta={confirmandoLluvia}
        alCerrar={() => setConfirmandoLluvia(false)}
        alConfirmar={marcarTodosPorLluvia}
        titulo="¿Se paró la obra por lluvia?"
        mensaje={`Se van a marcar las ${personas.length} personas como suspensión por lluvia, con cero horas. Después podés corregir a los que sí trabajaron.`}
        textoConfirmar="Marcar a todos"
      />

      <HojaConfirmacion
        abierta={confirmandoEnvio}
        alCerrar={() => setConfirmandoEnvio(false)}
        alConfirmar={() => guardar(true)}
        titulo="¿Enviar el parte?"
        mensaje={`${resumen.presentes} presentes, ${resumen.ausentes} ausentes y ${resumen.totalHoras} horas. Una vez enviado lo revisa el jefe de obra y no lo vas a poder editar.`}
        textoConfirmar="Enviar parte"
        cargando={pendiente}
      />
    </div>
  )
}
