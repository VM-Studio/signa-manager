import Link from 'next/link'
import { exigirSesion } from '@/lib/auth/sesion'
import { puede, NOMBRE_ROL } from '@/lib/auth/permisos'
import { SECCIONES_MAS } from '@/lib/navegacion'
import { Icono } from '@/components/app/Icono'
import { BotonCerrarSesion } from '@/components/app/BotonCerrarSesion'
import { TituloSeccion } from '@/components/ui'

export default async function PaginaMas() {
  const sesion = await exigirSesion()

  const secciones = SECCIONES_MAS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.permiso || puede(sesion, i.permiso)),
  })).filter((s) => s.items.length > 0)

  return (
    <div className="pb-8">
      {/* Quién está adentro: en obra se comparten teléfonos y conviene
          que se vea de entrada con qué usuario se entró. */}
      <div className="flex items-center gap-3 border-b border-niebla bg-blanco px-4 py-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-negro text-base font-medium text-blanco">
          {sesion.nombre.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-negro">
            {sesion.nombre}
          </p>
          <p className="truncate text-menor text-grafito">
            {NOMBRE_ROL[sesion.rol]} · {sesion.email}
          </p>
        </div>
      </div>

      {secciones.map((seccion) => (
        <section key={seccion.titulo}>
          <TituloSeccion>{seccion.titulo}</TituloSeccion>
          <div className="divide-y divide-niebla border-y border-niebla bg-blanco">
            {seccion.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[var(--toque-minimo)] items-center gap-3 px-4 py-3 active:bg-hueso"
              >
                <Icono
                  nombre={item.icono}
                  className="size-5 shrink-0 text-grafito"
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-negro">
                    {item.texto}
                  </span>
                  {item.descripcion && (
                    <span className="block truncate text-menor text-metadato">
                      {item.descripcion}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="px-4 pt-8">
        <BotonCerrarSesion />
      </div>

      <p className="px-4 pt-6 text-center text-micro text-metadato">
        Signa · sistema interno
      </p>
    </div>
  )
}
