import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { obtenerEmpleado } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioEmpleado } from '@/components/personal/FormularioEmpleado'
import { EncabezadoPantalla } from '@/components/ui'
import { nombreNatural } from '@/lib/formato'

export default async function PaginaEditarEmpleado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('personal.editar')
  if (!sesion) return <SinPermiso titulo="Editar empleado" />

  const { id } = await params
  const e = await obtenerEmpleado(id)
  if (!e) notFound()

  return (
    <>
      <EncabezadoPantalla
        titulo="Editar ficha"
        subtitulo={nombreNatural(e)}
        volverA={`/personal/empleados/${e.id}`}
      />
      <FormularioEmpleado
        valores={{
          id: e.id,
          legajo: e.legajo,
          nombre: e.nombre,
          apellido: e.apellido,
          dni: e.dni,
          cuil: e.cuil,
          telefono: e.telefono,
          direccion: e.direccion,
          localidad: e.localidad,
          fechaIngreso: e.fechaIngreso,
          categoria: e.categoria,
          especialidad: e.especialidad,
          valorHora: Number(e.valorHora),
          talleRopa: e.talleRopa,
          talleCalzado: e.talleCalzado,
          contactoEmergenciaNombre: e.contactoEmergenciaNombre,
          contactoEmergenciaTelefono: e.contactoEmergenciaTelefono,
          notas: e.notas,
        }}
      />
    </>
  )
}
