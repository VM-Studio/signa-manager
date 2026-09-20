import { sesionConPermiso } from '@/lib/auth/pantalla'
import { vencimientosDeFlota } from '@/server/vehiculos/queries'
import { DOCUMENTOS_BLOQUEANTES } from '@/server/vehiculos/reglas'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  AvisoFijo,
  EncabezadoPantalla,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
} from '@/components/ui'
import { moneda, patente, plural, textoEnum, textoVencimiento } from '@/lib/formato'

export default async function PaginaVencimientos() {
  const sesion = await sesionConPermiso('vehiculos.ver')
  if (!sesion) return <SinPermiso titulo="Vencimientos" />

  const { documentos, licencias } = await vencimientosDeFlota()
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const bloqueantes = documentos.filter(
    (d) =>
      DOCUMENTOS_BLOQUEANTES.includes(d.tipo) &&
      d.vencimiento !== null &&
      d.vencimiento < hoy,
  )

  return (
    <div className="pb-8">
      <EncabezadoPantalla
        titulo="Vencimientos"
        subtitulo="Próximos 60 días"
        volverA="/vehiculos"
      />

      {bloqueantes.length > 0 && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico" titulo="Vehículos que no pueden salir">
            {plural(bloqueantes.length, 'vehículo tiene', 'vehículos tienen')} el
            seguro o la VTV vencidos. El sistema no los deja asignar a ningún
            viaje.
          </AvisoFijo>
        </div>
      )}

      <TituloSeccion>Documentación de vehículos</TituloSeccion>
      {documentos.length === 0 ? (
        <EstadoVacio
          titulo="Nada por vencer"
          mensaje="Toda la documentación de la flota está al día."
        />
      ) : (
        <Lista>
          {documentos.map((d) => {
            const vencido = d.vencimiento !== null && d.vencimiento < hoy
            const bloquea = DOCUMENTOS_BLOQUEANTES.includes(d.tipo)

            return (
              <FilaLista
                key={d.id}
                titulo={`${textoEnum(d.tipo)} · ${patente(d.vehiculo.patente)}`}
                subtitulo={`${d.vehiculo.marca} ${d.vehiculo.modelo}`}
                detalle={
                  bloquea && vencido
                    ? 'Sin esto el vehículo no puede salir a la calle'
                    : (d.descripcion ?? undefined)
                }
                tono={vencido && bloquea ? 'critico' : vencido ? 'aviso' : 'neutro'}
                derecha={d.costo ? moneda(d.costo) : undefined}
                debajoDerecha={
                  <Insignia tono={vencido ? (bloquea ? 'critico' : 'aviso') : 'aviso'}>
                    {textoVencimiento(d.vencimiento)}
                  </Insignia>
                }
                href={`/vehiculos/${d.vehiculo.id}?pestana=documentacion`}
              />
            )
          })}
        </Lista>
      )}

      <TituloSeccion>Licencias de conducir</TituloSeccion>
      {licencias.length === 0 ? (
        <EstadoVacio
          titulo="Ninguna licencia por vencer"
          mensaje="Todos los choferes están al día."
        />
      ) : (
        <Lista>
          {licencias.map((l) => {
            const vencida = l.vencimiento !== null && l.vencimiento < hoy
            return (
              <FilaLista
                key={l.id}
                titulo={`${l.empleado.apellido}, ${l.empleado.nombre}`}
                subtitulo="Licencia nacional de conducir"
                detalle={
                  vencida ? 'No se le puede asignar ningún viaje' : undefined
                }
                tono={vencida ? 'critico' : 'aviso'}
                debajoDerecha={
                  <Insignia tono={vencida ? 'critico' : 'aviso'}>
                    {textoVencimiento(l.vencimiento)}
                  </Insignia>
                }
                href={`/personal/empleados/${l.empleado.id}?pestana=documentacion`}
              />
            )
          })}
        </Lista>
      )}
    </div>
  )
}
