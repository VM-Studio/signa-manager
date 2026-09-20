import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { db } from '@/lib/db'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelUsuarios } from '@/components/configuracion/PanelUsuarios'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaUsuarios() {
  const sesion = await sesionConPermiso('configuracion.ver')
  if (!sesion) return <SinPermiso titulo="Usuarios" />

  const [usuarios, empleados] = await Promise.all([
    db.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        activo: true,
        ultimoAcceso: true,
        empleadoId: true,
        empleado: { select: { legajo: true, nombre: true, apellido: true } },
      },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    }),
    db.empleado.findMany({
      where: { activo: true },
      select: { id: true, legajo: true, nombre: true, apellido: true },
      orderBy: { apellido: 'asc' },
    }),
  ])

  return (
    <>
      <EncabezadoPantalla titulo="Usuarios" volverA="/mas" />
      <PanelUsuarios
        miUsuarioId={sesion.usuarioId}
        puedeEditar={puede(sesion, 'configuracion.editar')}
        usuarios={usuarios.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          telefono: u.telefono,
          activo: u.activo,
          ultimoAcceso: u.ultimoAcceso,
          empleadoId: u.empleadoId,
          empleado: u.empleado?.legajo ?? null,
        }))}
        empleados={empleados.map((e) => ({
          id: e.id,
          legajo: e.legajo,
          nombre: `${e.apellido}, ${e.nombre}`,
        }))}
      />
    </>
  )
}
