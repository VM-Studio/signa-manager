import { redirect } from 'next/navigation'
import { EstadoAlerta, Severidad } from '@prisma/client'
import { obtenerSesion } from '@/lib/auth/sesion'
import { puede } from '@/lib/auth/permisos'
import { BARRA_INFERIOR } from '@/lib/navegacion'
import { db } from '@/lib/db'
import { Header } from '@/components/app/Header'
import { BarraInferior } from '@/components/app/BarraInferior'
import { Splash } from '@/components/app/Splash'
import { FranjaDemo } from '@/components/app/FranjaDemo'
import { ProveedorAvisos } from '@/components/ui'

/* =====================================================================
   Estructura de la app: header negro arriba, barra inferior negra abajo
   y el contenido en el medio sobre fondo claro.
   ===================================================================== */

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode
}) {
  const sesion = await obtenerSesion()
  // El middleware ya redirige, pero una Server Action puede llegar acá
  // con la cookie recién borrada.
  if (!sesion) redirect('/login')

  const puedeVerAlertas = puede(sesion, 'alertas.ver')

  const [alertasAbiertas, criticas] = puedeVerAlertas
    ? await Promise.all([
        db.alerta.count({
          where: { estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] } },
        }),
        db.alerta.count({
          where: {
            estado: { in: [EstadoAlerta.ABIERTA, EstadoAlerta.VISTA] },
            severidad: Severidad.CRITICA,
          },
        }),
      ])
    : [0, 0]

  const items = BARRA_INFERIOR.filter(
    (i) => !i.permiso || puede(sesion, i.permiso),
  )

  const esDemo = process.env.MODO_DEMO === 'true'

  return (
    <Splash>
      <ProveedorAvisos>
        <div className="min-h-dvh bg-hueso">
          <Header
            alertasAbiertas={alertasAbiertas}
            hayCriticas={criticas > 0}
            puedeVerAlertas={puedeVerAlertas}
          />
          {esDemo && <FranjaDemo />}

          {/* El padding de arriba deja lugar al header fijo y al área
              segura del teléfono; el de abajo, a la barra inferior.

              El ancho lo maneja cada pantalla: las operativas se centran
              en 480px (regla de CLAUDE.md) y el tablero se ensancha hasta
              1100px con su propio contenedor. */}
          <div
            className="mx-auto max-w-[var(--ancho-operativo)] pb-[calc(var(--alto-barra-inferior)+env(safe-area-inset-bottom,0px))] has-[[data-ancho='tablero']]:max-w-[var(--ancho-tablero)]"
            style={{
              paddingTop: `calc(var(--alto-header) + env(safe-area-inset-top, 0px)${esDemo ? ' + 26px' : ''})`,
            }}
          >
            {children}
          </div>

          <BarraInferior items={items} />
        </div>
      </ProveedorAvisos>
    </Splash>
  )
}
