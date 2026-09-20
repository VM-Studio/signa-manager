import { CategoriaLaboral } from '@prisma/client'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarEmpleados } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { ListaEmpleados } from '@/components/personal/ListaEmpleados'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaEmpleados({
  searchParams,
}: {
  searchParams: Promise<{ documentacion?: string; obra?: string }>
}) {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Empleados" />

  const filtros = await searchParams
  const empleados = await listarEmpleados({
    documentacion: filtros.documentacion === 'vencida' ? 'vencida' : undefined,
    obraId: filtros.obra,
  })

  const categorias = [
    ...new Set(empleados.map((e) => e.categoria)),
  ] as CategoriaLaboral[]

  return (
    <div className="pb-8">
      <EncabezadoPantalla titulo="Empleados" volverA="/personal" />
      <ListaEmpleados empleados={empleados} categorias={categorias} />
    </div>
  )
}
