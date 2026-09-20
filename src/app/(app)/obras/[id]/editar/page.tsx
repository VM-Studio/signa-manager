import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import {
  jefesDeObraDisponibles,
  obtenerObra,
  unidadesActivas,
} from '@/server/obras/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { FormularioObra } from '@/components/obras/FormularioObra'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaEditarObra({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('obras.editar')
  if (!sesion) return <SinPermiso titulo="Editar obra" />

  const { id } = await params
  const obra = await obtenerObra(sesion, id)
  if (!obra) notFound()

  const [unidades, jefes] = await Promise.all([
    unidadesActivas(),
    jefesDeObraDisponibles(),
  ])

  return (
    <>
      <EncabezadoPantalla
        titulo="Editar obra"
        subtitulo={obra.codigo}
        volverA={`/obras/${obra.id}`}
      />
      <FormularioObra
        unidades={unidades}
        jefes={jefes}
        valores={{
          id: obra.id,
          codigo: obra.codigo,
          nombre: obra.nombre,
          tipo: obra.tipo,
          estado: obra.estado,
          cliente: obra.cliente,
          unidadNegocioId: obra.unidadNegocioId,
          jefeObraId: obra.jefeObraId,
          direccion: obra.direccion,
          localidad: obra.localidad,
          provincia: obra.provincia,
          esInterior: obra.esInterior,
          presupuestoTotal: obra.presupuestoTotal
            ? Number(obra.presupuestoTotal)
            : null,
          presupuestoManoObra: obra.presupuestoManoObra
            ? Number(obra.presupuestoManoObra)
            : null,
          fechaInicio: obra.fechaInicio,
          fechaFinPrevista: obra.fechaFinPrevista,
          fechaFinReal: obra.fechaFinReal,
          origen: obra.origen,
        }}
      />
    </>
  )
}
