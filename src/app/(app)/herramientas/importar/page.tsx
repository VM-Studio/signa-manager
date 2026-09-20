import { sesionConPermiso } from '@/lib/auth/pantalla'
import { categorias, depositosActivos } from '@/server/herramientas/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { AltaMasiva } from '@/components/herramientas/AltaMasiva'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaImportar() {
  const sesion = await sesionConPermiso('herramientas.crear')
  if (!sesion) return <SinPermiso titulo="Carga masiva" />

  const [cats, depositos] = await Promise.all([categorias(), depositosActivos()])

  return (
    <>
      <EncabezadoPantalla
        titulo="Cargar desde un archivo"
        subtitulo="Para cargar muchas herramientas de una"
        volverA="/herramientas/nueva"
      />
      <AltaMasiva
        depositos={depositos}
        categorias={cats.map((c) => c.nombre)}
      />
    </>
  )
}
