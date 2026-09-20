import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import {
  comprasDeObra,
  herramientasDeObra,
  obtenerObra,
  personalDeObra,
  resumenDeObra,
  vehiculosDeObra,
} from '@/server/obras/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { EncabezadoPantalla } from '@/components/ui'
import { FichaObra } from '@/components/obras/FichaObra'

type Pestana = 'resumen' | 'personal' | 'herramientas' | 'vehiculos' | 'compras'

export default async function PaginaObra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pestana?: string }>
}) {
  const sesion = await sesionConPermiso('obras.ver')
  if (!sesion) return <SinPermiso titulo="Obra" />

  const { id } = await params
  const { pestana } = await searchParams

  const obra = await obtenerObra(sesion, id)
  if (!obra) notFound()

  const activa: Pestana = (
    ['resumen', 'personal', 'herramientas', 'vehiculos', 'compras'] as const
  ).includes(pestana as Pestana)
    ? (pestana as Pestana)
    : 'resumen'

  // Solo se consulta la pestaña que se está mirando: la ficha de una obra
  // con 45 días de partes y 500 movimientos no tiene por qué traer todo.
  const [resumen, personal, herramientas, vehiculos, compras] = await Promise.all([
    resumenDeObra(obra.id),
    activa === 'personal' ? personalDeObra(obra.id) : null,
    activa === 'herramientas' ? herramientasDeObra(obra.id) : null,
    activa === 'vehiculos' ? vehiculosDeObra(obra.id) : null,
    activa === 'compras' ? comprasDeObra(obra.id) : null,
  ])

  const puedeEditar = puede(sesion, 'obras.editar')

  return (
    <div className="pb-8">
      <EncabezadoPantalla
        titulo={obra.nombre}
        subtitulo={obra.codigo}
        volverA="/obras"
        accion={
          puedeEditar ? (
            <Link
              href={`/obras/${obra.id}/editar`}
              aria-label="Editar obra"
              className="flex size-11 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
            >
              <Pencil aria-hidden className="size-4" />
            </Link>
          ) : undefined
        }
      />

      <FichaObra
        obra={{
          ...obra,
          presupuestoManoObra: obra.presupuestoManoObra
            ? Number(obra.presupuestoManoObra)
            : null,
          presupuestoTotal: obra.presupuestoTotal
            ? Number(obra.presupuestoTotal)
            : null,
        }}
        activa={activa}
        resumen={resumen}
        personal={personal}
        herramientas={herramientas}
        vehiculos={vehiculos}
        compras={compras}
      />
    </div>
  )
}
