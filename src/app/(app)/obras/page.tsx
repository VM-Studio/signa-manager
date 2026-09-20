import { Plus } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import {
  contarPorEstado,
  listarObras,
  unidadesActivas,
} from '@/server/obras/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { ListaObras } from '@/components/obras/ListaObras'
import { BotonFlotante, EncabezadoPantalla } from '@/components/ui'

export default async function PaginaObras() {
  const sesion = await sesionConPermiso('obras.ver')
  if (!sesion) return <SinPermiso titulo="Obras" />

  const [obras, unidades, conteo] = await Promise.all([
    listarObras(sesion),
    unidadesActivas(),
    contarPorEstado(sesion),
  ])

  const puedeCrear = puede(sesion, 'obras.crear')

  return (
    <div className="pb-24">
      <EncabezadoPantalla titulo="Obras" sinVolver />

      <ListaObras obras={obras} unidades={unidades} conteoPorEstado={conteo} />

      {puedeCrear && (
        <BotonFlotante
          href="/obras/nueva"
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Nueva obra"
        >
          Nueva obra
        </BotonFlotante>
      )}
    </div>
  )
}
