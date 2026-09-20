import {
  BarChart3,
  Bell,
  Building2,
  Hammer,
  HardHat,
  Home,
  Layers,
  Menu,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Truck,
  User,
  Users,
  Warehouse,
  type LucideProps,
} from 'lucide-react'

/**
 * Los íconos de la navegación se eligen por nombre desde
 * `lib/navegacion.ts`, que es un archivo de datos y no puede importar
 * componentes. Este mapa los resuelve.
 */
const ICONOS = {
  BarChart3,
  Bell,
  Building2,
  Hammer,
  HardHat,
  Home,
  Layers,
  Menu,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Truck,
  User,
  Users,
  Warehouse,
} as const

export type NombreIcono = keyof typeof ICONOS

export function Icono({
  nombre,
  ...props
}: { nombre: string } & LucideProps) {
  const Componente = ICONOS[nombre as NombreIcono] ?? Hammer
  return <Componente aria-hidden {...props} />
}
