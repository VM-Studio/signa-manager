import { CategoriaLaboral } from '@prisma/client'
import { UserPlus } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { listarEmpleados } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { ListaEmpleados } from '@/components/personal/ListaEmpleados'
import { BotonFlotante, EncabezadoPantalla } from '@/components/ui'

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
      {puede(sesion, 'personal.crear') && (
        <BotonFlotante
          href="/personal/empleados/nuevo"
          icono={<UserPlus aria-hidden className="size-5" />}
          etiqueta="Nuevo empleado"
        />
      )}
    </div>
  )
}
