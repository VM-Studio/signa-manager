import Link from 'next/link'
import { Upload } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import {
  categorias,
  depositosActivos,
  siguienteCodigo,
} from '@/server/herramientas/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioHerramienta } from '@/components/herramientas/FormularioHerramienta'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaNuevaHerramienta() {
  const sesion = await sesionConPermiso('herramientas.crear')
  if (!sesion) return <SinPermiso titulo="Nueva herramienta" />

  const [cats, depositos, codigo] = await Promise.all([
    categorias(),
    depositosActivos(),
    siguienteCodigo(),
  ])

  return (
    <>
      <EncabezadoPantalla
        titulo="Nueva herramienta"
        volverA="/herramientas"
        accion={
          <Link
            href="/herramientas/importar"
            aria-label="Cargar varias desde un archivo"
            className="flex size-11 items-center justify-center rounded-[var(--radius-control)] text-grafito active:bg-hueso"
          >
            <Upload aria-hidden className="size-4" />
          </Link>
        }
      />
      <FormularioHerramienta
        categorias={cats}
        depositos={depositos}
        codigoSugerido={codigo}
      />
    </>
  )
}
