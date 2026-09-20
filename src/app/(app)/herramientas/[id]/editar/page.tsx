import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import {
  categorias,
  depositosActivos,
  obtenerHerramienta,
} from '@/server/herramientas/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioHerramienta } from '@/components/herramientas/FormularioHerramienta'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaEditarHerramienta({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('herramientas.editar')
  if (!sesion) return <SinPermiso titulo="Editar herramienta" />

  const { id } = await params
  const h = await obtenerHerramienta(id)
  if (!h) notFound()

  const [cats, depositos] = await Promise.all([categorias(), depositosActivos()])

  return (
    <>
      <EncabezadoPantalla
        titulo="Editar herramienta"
        subtitulo={h.codigo}
        volverA={`/herramientas/${h.id}`}
      />
      <FormularioHerramienta
        categorias={cats}
        depositos={depositos}
        valores={{
          id: h.id,
          codigo: h.codigo,
          nombre: h.nombre,
          categoriaId: h.categoriaId,
          tipoControl: h.tipoControl,
          marca: h.marca,
          modelo: h.modelo,
          nroSerie: h.nroSerie,
          notas: h.notas,
          fechaCompra: h.fechaCompra,
          valorCompra: h.valorCompra ? Number(h.valorCompra) : null,
          proveedor: h.proveedor,
          costoDiarioImputable: h.costoDiarioImputable
            ? Number(h.costoDiarioImputable)
            : null,
          mantenimientoCadaDias: h.mantenimientoCadaDias,
        }}
      />
    </>
  )
}
