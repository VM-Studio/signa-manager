import { redirect } from 'next/navigation'
import { obtenerSesion } from '@/lib/auth/sesion'
import { NOMBRE_ROL, permisosDe, puede } from '@/lib/auth/permisos'
import { BARRA_INFERIOR } from '@/lib/navegacion'
import { contadorAlertas } from '@/server/alertas/queries'
import { Header } from '@/components/app/Header'
import { BarraInferior } from '@/components/app/BarraInferior'
import { BarraLateral } from '@/components/app/BarraLateral'
import { BarraSuperior } from '@/components/app/BarraSuperior'
import { ProveedorEncabezado } from '@/components/app/ProveedorEncabezado'
import { NAVEGACION_LATERAL } from '@/components/app/navegacion-lateral'
import { BotonCerrarSesion } from '@/components/app/BotonCerrarSesion'
import { Splash } from '@/components/app/Splash'
import { FranjaDemo } from '@/components/app/FranjaDemo'
import { AvisoInstalar } from '@/components/app/AvisoInstalar'
import { ColaDePartes } from '@/components/personal/ColaDePartes'
import { ProveedorAvisos } from '@/components/ui'

/* =====================================================================
   Estructura de la app.

   Celular y tablet: header negro arriba, barra inferior negra abajo y
   el contenido en el medio sobre fondo claro.

   Escritorio (≥1024px): barra lateral negra de alto completo a la
   izquierda y, dentro del área de contenido, una barra superior clara
   con el título, la miga de pan, las acciones de la pantalla y la
   campana. El contenido usa todo el ancho disponible.

   Es el mismo árbol para los dos: lo que cambia es qué se muestra en
   cada breakpoint.
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

  /*
   * El contador de la campana sale de la MISMA consulta que la bandeja.
   *
   * Antes contaba todas las alertas de la empresa sin filtrar por nada:
   * el chofer veía 52 en la campana y al entrar se encontraba con tres.
   * Ahora el número y la lista son lo mismo, y respeta los accesos: si a
   * alguien se le cerró un módulo, sus alertas no le suman.
   */
  const { abiertas: alertasAbiertas, criticas } = puedeVerAlertas
    ? await contadorAlertas(sesion)
    : { abiertas: 0, criticas: 0 }

  const items = BARRA_INFERIOR.filter(
    (i) => !i.permiso || puede(sesion, i.permiso),
  )

  // La barra lateral respeta los mismos permisos que la de abajo.
  const grupos = NAVEGACION_LATERAL.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permiso || puede(sesion, i.permiso)),
  })).filter((g) => g.items.length > 0)

  const esDemo = process.env.MODO_DEMO === 'true'

  return (
    <Splash>
      <ProveedorAvisos>
        <ProveedorEncabezado>
          <div
            className="min-h-dvh bg-hueso"
            style={
              { '--alto-franja': esDemo ? '28px' : '0px' } as React.CSSProperties
            }
          >
            {/* --- navegación de celular y tablet --- */}
            <Header
              alertasAbiertas={alertasAbiertas}
              hayCriticas={criticas > 0}
              puedeVerAlertas={puedeVerAlertas}
            />

            {/* --- navegación de escritorio --- */}
            <BarraLateral
              grupos={grupos}
              usuario={{ nombre: sesion.nombre, rol: NOMBRE_ROL[sesion.rol] }}
              alertasAbiertas={alertasAbiertas}
              hayCriticas={criticas > 0}
              cerrarSesion={<BotonCerrarSesion compacto />}
            />

            {/* Partes cargados sin señal: se envían solos al volver. */}
            <ColaDePartes />

            {/*
              El margen izquierdo deja lugar a la barra lateral fija.
              Usa la misma variable que ella, así que se mueven juntos
              tanto al cambiar de ancho como al contraerla a mano.
            */}
            {/*
              En celular hay que correrse por el header fijo y por el área
              segura. En escritorio no hay header: el contenido arranca
              arriba de todo.
            */}
            <div
              className="lg:hidden"
              style={{
                height: 'calc(var(--alto-header) + env(safe-area-inset-top, 0px))',
              }}
            />

            {/*
              La franja va a lo ancho de toda la pantalla, por encima de
              la barra lateral: si quedara solo sobre el contenido, el
              logo de la barra dejaría de alinearse con la barra superior.
              En celular cae justo debajo del header, por el espaciador
              de arriba.
            */}
            {esDemo && <FranjaDemo />}

            <div className="ml-[var(--ancho-lateral-actual)] transition-[margin] duration-150">
              <BarraSuperior
                alertasAbiertas={alertasAbiertas}
                hayCriticas={criticas > 0}
                puedeVerAlertas={puedeVerAlertas}
                permisos={permisosDe(sesion.rol)}
              />

              {/*
                El ancho lo maneja `contenido-app`: todo el disponible
                hasta 1680px, y ahí se centra. Abajo, lugar para la barra
                inferior del celular y para el área segura.
              */}
              <div className="contenido-app pb-[calc(var(--alto-barra-inferior)+var(--alto-aviso-instalar,0px)+env(safe-area-inset-bottom,0px))] lg:pb-10">
                {children}
              </div>
            </div>

            <BarraInferior items={items} />
            <AvisoInstalar />
          </div>
        </ProveedorEncabezado>
      </ProveedorAvisos>
    </Splash>
  )
}
