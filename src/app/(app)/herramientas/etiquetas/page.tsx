import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarHerramientas, categorias } from '@/server/herramientas/queries'
import { qrsDataUrl } from '@/lib/qr'
import { SinPermiso } from '@/components/app/SinPermiso'
import { SelectorEtiquetas } from '@/components/herramientas/SelectorEtiquetas'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaEtiquetas({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const sesion = await sesionConPermiso('herramientas.editar')
  if (!sesion) return <SinPermiso titulo="Etiquetas" />

  const { ids } = await searchParams
  const preseleccionadas = ids ? ids.split(',').filter(Boolean) : []

  const [herramientas, cats] = await Promise.all([
    listarHerramientas(),
    categorias(),
  ])

  const conCodigo = herramientas.filter((h) => h.estado !== 'BAJA')
  const qrs = await qrsDataUrl(conCodigo.map((h) => h.id), 180)

  return (
    <>
      <div className="no-imprimir">
        <EncabezadoPantalla
          titulo="Etiquetas QR"
          subtitulo="Para pegar en cada herramienta"
          volverA="/herramientas"
        />
      </div>
      <SelectorEtiquetas
        preseleccionadas={preseleccionadas}
        categorias={cats.map((c) => c.nombre)}
        herramientas={conCodigo.map((h) => ({
          id: h.id,
          codigo: h.codigo,
          nombre: h.nombre,
          marca: h.marca,
          categoria: h.categoria,
          qr: qrs.get(h.id) as string,
        }))}
      />
    </>
  )
}
