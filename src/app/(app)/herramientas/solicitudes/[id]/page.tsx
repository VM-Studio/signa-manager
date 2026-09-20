import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import {
  candidatasParaSolicitud,
  empleadosActivos,
  obtenerSolicitud,
} from '@/server/herramientas/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  DetalleSolicitud,
  type Candidata,
} from '@/components/herramientas/DetalleSolicitud'
import { EncabezadoPantalla } from '@/components/ui'
import { plural } from '@/lib/formato'

export default async function PaginaSolicitud({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('herramientas.ver')
  if (!sesion) return <SinPermiso titulo="Solicitud" />

  const { id } = await params
  const solicitud = await obtenerSolicitud(id)
  if (!solicitud) notFound()

  const puedeResolver = puede(sesion, 'herramientas.aprobar')
  const estaPendiente = solicitud.estado === 'PENDIENTE'

  const [propuestas, empleados] = await Promise.all([
    estaPendiente && puedeResolver
      ? candidatasParaSolicitud(solicitud.categoriaId, solicitud.obraId)
      : Promise.resolve(null),
    empleadosActivos(),
  ])

  const candidatas: Candidata[] = []

  if (propuestas) {
    for (const h of propuestas.enDeposito) {
      candidatas.push({
        id: h.id,
        codigo: h.codigo,
        nombre: h.nombre,
        marca: h.marca,
        condicion: h.condicion,
        valorCompra: Number(h.valorCompra ?? 0),
        donde: h.deposito?.nombre ?? 'En depósito',
        motivo: 'Libre',
        tono: 'correcto',
      })
    }

    for (const h of propuestas.enObrasInactivas) {
      candidatas.push({
        id: h.id,
        codigo: h.codigo,
        nombre: h.nombre,
        marca: h.marca,
        condicion: h.condicion,
        valorCompra: Number(h.valorCompra ?? 0),
        donde: h.obra ? `${h.obra.codigo} · ${h.obra.nombre}` : 'En obra',
        motivo: h.obra?.estado === 'FINALIZADA' ? 'Obra terminada' : 'Obra pausada',
        tono: 'aviso',
      })
    }

    for (const h of propuestas.sinMovimiento) {
      candidatas.push({
        id: h.id,
        codigo: h.codigo,
        nombre: h.nombre,
        marca: h.marca,
        condicion: h.condicion,
        valorCompra: Number(h.valorCompra ?? 0),
        donde: h.obra ? `${h.obra.codigo} · ${h.obra.nombre}` : 'En obra',
        motivo: 'Sin uso hace 45 días',
        tono: 'aviso',
      })
    }
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Solicitud"
        subtitulo={`${solicitud.obra.codigo} · ${plural(solicitud.cantidad, 'unidad', 'unidades')}`}
        volverA="/herramientas/solicitudes"
      />
      <DetalleSolicitud
        puedeResolver={puedeResolver}
        candidatas={candidatas}
        empleados={empleados}
        solicitud={{
          id: solicitud.id,
          descripcion: solicitud.descripcion,
          cantidad: solicitud.cantidad,
          fechaNecesaria: solicitud.fechaNecesaria,
          prioridad: solicitud.prioridad,
          estado: solicitud.estado,
          obra: solicitud.obra.codigo,
          obraNombre: solicitud.obra.nombre,
          categoria: solicitud.categoria?.nombre ?? null,
          solicitante: solicitud.solicitante.nombre,
          creadaEn: solicitud.creadaEn,
          resolucionNota: solicitud.resolucionNota,
          resueltaPor: solicitud.resueltaPor?.nombre ?? null,
          resueltaEn: solicitud.resueltaEn,
          entregadas: solicitud.movimientos.map((m) => m.herramienta),
        }}
      />
    </>
  )
}
