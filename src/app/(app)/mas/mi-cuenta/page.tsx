import { exigirSesion } from '@/lib/auth/sesion'
import { NOMBRE_ROL } from '@/lib/auth/permisos'
import { db } from '@/lib/db'
import {
  Dato,
  EncabezadoPantalla,
  ListaDatos,
  TituloSeccion,
} from '@/components/ui'
import { BotonCerrarSesion } from '@/components/app/BotonCerrarSesion'
import { fechaYHora, nombreNatural } from '@/lib/formato'

export default async function PaginaMiCuenta() {
  const sesion = await exigirSesion()

  const usuario = await db.usuario.findUnique({
    where: { id: sesion.usuarioId },
    select: {
      nombre: true,
      email: true,
      telefono: true,
      rol: true,
      ultimoAcceso: true,
      creadoEn: true,
      empleado: {
        select: { legajo: true, nombre: true, apellido: true, categoria: true },
      },
    },
  })

  if (!usuario) return null

  return (
    <div className="pb-8">
      <EncabezadoPantalla titulo="Mi cuenta" volverA="/mas" />

      <TituloSeccion>Tus datos</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="Nombre">{usuario.nombre}</Dato>
          <Dato etiqueta="Email">{usuario.email}</Dato>
          <Dato etiqueta="Teléfono">{usuario.telefono ?? '—'}</Dato>
          <Dato etiqueta="Rol">{NOMBRE_ROL[usuario.rol]}</Dato>
          <Dato etiqueta="Último acceso">{fechaYHora(usuario.ultimoAcceso)}</Dato>
        </ListaDatos>
      </div>

      {usuario.empleado && (
        <>
          <TituloSeccion>Tu legajo</TituloSeccion>
          <div className="border-y border-niebla bg-blanco">
            <ListaDatos>
              <Dato etiqueta="Legajo">{usuario.empleado.legajo}</Dato>
              <Dato etiqueta="Nombre">{nombreNatural(usuario.empleado)}</Dato>
              <Dato etiqueta="Categoría">
                {usuario.empleado.categoria.replace(/_/g, ' ').toLowerCase()}
              </Dato>
            </ListaDatos>
          </div>
        </>
      )}

      <p className="px-4 pt-6 text-chico text-grafito">
        Para cambiar tu contraseña o tus datos, pedíselo a administración.
      </p>

      <div className="px-4 pt-4">
        <BotonCerrarSesion />
      </div>
    </div>
  )
}
