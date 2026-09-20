import { QrCode } from 'lucide-react'
import Link from 'next/link'
import { EstadoHerramienta } from '@prisma/client'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import {
  categorias,
  listarHerramientas,
  resumenHerramientas,
} from '@/server/herramientas/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { ListaHerramientas } from '@/components/herramientas/ListaHerramientas'
import { BotonFlotante, EncabezadoPantalla } from '@/components/ui'

export default async function PaginaHerramientas({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vencidas?: string; ubicacion?: string }>
}) {
  const sesion = await sesionConPermiso('herramientas.ver')
  if (!sesion) return <SinPermiso titulo="Herramientas" />

  const filtros = await searchParams

  const [herramientas, resumen, cats] = await Promise.all([
    listarHerramientas(),
    resumenHerramientas(),
    categorias(),
  ])

  const foco =
    filtros.vencidas === '1'
      ? 'vencidas'
      : filtros.estado === EstadoHerramienta.DISPONIBLE
        ? 'disponibles'
        : filtros.estado === EstadoHerramienta.EN_OBRA || filtros.ubicacion === 'obra'
          ? 'en-obra'
          : filtros.estado === EstadoHerramienta.EN_REPARACION
            ? 'reparacion'
            : 'todas'

  return (
    <div className="pb-24">
      <EncabezadoPantalla titulo="Herramientas" sinVolver />

      {/* Accesos del módulo: lo que el pañolero usa todos los días. */}
      <div className="scroll-lateral sin-barra flex gap-2 border-b border-niebla bg-blanco px-4 py-2.5">
        {[
          { href: '/herramientas/solicitudes', texto: 'Solicitudes' },
          { href: '/herramientas/ubicaciones', texto: 'Ubicaciones' },
          { href: '/herramientas/mantenimiento', texto: 'Mantenimiento' },
          { href: '/herramientas/etiquetas', texto: 'Etiquetas' },
          ...(puede(sesion, 'herramientas.crear')
            ? [{ href: '/herramientas/nueva', texto: 'Nueva herramienta' }]
            : []),
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex min-h-[36px] shrink-0 items-center rounded-full border border-niebla px-3 text-menor whitespace-nowrap text-grafito active:bg-hueso"
          >
            {a.texto}
          </Link>
        ))}
      </div>

      <ListaHerramientas
        herramientas={herramientas}
        resumen={resumen}
        categorias={cats}
        focoInicial={foco}
      />

      {puede(sesion, 'herramientas.crear') && (
        <BotonFlotante
          href="/herramientas/escanear"
          icono={<QrCode aria-hidden className="size-5" />}
          etiqueta="Escanear QR"
        >
          Escanear
        </BotonFlotante>
      )}
    </div>
  )
}
