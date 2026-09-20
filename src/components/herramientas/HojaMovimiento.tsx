'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Condicion } from '@prisma/client'
import { accionMoverHerramienta, type Resultado } from '@/server/herramientas/acciones'
import {
  type AccionHerramienta,
  TEXTO_ACCION,
} from '@/server/herramientas/movimientos'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTextoLargo,
  HojaInferior,
  useAvisos,
} from '@/components/ui'

/* =====================================================================
   Toda acción sobre una herramienta es un formulario corto en una hoja
   inferior. Los campos cambian según la acción: no tiene sentido pedir
   la obra de destino para dar de baja.
   ===================================================================== */

export interface OpcionesMovimiento {
  obras: Array<{ id: string; codigo: string; nombre: string }>
  depositos: Array<{ id: string; nombre: string }>
  empleados: Array<{ id: string; nombre: string; apellido: string; legajo: string }>
}

export function HojaMovimiento({
  herramientaId,
  herramientaNombre,
  accion,
  esPorCantidad,
  stockDisponible,
  opciones,
  solicitudId,
  alCerrar,
}: {
  herramientaId: string
  herramientaNombre: string
  accion: AccionHerramienta
  esPorCantidad?: boolean
  stockDisponible?: number
  opciones: OpcionesMovimiento
  solicitudId?: string
  alCerrar: () => void
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [ofreceTaller, setOfreceTaller] = useState(false)

  const [estado, ejecutar] = useActionState<Resultado, FormData>(
    async (previo, datos) => {
      datos.set('accion', accion)
      if (solicitudId) datos.set('solicitudId', solicitudId)

      const r = await accionMoverHerramienta(herramientaId, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        router.refresh()
        // Si volvió en mala condición, se ofrece mandarla al taller ahí mismo.
        if (r.sugerirReparacion) setOfreceTaller(true)
        else alCerrar()
      }
      return r
    },
    {},
  )

  const pide = {
    obra: accion === 'ENTREGAR' || accion === 'TRANSFERIR',
    deposito: accion === 'DEVOLVER' || accion === 'VOLVIO_DE_REPARACION',
    responsable: accion === 'ENTREGAR' || accion === 'TRANSFERIR',
    devolucion: accion === 'ENTREGAR' || accion === 'TRANSFERIR',
    condicion:
      accion === 'DEVOLVER' ||
      accion === 'VOLVIO_DE_REPARACION' ||
      accion === 'TRANSFERIR',
    motivo:
      accion === 'MARCAR_EXTRAVIADA' ||
      accion === 'DAR_DE_BAJA' ||
      accion === 'ENVIAR_A_REPARACION',
  }

  const esPeligrosa = accion === 'DAR_DE_BAJA' || accion === 'MARCAR_EXTRAVIADA'

  if (ofreceTaller) {
    return (
      <HojaInferior
        abierta
        alCerrar={alCerrar}
        titulo="Volvió en mala condición"
        descripcion={herramientaNombre}
        pie={
          <div className="flex gap-2">
            <Boton variante="secundario" ancho onClick={alCerrar}>
              Dejarla así
            </Boton>
            <Boton
              ancho
              onClick={() => {
                alCerrar()
                router.push(`/herramientas/${herramientaId}?accion=ENVIAR_A_REPARACION`)
              }}
            >
              Mandarla al taller
            </Boton>
          </div>
        }
      >
        <p className="text-base text-grafito">
          La devolución quedó registrada y la herramienta figura como
          disponible. Como volvió en mala condición, conviene mandarla a
          reparación antes de que alguien la lleve a otra obra.
        </p>
      </HojaInferior>
    )
  }

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo={TEXTO_ACCION[accion]}
      descripcion={herramientaNombre}
      alto={pide.obra || pide.deposito ? 'alto' : 'auto'}
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}

        {esPeligrosa && (
          <AvisoFijo tono="aviso">
            Esta acción queda registrada en el historial de la herramienta y no
            se puede deshacer.
          </AvisoFijo>
        )}

        {pide.obra && (
          <CampoSelect
            name="obraDestinoId"
            etiqueta={accion === 'TRANSFERIR' ? 'Obra de destino' : 'Obra'}
            vacio="Elegí una obra…"
            required
            opciones={opciones.obras.map((o) => ({
              valor: o.id,
              texto: `${o.codigo} · ${o.nombre}`,
            }))}
          />
        )}

        {pide.deposito && (
          <CampoSelect
            name="depositoDestinoId"
            etiqueta="Depósito de destino"
            vacio="Elegí un depósito…"
            required
            opciones={opciones.depositos.map((d) => ({
              valor: d.id,
              texto: d.nombre,
            }))}
          />
        )}

        {/* Para entregar por cantidad hace falta saber de qué depósito sale. */}
        {esPorCantidad && accion === 'ENTREGAR' && (
          <CampoSelect
            name="depositoDestinoId"
            etiqueta="Sale del depósito"
            vacio="Elegí un depósito…"
            required
            opciones={opciones.depositos.map((d) => ({
              valor: d.id,
              texto: d.nombre,
            }))}
          />
        )}

        {esPorCantidad && (
          <CampoNumero
            name="cantidad"
            etiqueta="Cantidad"
            defaultValue={1}
            min={1}
            max={stockDisponible}
            required
            ayuda={
              stockDisponible !== undefined
                ? `Hay ${stockDisponible} unidades.`
                : undefined
            }
          />
        )}

        {pide.responsable && (
          <CampoSelect
            name="empleadoId"
            etiqueta="Quién la recibe"
            vacio="Sin responsable"
            opciones={opciones.empleados.map((e) => ({
              valor: e.id,
              texto: `${e.apellido}, ${e.nombre} · ${e.legajo}`,
            }))}
            ayuda="Queda como responsable hasta que la devuelva."
          />
        )}

        {pide.devolucion && (
          <CampoFecha
            name="fechaDevolucionPrevista"
            etiqueta="Devolución prevista"
            ayuda="Si se pasa esta fecha, el sistema avisa."
          />
        )}

        {pide.condicion && (
          <CampoSelect
            name="condicion"
            etiqueta="¿En qué condición está?"
            defaultValue={Condicion.BUENA}
            required
            opciones={[
              { valor: Condicion.BUENA, texto: 'Buena' },
              { valor: Condicion.REGULAR, texto: 'Regular' },
              { valor: Condicion.MALA, texto: 'Mala · hay que repararla' },
            ]}
          />
        )}

        <CampoTextoLargo
          name="observaciones"
          etiqueta={
            accion === 'DAR_DE_BAJA'
              ? 'Motivo de la baja'
              : accion === 'MARCAR_EXTRAVIADA'
                ? '¿Qué pasó?'
                : accion === 'ENVIAR_A_REPARACION'
                  ? '¿Qué le pasa?'
                  : 'Observaciones'
          }
          required={pide.motivo}
          rows={2}
          error={estado.errores?.observaciones}
        />

        <Confirmar accion={accion} peligrosa={esPeligrosa} />
      </form>
    </HojaInferior>
  )
}

function Confirmar({
  accion,
  peligrosa,
}: {
  accion: AccionHerramienta
  peligrosa: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Boton
      type="submit"
      ancho
      tamano="grande"
      variante={peligrosa ? 'peligro' : 'primario'}
      cargando={pending}
    >
      {TEXTO_ACCION[accion]}
    </Boton>
  )
}
