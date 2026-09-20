import Link from 'next/link'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarVehiculos, resumenFlota } from '@/server/vehiculos/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { ListaFlota } from '@/components/vehiculos/ListaFlota'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaVehiculos({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vencimientos?: string }>
}) {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Vehículos" />

  const filtros = await searchParams
  const [vehiculos, resumen] = await Promise.all([
    listarVehiculos(),
    resumenFlota(),
  ])

  const foco =
    filtros.vencimientos === '1'
      ? 'vencidos'
      : filtros.estado === 'DISPONIBLE'
        ? 'disponibles'
        : filtros.estado === 'EN_VIAJE'
          ? 'viaje'
          : filtros.estado === 'EN_TALLER'
            ? 'taller'
            : 'todos'

  const accesos = [
    { href: '/vehiculos/ahora', texto: 'En este momento' },
    { href: '/vehiculos/agenda', texto: 'Agenda' },
    { href: '/vehiculos/solicitudes', texto: 'Solicitudes' },
    { href: '/vehiculos/vencimientos', texto: 'Vencimientos' },
    ...(sesion.empleadoId
      ? [{ href: '/vehiculos/mis-viajes', texto: 'Mis viajes' }]
      : []),
  ]

  return (
    <div className="pb-8">
      <EncabezadoPantalla titulo="Vehículos" sinVolver />

      <div className="scroll-lateral sin-barra flex gap-2 border-b border-niebla bg-blanco px-4 py-2.5">
        {accesos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex min-h-[36px] shrink-0 items-center rounded-full border border-niebla px-3 text-menor whitespace-nowrap text-grafito active:bg-hueso"
          >
            {a.texto}
          </Link>
        ))}
      </div>

      <ListaFlota vehiculos={vehiculos} resumen={resumen} focoInicial={foco} />
    </div>
  )
}
