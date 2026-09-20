'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'
import {
  MedioPago,
  TipoDocumentoEmpleado,
  TipoNovedad,
} from '@prisma/client'
import {
  accionActivarEmpleado,
  accionCambiarValorHora,
  accionGuardarDocumentoEmpleado,
  accionRegistrarEpp,
  type ResultadoPersonal,
} from '@/server/personal/empleados'
import {
  accionRegistrarNovedad,
  accionRegistrarPago,
} from '@/server/personal/quincenas'
import {
  AvisoFijo,
  Boton,
  CampoCheck,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  HojaInferior,
  useAvisos,
} from '@/components/ui'
import { moneda, textoEnum } from '@/lib/formato'

/* =====================================================================
   Los formularios cortos de la ficha del empleado.

   Todos van en hoja inferior y no cambian de pantalla: el de RRHH
   carga tres documentos seguidos sin perder de vista la ficha.
   ===================================================================== */

export type HojaEmpleado =
  | 'valorHora'
  | 'documento'
  | 'epp'
  | 'novedad'
  | 'pago'
  | 'baja'

const hoyTexto = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function HojasEmpleado({
  hoja,
  alCerrar,
  empleado,
  obras,
}: {
  hoja: HojaEmpleado | null
  alCerrar: () => void
  empleado: {
    id: string
    nombre: string
    apellido: string
    activo: boolean
    valorHora: unknown
  }
  obras: Array<{ id: string; codigo: string; nombre: string }>
}) {
  return (
    <>
      <HojaValorHora
        abierta={hoja === 'valorHora'}
        alCerrar={alCerrar}
        empleadoId={empleado.id}
        valorActual={Number(empleado.valorHora)}
      />
      <HojaDocumento
        abierta={hoja === 'documento'}
        alCerrar={alCerrar}
        empleadoId={empleado.id}
      />
      <HojaEpp
        abierta={hoja === 'epp'}
        alCerrar={alCerrar}
        empleadoId={empleado.id}
      />
      <HojaNovedad
        abierta={hoja === 'novedad'}
        alCerrar={alCerrar}
        empleadoId={empleado.id}
        obras={obras}
      />
      <HojaPago
        abierta={hoja === 'pago'}
        alCerrar={alCerrar}
        empleadoId={empleado.id}
      />
      <HojaBaja
        abierta={hoja === 'baja'}
        alCerrar={alCerrar}
        empleado={empleado}
      />
    </>
  )
}

/* ---------------------------------------------------------------------
   Envoltorio común: hoja + formulario + aviso de error + botón guardar.
   --------------------------------------------------------------------- */

function HojaFormulario({
  abierta,
  alCerrar,
  titulo,
  descripcion,
  textoGuardar = 'Guardar',
  accion,
  children,
}: {
  abierta: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  textoGuardar?: string
  accion: (previo: ResultadoPersonal, datos: FormData) => Promise<ResultadoPersonal>
  children: (errores: Record<string, string>) => ReactNode
}) {
  const avisos = useAvisos()
  const router = useRouter()

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async (previo, datos) => {
      const r = await accion(previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        alCerrar()
        router.refresh()
      }
      return r
    },
    {},
  )

  // Mientras está cerrada no se monta: así cada vez que se abre el
  // formulario arranca en blanco, sin lo que se tipeó la vez anterior.
  if (!abierta) return null

  return (
    <HojaInferior
      abierta
      alCerrar={alCerrar}
      titulo={titulo}
      descripcion={descripcion}
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}
        {children(estado.errores ?? {})}
        <div className="flex gap-2 pt-1">
          <Boton variante="secundario" ancho onClick={alCerrar} type="button">
            Cancelar
          </Boton>
          <BotonGuardar texto={textoGuardar} />
        </div>
      </form>
    </HojaInferior>
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

/* ---------------------------- VALOR HORA ---------------------------- */

function HojaValorHora({
  abierta,
  alCerrar,
  empleadoId,
  valorActual,
}: {
  abierta: boolean
  alCerrar: () => void
  empleadoId: string
  valorActual: number
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Cambiar valor hora"
      descripcion={`Ahora cobra ${moneda(valorActual)} la hora.`}
      textoGuardar="Aplicar cambio"
      accion={(previo, datos) =>
        accionCambiarValorHora(empleadoId, previo, datos)
      }
    >
      {(e) => (
        <>
          <CampoNumero
            name="valorHora"
            etiqueta="Valor hora nuevo"
            prefijo="$"
            required
            error={e.valorHora}
            autoFocus
          />
          <CampoTexto
            name="motivo"
            etiqueta="Motivo"
            placeholder="Paritaria UOCRA agosto"
            required
            error={e.motivo}
            ayuda="Queda en el historial. Es lo que se mira cuando alguien pregunta por qué subió."
          />
          <CampoFecha
            name="desde"
            etiqueta="Rige desde"
            defaultValue={hoyTexto()}
            required
            error={e.desde}
            ayuda="Los partes ya aprobados no se tocan: tienen el costo congelado."
          />
        </>
      )}
    </HojaFormulario>
  )
}

/* ---------------------------- DOCUMENTO ----------------------------- */

function HojaDocumento({
  abierta,
  alCerrar,
  empleadoId,
}: {
  abierta: boolean
  alCerrar: () => void
  empleadoId: string
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Cargar documento"
      descripcion="El vencimiento es lo que dispara la alerta."
      accion={(previo, datos) =>
        accionGuardarDocumentoEmpleado(empleadoId, previo, datos)
      }
    >
      {(e) => (
        <>
          <CampoSelect
            name="tipo"
            etiqueta="Qué documento es"
            defaultValue={TipoDocumentoEmpleado.APTO_MEDICO}
            opciones={Object.values(TipoDocumentoEmpleado).map((t) => ({
              valor: t,
              texto: textoEnum(t),
            }))}
          />
          <CampoFecha name="emision" etiqueta="Emitido el" error={e.emision} />
          <CampoFecha
            name="vencimiento"
            etiqueta="Vence el"
            required
            error={e.vencimiento}
          />
          <CampoTexto
            name="descripcion"
            etiqueta="Detalle"
            placeholder="Nº de certificado, aseguradora…"
          />
        </>
      )}
    </HojaFormulario>
  )
}

/* -------------------------------- EPP ------------------------------- */

const EPP_HABITUALES = [
  'Casco',
  'Botines de seguridad',
  'Guantes',
  'Anteojos de seguridad',
  'Arnés',
  'Chaleco reflectivo',
  'Protección auditiva',
  'Ropa de trabajo',
  'Piloto de lluvia',
]

function HojaEpp({
  abierta,
  alCerrar,
  empleadoId,
}: {
  abierta: boolean
  alCerrar: () => void
  empleadoId: string
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Registrar entrega"
      descripcion="Ropa y elementos de protección personal."
      textoGuardar="Registrar"
      accion={(previo, datos) => accionRegistrarEpp(empleadoId, previo, datos)}
    >
      {(e) => (
        <>
          <CampoTexto
            name="elemento"
            etiqueta="Qué se le entregó"
            required
            error={e.elemento}
            list="epp-habituales"
            placeholder="Casco"
            autoFocus
          />
          <datalist id="epp-habituales">
            {EPP_HABITUALES.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
          <CampoNumero
            name="cantidad"
            etiqueta="Cantidad"
            defaultValue={1}
            min={1}
          />
          <CampoTexto name="marca" etiqueta="Marca" placeholder="Libus" />
          <CampoFecha
            name="fecha"
            etiqueta="Fecha de entrega"
            defaultValue={hoyTexto()}
          />
          <CampoCheck
            name="firmado"
            etiqueta="Firmó la constancia"
            descripcion="Sin la firma la entrega no sirve como respaldo ante la ART."
          />
        </>
      )}
    </HojaFormulario>
  )
}

/* ----------------------------- NOVEDAD ------------------------------ */

function HojaNovedad({
  abierta,
  alCerrar,
  empleadoId,
  obras,
}: {
  abierta: boolean
  alCerrar: () => void
  empleadoId: string
  obras: Array<{ id: string; codigo: string; nombre: string }>
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Cargar novedad"
      descripcion="Adelantos, viáticos, premios y descuentos de la quincena."
      accion={(previo, datos) => {
        datos.set('empleadoId', empleadoId)
        return accionRegistrarNovedad(previo, datos)
      }}
    >
      {(e) => (
        <>
          <CampoSelect
            name="tipo"
            etiqueta="Tipo"
            defaultValue={TipoNovedad.ADELANTO}
            opciones={Object.values(TipoNovedad).map((t) => ({
              valor: t,
              texto: textoEnum(t),
            }))}
          />
          <CampoNumero
            name="monto"
            etiqueta="Monto"
            prefijo="$"
            required
            error={e.monto}
            autoFocus
          />
          <CampoFecha
            name="fecha"
            etiqueta="Fecha"
            defaultValue={hoyTexto()}
            error={e.fecha}
          />
          <CampoSelect
            name="obraId"
            etiqueta="Obra"
            vacio="Sin obra"
            opciones={obras.map((o) => ({
              valor: o.id,
              texto: `${o.codigo} · ${o.nombre}`,
            }))}
            ayuda="Si la cargás a una obra, entra en su costo de mano de obra."
          />
          <CampoTexto name="descripcion" etiqueta="Detalle" />
        </>
      )}
    </HojaFormulario>
  )
}

/* ------------------------------- PAGO ------------------------------- */

function HojaPago({
  abierta,
  alCerrar,
  empleadoId,
}: {
  abierta: boolean
  alCerrar: () => void
  empleadoId: string
}) {
  return (
    <HojaFormulario
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Registrar pago"
      textoGuardar="Registrar"
      accion={(previo, datos) => {
        datos.set('empleadoId', empleadoId)
        return accionRegistrarPago(previo, datos)
      }}
    >
      {(e) => (
        <>
          <CampoNumero
            name="monto"
            etiqueta="Monto"
            prefijo="$"
            required
            error={e.monto}
            autoFocus
          />
          <CampoFecha
            name="fecha"
            etiqueta="Fecha"
            defaultValue={hoyTexto()}
            error={e.fecha}
          />
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
            placeholder="Quincena 2 de septiembre"
          />
        </>
      )}
    </HojaFormulario>
  )
}

/* ------------------------------- BAJA ------------------------------- */

function HojaBaja({
  abierta,
  alCerrar,
  empleado,
}: {
  abierta: boolean
  alCerrar: () => void
  empleado: { id: string; nombre: string; apellido: string; activo: boolean }
}) {
  const avisos = useAvisos()
  const router = useRouter()

  const [estado, ejecutar] = useActionState<ResultadoPersonal, FormData>(
    async () => {
      const r = await accionActivarEmpleado(empleado.id, !empleado.activo)
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
      titulo={empleado.activo ? 'Dar de baja' : 'Reactivar'}
    >
      <form action={ejecutar} className="space-y-4">
        {estado.error && <AvisoFijo tono="critico">{estado.error}</AvisoFijo>}
        <p className="text-base text-grafito">
          {empleado.activo
            ? `${empleado.nombre} ${empleado.apellido} deja de aparecer en los partes y en las listas. La ficha y el historial quedan guardados.`
            : `${empleado.nombre} ${empleado.apellido} vuelve a aparecer en los partes y en las listas.`}
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" ancho onClick={alCerrar} type="button">
            Cancelar
          </Boton>
          <BotonBaja activo={empleado.activo} />
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
