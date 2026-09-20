import { Wrench } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { mantenimientosPendientes } from '@/server/herramientas/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  EncabezadoPantalla,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
} from '@/components/ui'
import { plural, textoVencimiento } from '@/lib/formato'

export default async function PaginaMantenimiento() {
  const sesion = await sesionConPermiso('herramientas.ver')
  if (!sesion) return <SinPermiso titulo="Mantenimiento" />

  const { vencidos, proximos } = await mantenimientosPendientes()

  return (
    <div className="pb-8">
      <EncabezadoPantalla
        titulo="Mantenimiento"
        subtitulo={`${plural(vencidos.length, 'vencido')} · ${plural(proximos.length, 'próximo')}`}
        volverA="/herramientas"
      />

      <TituloSeccion>Vencidos</TituloSeccion>
      {vencidos.length === 0 ? (
        <EstadoVacio
          titulo="Ningún mantenimiento vencido"
          mensaje="Todas las herramientas están al día."
          icono={<Wrench className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {vencidos.map((h) => (
            <FilaLista
              key={h.id}
              titulo={h.nombre}
              subtitulo={h.codigo}
              tono="critico"
              debajoDerecha={
                <Insignia tono="critico">
                  {textoVencimiento(h.proximoMantenimiento)}
                </Insignia>
              }
              href={`/herramientas/${h.id}/mantenimiento`}
            />
          ))}
        </Lista>
      )}

      <TituloSeccion>Próximos 30 días</TituloSeccion>
      {proximos.length === 0 ? (
        <EstadoVacio
          titulo="Nada para los próximos 30 días"
          mensaje="Volvé a mirar la semana que viene."
        />
      ) : (
        <Lista>
          {proximos.map((h) => (
            <FilaLista
              key={h.id}
              titulo={h.nombre}
              subtitulo={h.codigo}
              tono="aviso"
              debajoDerecha={
                <Insignia tono="aviso">
                  {textoVencimiento(h.proximoMantenimiento)}
                </Insignia>
              }
              href={`/herramientas/${h.id}/mantenimiento`}
            />
          ))}
        </Lista>
      )}
    </div>
  )
}
