import { sesionConPermiso } from '@/lib/auth/pantalla'
import { db } from '@/lib/db'
import { fuenteConfigurada, NOMBRE_FUENTE } from '@/lib/integracion'
import { SinPermiso } from '@/components/app/SinPermiso'
import { PanelSincronizacion } from '@/components/configuracion/PanelSincronizacion'
import { EncabezadoPantalla } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function PaginaSincronizacion() {
  const sesion = await sesionConPermiso('configuracion.ver')
  if (!sesion) return <SinPermiso titulo="Sincronización" />

  const historial = await db.registroSync.findMany({
    orderBy: { inicio: 'desc' },
    take: 20,
  })

  const ultimo = historial[0] ?? null
  const horasDesdeLaUltima = ultimo
    ? (Date.now() - ultimo.inicio.getTime()) / 3_600_000
    : null

  let fuente = 'mock'
  let nombreFuente = 'Datos de ejemplo'
  try {
    fuente = fuenteConfigurada()
    nombreFuente = NOMBRE_FUENTE[fuente as keyof typeof NOMBRE_FUENTE]
  } catch (error) {
    nombreFuente =
      error instanceof Error ? error.message : 'Sistema base mal configurado'
  }

  return (
    <>
      <EncabezadoPantalla titulo="Sincronización" volverA="/mas" />
      <PanelSincronizacion
        fuente={fuente}
        nombreFuente={nombreFuente}
        ultimo={ultimo}
        historial={historial}
        puedeSincronizar
        horasDesdeLaUltima={horasDesdeLaUltima}
      />
    </>
  )
}
