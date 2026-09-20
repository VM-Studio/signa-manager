import { Plus, Truck } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { listarSolicitudesViaje } from '@/server/vehiculos/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  BotonFlotante,
  EncabezadoPantalla,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
} from '@/components/ui'
import { fechaYHora, peso, plural, textoEnum } from '@/lib/formato'

export default async function PaginaSolicitudesViaje() {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Solicitudes de viaje" />

  const solicitudes = await listarSolicitudesViaje(sesion)
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE')
  const resueltas = solicitudes.filter((s) => s.estado !== 'PENDIENTE')
  const puedeAsignar = puede(sesion, 'vehiculos.aprobar')

  const fila = (s: (typeof solicitudes)[number]) => {
    const urgente = s.prioridad === 'URGENTE' && s.estado === 'PENDIENTE'
    const alta = s.prioridad === 'ALTA' && s.estado === 'PENDIENTE'

    return (
      <FilaLista
        key={s.id}
        titulo={s.destino}
        subtitulo={`${s.obra.codigo} · desde ${s.origen}`}
        detalle={
          [
            fechaYHora(s.fechaHoraNecesaria),
            s.pesoEstimadoKg ? peso(s.pesoEstimadoKg) : null,
            s.cantidadPersonas ? plural(s.cantidadPersonas, 'persona') : null,
            `pidió ${s.solicitante.nombre}`,
          ]
            .filter(Boolean)
            .join(' · ')
        }
        tono={urgente ? 'critico' : alta ? 'aviso' : 'neutro'}
        debajoDerecha={
          <div className="flex flex-col items-end gap-1">
            <Insignia
              tono={
                s.estado === 'PENDIENTE'
                  ? 'aviso'
                  : s.estado === 'ASIGNADA'
                    ? 'correcto'
                    : 'neutro'
              }
            >
              {textoEnum(s.estado)}
            </Insignia>
            {(urgente || alta) && (
              <Insignia tono={urgente ? 'critico' : 'aviso'}>
                {textoEnum(s.prioridad)}
              </Insignia>
            )}
          </div>
        }
        href={
          s.estado === 'PENDIENTE' && puedeAsignar
            ? `/vehiculos/solicitudes/${s.id}`
            : s.viaje
              ? `/vehiculos/viajes/${s.viaje.id}`
              : `/vehiculos/solicitudes/${s.id}`
        }
      />
    )
  }

  return (
    <div className="pb-24">
      <EncabezadoPantalla titulo="Solicitudes de viaje" volverA="/vehiculos" />

      <TituloSeccion>
        {pendientes.length === 0
          ? 'Nada pendiente'
          : plural(pendientes.length, 'solicitud sin asignar', 'solicitudes sin asignar')}
      </TituloSeccion>

      {pendientes.length === 0 ? (
        <EstadoVacio
          titulo="No hay solicitudes pendientes"
          mensaje="Cuando una obra pida un viaje, aparece acá."
          icono={<Truck className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>{pendientes.map(fila)}</Lista>
      )}

      {resueltas.length > 0 && (
        <>
          <TituloSeccion>Resueltas</TituloSeccion>
          <Lista>{resueltas.slice(0, 20).map(fila)}</Lista>
        </>
      )}

      {puede(sesion, 'vehiculos.crear') && (
        <BotonFlotante
          href="/vehiculos/solicitudes/nueva"
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Pedir un viaje"
        >
          Pedir
        </BotonFlotante>
      )}
    </div>
  )
}
