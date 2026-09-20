import { EstadoObra, Rol } from '@prisma/client'
import { Building2, MapPin } from 'lucide-react'
import type { ObraDelInicio } from '@/server/nucleo/inicio'
import {
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
} from '@/components/ui'
import { plural } from '@/lib/formato'

const ESTADO: Record<EstadoObra, { texto: string; tono: 'neutro' | 'correcto' | 'aviso' }> = {
  PLANIFICADA: { texto: 'Planificada', tono: 'neutro' },
  EN_CURSO: { texto: 'En curso', tono: 'correcto' },
  PAUSADA: { texto: 'Pausada', tono: 'aviso' },
  FINALIZADA: { texto: 'Finalizada', tono: 'neutro' },
}

export function InicioObras({
  obras,
  rol,
}: {
  obras: ObraDelInicio[]
  rol: Rol
}) {
  const pendientes = obras.reduce((a, o) => a + o.partesSinAprobar, 0)
  const faltantes = obras.filter((o) => o.faltaParteDeAyer)

  if (obras.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no tenés obras asignadas"
        mensaje="Cuando administración te asigne una obra, aparece acá."
        icono={<Building2 className="size-8" strokeWidth={1.5} />}
      />
    )
  }

  return (
    <>
      {rol === Rol.JEFE_OBRA && pendientes > 0 && (
        <>
          <TituloSeccion>Te están esperando</TituloSeccion>
          <Lista>
            <FilaLista
              titulo={`${plural(pendientes, 'parte', 'partes')} sin aprobar`}
              subtitulo="Hasta que no los apruebes, el costo no entra en la quincena"
              tono="aviso"
              href="/personal/partes"
            />
          </Lista>
        </>
      )}

      {faltantes.length > 0 && (
        <>
          <TituloSeccion>Falta el parte de ayer</TituloSeccion>
          <Lista>
            {faltantes.map((o) => (
              <FilaLista
                key={o.id}
                titulo={o.nombre}
                subtitulo={`${o.codigo} · nadie cargó el parte del último día hábil`}
                tono="critico"
                href={`/personal/partes/nuevo?obra=${o.id}`}
              />
            ))}
          </Lista>
        </>
      )}

      <TituloSeccion>
        {rol === Rol.ARQUITECTA ? 'Obras' : 'Mis obras'}
      </TituloSeccion>
      <Lista>
        {obras.map((o) => (
          <FilaLista
            key={o.id}
            titulo={o.nombre}
            subtitulo={o.codigo}
            detalle={
              [
                o.localidad,
                o.personas > 0 ? plural(o.personas, 'persona') : null,
              ]
                .filter(Boolean)
                .join(' · ') || undefined
            }
            debajoDerecha={
              <div className="flex flex-col items-end gap-1">
                <Insignia tono={ESTADO[o.estado].tono}>
                  {ESTADO[o.estado].texto}
                </Insignia>
                {o.esInterior && (
                  <span className="flex items-center gap-1 text-micro text-metadato">
                    <MapPin aria-hidden className="size-3" />
                    Interior
                  </span>
                )}
              </div>
            }
            href={`/obras/${o.id}`}
          />
        ))}
      </Lista>
    </>
  )
}
