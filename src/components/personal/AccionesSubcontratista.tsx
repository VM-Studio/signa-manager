'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { MedioPago, TipoDocumentoSubcontratista } from '@prisma/client'
import {
  accionActivarSubcontratista,
  accionGuardarDocumentoSubcontratista,
  type ResultadoPersonal,
} from '@/server/personal/empleados'
import { accionRegistrarPago } from '@/server/personal/quincenas'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  EnlaceBoton,
  HojaInferior,
  useAvisos,
} from '@/components/ui'
import { textoEnum } from '@/lib/formato'

/* =====================================================================
   Barra de acciones de la ficha del subcontratista.
   Cargar documentación es lo que más se hace acá: los seguros y la
   nómina de ART vencen todo el tiempo.
   ===================================================================== */

const hoyTexto = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Hoja = 'documento' | 'pago' | 'baja'

export function AccionesSubcontratista({
  subcontratista,
}: {
  subcontratista: { id: string; razonSocial: string; activo: boolean }
}) {
  const [hoja, setHoja] = useState<Hoja | null>(null)

  return (
    <>
      <div className="scroll-lateral sin-barra flex gap-2 border-b border-niebla bg-blanco px-4 py-3 lg:flex-wrap lg:overflow-visible">
        <EnlaceBoton
          tamano="chico"
          href={`/personal/subcontratistas/${subcontratista.id}/editar`}
        >
          Editar datos
        </EnlaceBoton>
        <Boton
          tamano="chico"
          variante="secundario"
          onClick={() => setHoja('documento')}
        >
          Cargar documento
        </Boton>
        <Boton
          tamano="chico"
          variante="secundario"
          onClick={() => setHoja('pago')}
        >
          Registrar pago
        </Boton>
        <Boton
          tamano="chico"
          variante="fantasma"
          onClick={() => setHoja('baja')}
        >
          {subcontratista.activo ? 'Dar de baja' : 'Reactivar'}
        </Boton>
      </div>

      <HojaDocumento
        abierta={hoja === 'documento'}
        alCerrar={() => setHoja(null)}
        subcontratistaId={subcontratista.id}
      />
      <HojaPago
        abierta={hoja === 'pago'}
        alCerrar={() => setHoja(null)}
        subcontratistaId={subcontratista.id}
      />
      <HojaBaja
        abierta={hoja === 'baja'}
        alCerrar={() => setHoja(null)}
        subcontratista={subcontratista}
      />
    </>
  )
}

function BotonGuardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      {texto}
    </Boton>
  )
}

function HojaDocumento({
  abierta,
  alCerrar,
  subcontratistaId,
}: {
  abierta: boolean
  alCerrar: () => void
  subcontratistaId: string
}) {
  const avisos = useAvisos()
  const router = useRouter()

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarDocumentoSubcontratista(
        subcontratistaId,
        previo,
        datos,
      )
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  if (!abierta) return null
  const e = estado.errores ?? {}

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo="Cargar documento"
      descripcion="Nómina de ART, seguros, constancia de ARCA, F931."
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}
        <CampoSelect
          name="tipo"
          etiqueta="Qué documento es"
          defaultValue={TipoDocumentoSubcontratista.ART_NOMINA}
          opciones={Object.values(TipoDocumentoSubcontratista).map((t) => ({
            valor: t,
            texto: textoEnum(t),
          }))}
        />
        <CampoFecha
          name="vencimiento"
          etiqueta="Vence el"
          required
          error={e.vencimiento}
          ayuda="Es lo que dispara la alerta antes de que se venza."
        />
        <CampoTexto
          name="descripcion"
          etiqueta="Detalle"
          placeholder="Póliza, aseguradora, período…"
        />
        <div className="flex gap-2 pt-1">
          <Boton variante="secundario" ancho type="button" onClick={alCerrar}>
            Cancelar
          </Boton>
          <BotonGuardar texto="Guardar" />
        </div>
      </form>
    </HojaInferior>
  )
}

function HojaPago({
  abierta,
  alCerrar,
  subcontratistaId,
}: {
  abierta: boolean
  alCerrar: () => void
  subcontratistaId: string
}) {
  const avisos = useAvisos()
  const router = useRouter()

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async (previo, datos) => {
      datos.set('subcontratistaId', subcontratistaId)
      const r = await accionRegistrarPago(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  if (!abierta) return null
  const e = estado.errores ?? {}

  return (
    <HojaInferior abierta alCerrar={alCerrar} titulo="Registrar pago">
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}
        <CampoNumero
          name="monto"
          etiqueta="Monto"
          prefijo="$"
          required
          error={e.monto}
          autoFocus
        />
        <CampoFecha name="fecha" etiqueta="Fecha" defaultValue={hoyTexto()} />
        <CampoSelect
          name="medio"
          etiqueta="Medio"
          defaultValue={MedioPago.TRANSFERENCIA}
          opciones={Object.values(MedioPago).map((m) => ({
            valor: m,
            texto: textoEnum(m),
          }))}
        />
        <CampoTextoLargo
          name="concepto"
          etiqueta="Concepto"
          rows={2}
          placeholder="Certificado 3, instalación sanitaria"
        />
        <div className="flex gap-2 pt-1">
          <Boton variante="secundario" ancho type="button" onClick={alCerrar}>
            Cancelar
          </Boton>
          <BotonGuardar texto="Registrar" />
        </div>
      </form>
    </HojaInferior>
  )
}

function HojaBaja({
  abierta,
  alCerrar,
  subcontratista,
}: {
  abierta: boolean
  alCerrar: () => void
  subcontratista: { id: string; razonSocial: string; activo: boolean }
}) {
  const avisos = useAvisos()
  const router = useRouter()

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async () => {
      const r = await accionActivarSubcontratista(
        subcontratista.id,
        !subcontratista.activo,
      )
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  if (!abierta) return null

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo={subcontratista.activo ? 'Dar de baja' : 'Reactivar'}
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}
        <p className="text-base text-grafito">
          {subcontratista.activo
            ? `${subcontratista.razonSocial} deja de aparecer para asignar a obras. El historial y los pagos quedan.`
            : `${subcontratista.razonSocial} vuelve a estar disponible para asignar a obras.`}
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" ancho type="button" onClick={alCerrar}>
            Cancelar
          </Boton>
          <BotonBaja activo={subcontratista.activo} />
        </div>
      </form>
    </HojaInferior>
  )
}

function BotonBaja({ activo }: { activo: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Boton
      type="submit"
      ancho
      variante={activo ? 'peligro' : 'primario'}
      cargando={pending}
    >
      {activo ? 'Dar de baja' : 'Reactivar'}
    </Boton>
  )
}
