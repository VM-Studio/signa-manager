import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import {
  choferesParaElPedido,
  obtenerSolicitudViaje,
  vehiculosParaElPedido,
} from '@/server/vehiculos/queries'
import { bloqueosDelChofer } from '@/server/vehiculos/reglas'
import { SinPermiso } from '@/components/app/SinPermiso'
import { AsignarViaje } from '@/components/vehiculos/AsignarViaje'
import {
  Dato,
  EncabezadoPantalla,
  Insignia,
  ListaDatos,
  TituloSeccion,
} from '@/components/ui'
import { fechaYHora, patente, peso, plural, textoEnum } from '@/lib/formato'

export default async function PaginaSolicitudViaje({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Solicitud de viaje" />

  const { id } = await params
  const solicitud = await obtenerSolicitudViaje(id)
  if (!solicitud) notFound()

  const puedeAsignar =
    puede(sesion, 'vehiculos.aprobar') && solicitud.estado === 'PENDIENTE'

  // Solo se calculan las propuestas si de verdad se va a asignar.
  if (!puedeAsignar) {
    return (
      <div className="pb-8">
        <EncabezadoPantalla
          titulo="Solicitud de viaje"
          subtitulo={solicitud.obra.codigo}
          volverA="/vehiculos/solicitudes"
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-niebla bg-blanco px-4 py-3">
          <Insignia
            tono={
              solicitud.estado === 'ASIGNADA'
                ? 'correcto'
                : solicitud.estado === 'PENDIENTE'
                  ? 'aviso'
                  : 'neutro'
            }
          >
            {textoEnum(solicitud.estado)}
          </Insignia>
        </div>

        <TituloSeccion>El pedido</TituloSeccion>
        <div className="border-y border-niebla bg-blanco">
          <ListaDatos>
            <Dato etiqueta="Obra">{solicitud.obra.codigo}</Dato>
            <Dato etiqueta="Desde">{solicitud.origen}</Dato>
            <Dato etiqueta="Hasta">{solicitud.destino}</Dato>
            <Dato etiqueta="Para">{fechaYHora(solicitud.fechaHoraNecesaria)}</Dato>
            {solicitud.pesoEstimadoKg && (
              <Dato etiqueta="Peso">{peso(solicitud.pesoEstimadoKg)}</Dato>
            )}
            {solicitud.cantidadPersonas && (
              <Dato etiqueta="Personas">
                {plural(solicitud.cantidadPersonas, 'persona')}
              </Dato>
            )}
            <Dato etiqueta="Prioridad">{textoEnum(solicitud.prioridad)}</Dato>
            <Dato etiqueta="Pidió">{solicitud.solicitante.nombre}</Dato>
          </ListaDatos>
          {solicitud.descripcionCarga && (
            <p className="pb-4 text-chico text-grafito">
              {solicitud.descripcionCarga}
            </p>
          )}
        </div>

        {solicitud.viaje && (
          <>
            <TituloSeccion>El viaje asignado</TituloSeccion>
            <div className="border-y border-niebla bg-blanco">
              <ListaDatos>
                <Dato etiqueta="Vehículo">
                  {patente(solicitud.viaje.vehiculo.patente)} ·{' '}
                  {solicitud.viaje.vehiculo.marca} {solicitud.viaje.vehiculo.modelo}
                </Dato>
                <Dato etiqueta="Chofer">
                  {solicitud.viaje.chofer.nombre} {solicitud.viaje.chofer.apellido}
                </Dato>
                <Dato etiqueta="Estado">{textoEnum(solicitud.viaje.estado)}</Dato>
                <Dato etiqueta="Sale">
                  {fechaYHora(solicitud.viaje.salidaPrevista)}
                </Dato>
              </ListaDatos>
            </div>
          </>
        )}

        {solicitud.motivoRechazo && (
          <>
            <TituloSeccion>Por qué se rechazó</TituloSeccion>
            <p className="border-y border-niebla bg-blanco px-4 py-3 text-base text-grafito">
              {solicitud.motivoRechazo}
            </p>
          </>
        )}
      </div>
    )
  }

  const pedido = {
    pesoCargaKg: solicitud.pesoEstimadoKg,
    cantidadPersonas: solicitud.cantidadPersonas,
    salidaPrevista: solicitud.fechaHoraNecesaria,
  }

  const [propuestas, choferes] = await Promise.all([
    vehiculosParaElPedido(pedido),
    choferesParaElPedido(solicitud.fechaHoraNecesaria),
  ])

  return (
    <>
      <EncabezadoPantalla
        titulo="Asignar viaje"
        subtitulo={solicitud.obra.codigo}
        volverA="/vehiculos/solicitudes"
      />
      <AsignarViaje
        solicitud={{
          id: solicitud.id,
          tipo: solicitud.tipo,
          origen: solicitud.origen,
          destino: solicitud.destino,
          descripcionCarga: solicitud.descripcionCarga,
          pesoEstimadoKg: solicitud.pesoEstimadoKg,
          cantidadPersonas: solicitud.cantidadPersonas,
          fechaHoraNecesaria: solicitud.fechaHoraNecesaria,
          prioridad: solicitud.prioridad,
          obra: solicitud.obra.codigo,
          obraNombre: solicitud.obra.nombre,
          solicitante: solicitud.solicitante.nombre,
        }}
        propuestas={propuestas.map((p) => ({
          id: p.vehiculo.id,
          patente: p.vehiculo.patente,
          tipo: p.vehiculo.tipo,
          marca: p.vehiculo.marca,
          modelo: p.vehiculo.modelo,
          capacidadCargaKg: p.vehiculo.capacidadCargaKg,
          cantidadPasajeros: p.vehiculo.cantidadPasajeros,
          costoKmEstimado: p.vehiculo.costoKmEstimado,
          sirve: p.sirve,
          sobraKg: p.sobraKg,
          bloqueos: p.bloqueos,
        }))}
        choferes={choferes.map((c) => {
          const bloqueos = bloqueosDelChofer(c)
          return {
            id: c.id,
            nombre: c.nombre,
            apellido: c.apellido,
            licenciaVence: c.licenciaVence,
            bloqueos,
            sirve: bloqueos.length === 0,
          }
        })}
      />
    </>
  )
}
