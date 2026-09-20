'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Lock } from 'lucide-react'
import { EstadoObra, OrigenDato, TipoObra } from '@prisma/client'
import {
  accionCrearObra,
  accionEditarObra,
  type EstadoFormulario,
} from '@/server/obras/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  Interruptor,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'

/* =====================================================================
   Alta y edición de obra.

   La parte importante: cuando la obra viene del sistema base, sus campos
   se muestran pero bloqueados, con la aclaración de dónde se editan. La
   Server Action además los ignora, así que no alcanza con sacar el
   disabled desde el inspector.
   ===================================================================== */

export interface ValoresObra {
  id?: string
  codigo: string
  nombre: string
  tipo: TipoObra
  estado: EstadoObra
  cliente: string | null
  unidadNegocioId: string
  jefeObraId: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  esInterior: boolean
  presupuestoTotal: number | null
  presupuestoManoObra: number | null
  fechaInicio: Date | null
  fechaFinPrevista: Date | null
  fechaFinReal: Date | null
  origen: OrigenDato
}

function aValorFecha(fecha: Date | null): string {
  if (!fecha) return ''
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function FormularioObra({
  valores,
  unidades,
  jefes,
}: {
  valores?: ValoresObra
  unidades: Array<{ id: string; nombre: string }>
  jefes: Array<{ id: string; nombre: string; rol: string }>
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const esEdicion = Boolean(valores?.id)
  const delSistemaBase = valores?.origen === OrigenDato.SISTEMA_BASE

  const accion = esEdicion
    ? accionEditarObra.bind(null, valores!.id as string)
    : accionCrearObra

  const [estado, ejecutar] = useActionState<EstadoFormulario, FormData>(
    async (previo, datos) => {
      const resultado = await accion(previo, datos)
      if (resultado.ok) {
        avisos.correcto(esEdicion ? 'Obra guardada' : 'Obra creada')
        router.push(valores?.id ? `/obras/${valores.id}` : '/obras')
      }
      return resultado
    },
    {},
  )

  const e = estado.errores ?? {}

  return (
    <form action={ejecutar} className="pb-8 lg:max-w-[900px]">
      {estado.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico">{estado.error}</AvisoFijo>
        </div>
      )}

      {delSistemaBase && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="neutro" titulo="Esta obra viene del sistema base">
            El código, el nombre, el cliente, el estado, la unidad y el
            presupuesto total se editan allá. Acá podés cargar lo que es
            nuestro: jefe de obra, presupuesto de mano de obra, ubicación y
            si es del interior.
          </AvisoFijo>
        </div>
      )}

      {/* ---------------- Datos del sistema base ---------------- */}
      <TituloSeccion>
        {delSistemaBase ? 'Datos del sistema base' : 'Datos de la obra'}
      </TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoTexto
          name="codigo"
          etiqueta="Código de obra"
          defaultValue={valores?.codigo}
          placeholder="SIG-2026-014"
          required={!delSistemaBase}
          disabled={delSistemaBase}
          error={e.codigo}
          ayuda={
            delSistemaBase
              ? 'Se edita en el sistema base'
              : 'Es la clave que comparten esta app y el sistema base.'
          }
        />

        <CampoTexto
          name="nombre"
          etiqueta="Nombre"
          defaultValue={valores?.nombre}
          placeholder="Edificio Los Robles"
          required={!delSistemaBase}
          disabled={delSistemaBase}
          error={e.nombre}
          ayuda={delSistemaBase ? 'Se edita en el sistema base' : undefined}
        />

        <CampoSelect
          name="unidadNegocioId"
          etiqueta="Unidad de negocio"
          defaultValue={valores?.unidadNegocioId}
          vacio={valores?.unidadNegocioId ? undefined : 'Elegí una unidad…'}
          required={!delSistemaBase}
          disabled={delSistemaBase}
          error={e.unidadNegocioId}
          ayuda={delSistemaBase ? 'Se edita en el sistema base' : undefined}
          opciones={unidades.map((u) => ({ valor: u.id, texto: u.nombre }))}
        />

        <CampoSelect
          name="tipo"
          etiqueta="Tipo"
          defaultValue={valores?.tipo ?? TipoObra.TERCEROS}
          disabled={delSistemaBase}
          error={e.tipo}
          ayuda={delSistemaBase ? 'Se edita en el sistema base' : undefined}
          opciones={[
            { valor: TipoObra.PROPIA, texto: 'Obra propia' },
            { valor: TipoObra.TERCEROS, texto: 'Para terceros' },
          ]}
        />

        <CampoSelect
          name="estado"
          etiqueta="Estado"
          defaultValue={valores?.estado ?? EstadoObra.EN_CURSO}
          disabled={delSistemaBase}
          error={e.estado}
          ayuda={delSistemaBase ? 'Se edita en el sistema base' : undefined}
          opciones={[
            { valor: EstadoObra.PLANIFICADA, texto: 'Planificada' },
            { valor: EstadoObra.EN_CURSO, texto: 'En curso' },
            { valor: EstadoObra.PAUSADA, texto: 'Pausada' },
            { valor: EstadoObra.FINALIZADA, texto: 'Finalizada' },
          ]}
        />

        <CampoTexto
          name="cliente"
          etiqueta="Cliente"
          defaultValue={valores?.cliente ?? ''}
          placeholder="Solo para obras de terceros"
          disabled={delSistemaBase}
          error={e.cliente}
          ayuda={delSistemaBase ? 'Se edita en el sistema base' : undefined}
        />

        <CampoNumero
          name="presupuestoTotal"
          etiqueta="Presupuesto total"
          prefijo="$"
          defaultValue={valores?.presupuestoTotal ?? ''}
          disabled={delSistemaBase}
          error={e.presupuestoTotal}
          ayuda={delSistemaBase ? 'Se edita en el sistema base' : undefined}
        />

        <CampoFecha
          name="fechaInicio"
          etiqueta="Fecha de inicio"
          defaultValue={aValorFecha(valores?.fechaInicio ?? null)}
          disabled={delSistemaBase}
          error={e.fechaInicio}
        />

        <CampoFecha
          name="fechaFinPrevista"
          etiqueta="Fin previsto"
          defaultValue={aValorFecha(valores?.fechaFinPrevista ?? null)}
          disabled={delSistemaBase}
          error={e.fechaFinPrevista}
        />

        {(valores?.fechaFinReal || !delSistemaBase) && (
          <CampoFecha
            name="fechaFinReal"
            etiqueta="Fin real"
            defaultValue={aValorFecha(valores?.fechaFinReal ?? null)}
            disabled={delSistemaBase}
            error={e.fechaFinReal}
          />
        )}
      </div>

      {/* ---------------- Datos nuestros ---------------- */}
      <TituloSeccion>
        {delSistemaBase ? 'Lo que se carga en esta app' : 'Obra y ubicación'}
      </TituloSeccion>
      <div className="campos-formulario px-4">
        <CampoSelect
          name="jefeObraId"
          etiqueta="Jefe de obra"
          defaultValue={valores?.jefeObraId ?? ''}
          vacio="Sin asignar"
          error={e.jefeObraId}
          opciones={jefes.map((j) => ({ valor: j.id, texto: j.nombre }))}
        />

        <CampoNumero
          name="presupuestoManoObra"
          etiqueta="Presupuesto de mano de obra"
          prefijo="$"
          defaultValue={valores?.presupuestoManoObra ?? ''}
          error={e.presupuestoManoObra}
          ayuda="Contra esto se mide lo que se gasta en el personal de la obra."
        />

        <CampoTexto
          name="direccion"
          etiqueta="Dirección"
          defaultValue={valores?.direccion ?? ''}
          placeholder="Av. Maipú 3240"
          error={e.direccion}
        />

        <CampoTexto
          name="localidad"
          etiqueta="Localidad"
          defaultValue={valores?.localidad ?? ''}
          placeholder="Martínez"
          error={e.localidad}
        />

        <CampoTexto
          name="provincia"
          etiqueta="Provincia"
          defaultValue={valores?.provincia ?? 'Buenos Aires'}
          error={e.provincia}
        />

        <Interruptor
          name="esInterior"
          etiqueta="Obra del interior"
          descripcion="Habilita viáticos y logística de larga distancia."
          defaultChecked={valores?.esInterior}
        />
      </div>

      <div className="mt-6 flex gap-2 px-4">
        <Boton variante="secundario" ancho onClick={() => router.back()}>
          Cancelar
        </Boton>
        <BotonGuardar esEdicion={esEdicion} />
      </div>
    </form>
  )
}

function BotonGuardar({ esEdicion }: { esEdicion: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      {esEdicion ? 'Guardar cambios' : 'Crear obra'}
    </Boton>
  )
}

/** Candado para las etiquetas de los campos bloqueados. */
export function IconoBloqueado() {
  return <Lock aria-hidden className="size-3 text-metadato" />
}
