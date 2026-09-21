import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarAccesos } from '@/server/nucleo/accesos-queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelAccesos } from '@/components/configuracion/PanelAccesos'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaAccesos() {
  /*
   * configuracion.configurar es el permiso más alto: hoy solo lo tiene
   * el dueño. Administración puede crear usuarios y asignarles un rol,
   * pero no reescribir qué ve cada uno.
   */
  const sesion = await sesionConPermiso('configuracion.configurar')
  if (!sesion) return <SinPermiso titulo="Accesos" />

  const usuarios = await listarAccesos()

  return (
    <>
      <EncabezadoPantalla
        titulo="Accesos"
        subtitulo="Qué módulo ve cada persona"
        volverA="/tablero"
      />
      <PanelAccesos usuarios={usuarios} usuarioActual={sesion.usuarioId} />
    </>
  )
}
