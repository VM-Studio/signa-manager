import { notFound, redirect } from 'next/navigation'
import { EstadoParte } from '@prisma/client'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { obrasDeLaSesion } from '@/lib/auth/obras'
import { armarParte, empleadosParaAgregar } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import { CargarParte } from '@/components/personal/CargarParte'
import { EncabezadoPantalla } from '@/components/ui'

export default async function PaginaCargarParte({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string; fecha?: string }>
}) {
  const sesion = await sesionConPermiso('personal.crear')
  if (!sesion) return <SinPermiso titulo="Parte diario" />

  const { obra: obraId, fecha: fechaTexto } = await searchParams

  // Sin obra en la URL: se elige la primera que le corresponda.
  if (!obraId) {
    const ids = await obrasDeLaSesion(sesion)
    if (ids !== null && ids.length > 0) {
      redirect(`/personal/partes/nuevo?obra=${ids[0]}`)
    }
    redirect('/personal/partes')
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = fechaTexto ? new Date(`${fechaTexto}T00:00:00`) : hoy
  if (Number.isNaN(fecha.getTime())) notFound()

  const ids = await obrasDeLaSesion(sesion)
  if (ids !== null && !ids.includes(obraId)) {
    return <SinPermiso titulo="Parte diario" mensaje="Esa obra no está entre las tuyas." />
  }

  const [parte, paraAgregar] = await Promise.all([
    armarParte(obraId, fecha),
    empleadosParaAgregar(obraId, fecha),
  ])
  if (!parte) notFound()

  const comoTexto = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

  // Un parte aprobado es de solo lectura, salvo para quien puede aprobar.
  const soloLectura =
    parte.estado === EstadoParte.APROBADO ||
    (parte.estado === EstadoParte.ENVIADO && !puede(sesion, 'personal.aprobar'))

  return (
    <>
      <EncabezadoPantalla
        titulo="Parte diario"
        subtitulo={parte.obra.codigo}
        volverA="/personal/partes"
      />
      <CargarParte
        obra={parte.obra}
        fecha={comoTexto}
        estadoInicial={parte.estado}
        climaInicial={parte.clima}
        tareasIniciales={parte.tareasDelDia}
        observacionesIniciales={parte.observaciones}
        personasIniciales={parte.personas}
        subcontratistasIniciales={parte.subcontratistasDelDia}
        subcontratistasDisponibles={parte.subcontratistasDisponibles}
        empleadosParaAgregar={paraAgregar}
        soloLectura={soloLectura}
      />
    </>
  )
}
