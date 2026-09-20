'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { TipoControlHerramienta } from '@prisma/client'
import {
  accionGuardarHerramienta,
  type Resultado,
} from '@/server/herramientas/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'

export interface ValoresHerramienta {
  id?: string
  codigo: string
  nombre: string
  categoriaId: string
  tipoControl: TipoControlHerramienta
  marca: string | null
  modelo: string | null
  nroSerie: string | null
  notas: string | null
  fechaCompra: Date | null
  valorCompra: number | null
  proveedor: string | null
  costoDiarioImputable: number | null
  mantenimientoCadaDias: number | null
}

function aValorFecha(f: Date | null): string {
  if (!f) return ''
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export function FormularioHerramienta({
  valores,
  categorias,
  depositos,
  codigoSugerido,
}: {
  valores?: ValoresHerramienta
  categorias: Array<{ id: string; nombre: string }>
  depositos: Array<{ id: string; nombre: string }>
  codigoSugerido?: string
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const esEdicion = Boolean(valores?.id)
  const [tipo, setTipo] = useState<TipoControlHerramienta>(
    valores?.tipoControl ?? TipoControlHerramienta.UNITARIO,
  )

  const [estado, ejecutar] = useActionState<Resultado, FormData>(
    async (previo, datos) => {
      const r = await accionGuardarHerramienta(valores?.id ?? null, previo, datos)
      if (r.ok) {
        avisos.correcto(r.mensaje ?? 'Listo')
        router.push(r.id ? `/herramientas/${r.id}` : '/herramientas')
      }
      return r
    },
    {},
  )

  const e = estado.errores ?? {}
  const esPorCantidad = tipo === TipoControlHerramienta.CANTIDAD

  return (
    <form action={ejecutar} className="pb-8">
      {estado.error && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico">{estado.error}</AvisoFijo>
        </div>
      )}

      <TituloSeccion>Qué es</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoTexto
          name="codigo"
          etiqueta="Código"
          defaultValue={valores?.codigo ?? codigoSugerido}
          required
          error={e.codigo}
          autoCapitalize="characters"
          ayuda="Es el que va impreso en la etiqueta QR. Se sugiere el siguiente libre."
        />
        <CampoTexto
          name="nombre"
          etiqueta="Nombre"
          defaultValue={valores?.nombre}
          placeholder="Amoladora angular 4½&quot;"
          required
          error={e.nombre}
        />
        <CampoSelect
          name="categoriaId"
          etiqueta="Categoría"
          defaultValue={valores?.categoriaId}
          vacio={valores?.categoriaId ? undefined : 'Elegí una categoría…'}
          required
          error={e.categoriaId}
          opciones={categorias.map((c) => ({ valor: c.id, texto: c.nombre }))}
        />
        <CampoSelect
          name="tipoControl"
          etiqueta="Cómo se controla"
          value={tipo}
          onChange={(ev) => setTipo(ev.target.value as TipoControlHerramienta)}
          disabled={esEdicion}
          error={e.tipoControl}
          opciones={[
            { valor: TipoControlHerramienta.UNITARIO, texto: 'De a una, con su QR' },
            { valor: TipoControlHerramienta.CANTIDAD, texto: 'Por cantidad (palas, baldes…)' },
          ]}
          ayuda={
            esEdicion
              ? 'No se puede cambiar después del alta.'
              : 'Las que se controlan por cantidad no llevan QR propio.'
          }
        />
        <CampoTexto
          name="marca"
          etiqueta="Marca"
          defaultValue={valores?.marca ?? ''}
          placeholder="Bosch"
          error={e.marca}
        />
        <CampoTexto
          name="modelo"
          etiqueta="Modelo"
          defaultValue={valores?.modelo ?? ''}
          error={e.modelo}
        />
        {!esPorCantidad && (
          <CampoTexto
            name="nroSerie"
            etiqueta="Número de serie"
            defaultValue={valores?.nroSerie ?? ''}
            error={e.nroSerie}
          />
        )}
      </div>

      <TituloSeccion>Compra</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoFecha
          name="fechaCompra"
          etiqueta="Fecha de compra"
          defaultValue={aValorFecha(valores?.fechaCompra ?? null)}
        />
        <CampoNumero
          name="valorCompra"
          etiqueta="Valor de compra"
          prefijo="$"
          defaultValue={valores?.valorCompra ?? ''}
          ayuda="Se usa para medir las compras evitadas y el valor del inventario."
        />
        <CampoTexto
          name="proveedor"
          etiqueta="Proveedor"
          defaultValue={valores?.proveedor ?? ''}
        />
        <CampoNumero
          name="costoDiarioImputable"
          etiqueta="Costo diario a la obra"
          prefijo="$"
          defaultValue={valores?.costoDiarioImputable ?? ''}
          ayuda="Solo para las grandes. Se le carga a la obra por cada día que la tenga."
        />
      </div>

      <TituloSeccion>Mantenimiento</TituloSeccion>
      <div className="space-y-4 px-4">
        <CampoNumero
          name="mantenimientoCadaDias"
          etiqueta="Mantenimiento cada"
          sufijo="días"
          defaultValue={valores?.mantenimientoCadaDias ?? ''}
          ayuda="Dejalo vacío si no lleva mantenimiento programado."
        />
      </div>

      {!esEdicion && (
        <>
          <TituloSeccion>Dónde queda</TituloSeccion>
          <div className="space-y-4 px-4">
            <CampoSelect
              name="depositoId"
              etiqueta="Depósito"
              vacio="Elegí un depósito…"
              required
              opciones={depositos.map((d) => ({ valor: d.id, texto: d.nombre }))}
            />
            {esPorCantidad && (
              <CampoNumero
                name="cantidadInicial"
                etiqueta="Cantidad inicial"
                defaultValue={1}
                min={0}
              />
            )}
          </div>
        </>
      )}

      <TituloSeccion>Notas</TituloSeccion>
      <div className="px-4">
        <CampoTextoLargo
          name="notas"
          etiqueta="Observaciones"
          defaultValue={valores?.notas ?? ''}
          rows={2}
        />
      </div>

      <div className="mt-6 flex gap-2 px-4">
        <Boton variante="secundario" ancho onClick={() => router.back()}>
          Cancelar
        </Boton>
        <Guardar esEdicion={esEdicion} />
      </div>
    </form>
  )
}

function Guardar({ esEdicion }: { esEdicion: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" ancho cargando={pending}>
      {esEdicion ? 'Guardar cambios' : 'Crear herramienta'}
    </Boton>
  )
}
