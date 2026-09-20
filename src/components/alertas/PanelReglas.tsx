'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { CanalNotificacion, Rol, Severidad } from '@prisma/client'
import {
  accionGuardarRegla,
  type ResultadoAlerta,
} from '@/server/alertas/acciones'
import {
  AvisoFijo,
  Boton,
  CampoNumero,
  CampoSelect,
  FilaLista,
  HojaInferior,
  Insignia,
  Interruptor,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { NOMBRE_ROL } from '@/lib/auth/permisos'
import { plural } from '@/lib/formato'

export interface ReglaVista {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  modulo: string
  severidad: Severidad
  umbral: number | null
  activa: boolean
  rolesDestino: Rol[]
  canales: CanalNotificacion[]
  alertasAbiertas: number
}

const NOMBRE_MODULO: Record<string, string> = {
  herramientas: 'Herramientas',
  personal: 'Personal',
  vehiculos: 'Vehículos',
  compras: 'Compras',
  obras: 'Obras',
  sistema: 'Sistema',
}

/** Qué mide el umbral de cada regla, para que se entienda al editarla. */
const UNIDAD: Record<string, string> = {
  HERRAMIENTA_NO_DEVUELTA: 'días de atraso para que pase a crítica',
  HERRAMIENTA_EN_OBRA_INACTIVA: 'días en la obra parada',
  MANTENIMIENTO_HERRAMIENTA_VENCIDO: 'días (0 = apenas vence)',
  HERRAMIENTA_EN_REPARACION_DEMORADA: 'días en el taller',
  SOLICITUD_HERRAMIENTA_SIN_RESOLVER: 'días antes de la fecha necesaria',
  DOC_EMPLEADO_POR_VENCER: 'días de anticipación',
  DOC_SUBCONTRATISTA_VENCIDA: 'días de presencia hacia atrás que se miran',
  PARTE_DIARIO_FALTANTE: 'días hábiles hacia atrás que se revisan',
  PARTE_SIN_APROBAR: 'días esperando aprobación',
  HORAS_EXTRA_EXCESIVAS: 'horas extra en la quincena',
  EMPLEADO_SIN_ASIGNACION: 'días hábiles sin obra',
  AUSENCIAS_SIN_AVISO: 'ausencias en el mes',
  PRESUPUESTO_MANO_OBRA: '% del presupuesto consumido',
  DOC_VEHICULO_POR_VENCER: 'días de anticipación',
  LICENCIA_CHOFER_POR_VENCER: 'días de anticipación',
  SERVICE_VEHICULO_PROXIMO: 'kilómetros restantes',
  SOLICITUD_VIAJE_SIN_ASIGNAR: 'horas antes del viaje',
  VIAJE_EN_CURSO_DEMORADO: 'horas en curso',
  CONSUMO_COMBUSTIBLE_ALTO: '% por encima del propio promedio',
  PEDIDO_SIN_APROBAR: 'días esperando aprobación',
  MATERIAL_NO_ENTREGADO: 'días (0 = apenas se pasa la fecha)',
  ENTREGA_POSTERIOR_A_NECESIDAD: 'días (0 = cualquier atraso)',
  SINCRONIZACION_ATRASADA: 'horas sin sincronizar',
}

export function PanelReglas({ reglas }: { reglas: ReglaVista[] }) {
  const [editando, setEditando] = useState<ReglaVista | null>(null)

  const porModulo = new Map<string, ReglaVista[]>()
  for (const r of reglas) {
    const lista = porModulo.get(r.modulo) ?? []
    lista.push(r)
    porModulo.set(r.modulo, lista)
  }

  const activas = reglas.filter((r) => r.activa).length

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <AvisoFijo tono="neutro">
          {plural(activas, 'regla activa', 'reglas activas')} de {reglas.length}.
          El sistema las corre cada hora y también después de las acciones que
          más problemas resuelven.
        </AvisoFijo>
      </div>

      {[...porModulo.entries()].map(([modulo, lista]) => (
        <div key={modulo}>
          <TituloSeccion>{NOMBRE_MODULO[modulo] ?? modulo}</TituloSeccion>
          <Lista>
            {lista.map((r) => (
              <FilaLista
                key={r.id}
                titulo={r.nombre}
                subtitulo={r.descripcion}
                detalle={
                  r.umbral !== null
                    ? `Umbral: ${r.umbral} ${UNIDAD[r.codigo] ?? ''}`.trim()
                    : undefined
                }
                tono={!r.activa ? 'neutro' : undefined}
                derecha={r.alertasAbiertas > 0 ? String(r.alertasAbiertas) : undefined}
                debajoDerecha={
                  <div className="flex flex-col items-end gap-1">
                    <Insignia
                      tono={
                        !r.activa
                          ? 'neutro'
                          : r.severidad === Severidad.CRITICA
                            ? 'critico'
                            : 'aviso'
                      }
                    >
                      {!r.activa
                        ? 'Desactivada'
                        : r.severidad === Severidad.CRITICA
                          ? 'Crítica'
                          : r.severidad === Severidad.AVISO
                            ? 'Aviso'
                            : 'Info'}
                    </Insignia>
                  </div>
                }
                alTocar={() => setEditando(r)}
              />
            ))}
          </Lista>
        </div>
      ))}

      {editando && (
        <HojaRegla regla={editando} alCerrar={() => setEditando(null)} />
      )}
    </div>
  )
}

function HojaRegla({
  regla,
  alCerrar,
}: {
  regla: ReglaVista
  alCerrar: () => void
}) {
  const router = useRouter()
  const avisos = useAvisos()

  const [estado, ejecutar] = useActionState<ResultadoAlerta, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarRegla(regla.id, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Guardada')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo={regla.nombre}
      descripcion={NOMBRE_MODULO[regla.modulo] ?? regla.modulo}
      alto="alto"
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

        <p className="text-chico text-grafito">{regla.descripcion}</p>

        <Interruptor
          name="activa"
          etiqueta="Regla activa"
          descripcion="Si la desactivás, sus alertas abiertas se resuelven."
          defaultChecked={regla.activa}
        />

        {regla.umbral !== null && (
          <CampoNumero
            name="umbral"
            etiqueta="Umbral"
            defaultValue={regla.umbral}
            min={0}
            ayuda={UNIDAD[regla.codigo]}
          />
        )}

        <CampoSelect
          name="severidad"
          etiqueta="Severidad"
          defaultValue={regla.severidad}
          opciones={[
            { valor: Severidad.INFO, texto: 'Info · solo para mirar' },
            { valor: Severidad.AVISO, texto: 'Aviso · hay que resolverlo' },
            { valor: Severidad.CRITICA, texto: 'Crítica · frena la obra' },
          ]}
          ayuda="Algunas reglas suben solas a crítica cuando el problema empeora."
        />

        <fieldset>
          <legend className="mb-1.5 text-menor font-medium text-grafito">
            Quién la recibe
          </legend>
          <div className="divide-y divide-niebla">
            {Object.values(Rol).map((rol) => (
              <label
                key={rol}
                className="flex min-h-[44px] cursor-pointer items-center gap-3"
              >
                <input
                  type="checkbox"
                  name="rolesDestino"
                  value={rol}
                  defaultChecked={regla.rolesDestino.includes(rol)}
                  className="size-5 shrink-0 rounded-[3px] border-2 border-grafito accent-negro"
                />
                <span className="text-base text-negro">{NOMBRE_ROL[rol]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-menor font-medium text-grafito">
            Por dónde avisa
          </legend>
          <div className="divide-y divide-niebla">
            {[
              { valor: CanalNotificacion.APP, texto: 'En la app', listo: true },
              { valor: CanalNotificacion.EMAIL, texto: 'Por email', listo: false },
              { valor: CanalNotificacion.WHATSAPP, texto: 'Por WhatsApp', listo: false },
            ].map((c) => (
              <label
                key={c.valor}
                className="flex min-h-[44px] cursor-pointer items-center gap-3"
              >
                <input
                  type="checkbox"
                  name="canales"
                  value={c.valor}
                  defaultChecked={regla.canales.includes(c.valor)}
                  className="size-5 shrink-0 rounded-[3px] border-2 border-grafito accent-negro"
                />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="text-base text-negro">{c.texto}</span>
                  {!c.listo && (
                    <Insignia tono="neutro">Falta conectar</Insignia>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Guardar />
      </form>
    </HojaInferior>
  )
}

function Guardar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      Guardar
    </Boton>
  )
}
