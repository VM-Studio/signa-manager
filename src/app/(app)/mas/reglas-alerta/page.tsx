import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarReglas } from '@/server/alertas/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelReglas } from '@/components/alertas/PanelReglas'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaReglasAlerta() {
  const sesion = await sesionConPermiso('configuracion.configurar')
  if (!sesion) return <SinPermiso titulo="Reglas de alerta" />

  const reglas = await listarReglas()

  return (
    <>
      <EncabezadoPantalla
        titulo="Reglas de alerta"
        subtitulo="Qué avisa el sistema y con cuánta anticipación"
        volverA="/mas"
      />
      <PanelReglas
        reglas={reglas.map((r) => ({
          id: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          descripcion: r.descripcion,
          modulo: r.modulo,
          severidad: r.severidad,
          umbral: r.umbral,
          activa: r.activa,
          rolesDestino: r.rolesDestino,
          canales: r.canales,
          alertasAbiertas: r._count.alertas,
        }))}
      />
    </>
  )
}
