import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { listarAlertas } from '@/server/alertas/queries'
import { obrasDeLaSesion } from '@/lib/auth/obras'
import { db } from '@/lib/db'
import { SinPermiso } from '@/components/app/SinPermiso'
import { BandejaAlertas } from '@/components/alertas/BandejaAlertas'
import { EncabezadoPantalla } from '@/components/ui'
import { plural } from '@/lib/formato'

export const dynamic = 'force-dynamic'

export default async function PaginaAlertas() {
  const sesion = await sesionConPermiso('alertas.ver')
  if (!sesion) return <SinPermiso titulo="Alertas" />

  const ids = await obrasDeLaSesion(sesion)

  const [alertas, historial, obras] = await Promise.all([
    listarAlertas(sesion),
    listarAlertas(sesion, { historial: true }),
    db.obra.findMany({
      where: {
        ...(ids === null ? {} : { id: { in: ids } }),
        estado: { in: ['EN_CURSO', 'PAUSADA'] },
      },
      select: { id: true, codigo: true },
      orderBy: { codigo: 'desc' },
    }),
  ])

  const criticas = alertas.filter((a) => a.severidad === 'CRITICA').length

  return (
    <>
      <EncabezadoPantalla
        titulo="Alertas"
        subtitulo={
          alertas.length === 0
            ? 'Todo en orden'
            : `${plural(alertas.length, 'abierta')}${criticas > 0 ? ` · ${criticas} crítica${criticas === 1 ? '' : 's'}` : ''}`
        }
        sinVolver
      />
      <BandejaAlertas
        alertas={alertas}
        historial={historial}
        obras={obras}
        puedeDescartar={puede(sesion, 'alertas.editar')}
      />
    </>
  )
}
