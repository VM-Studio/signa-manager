import { Wrench } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarSubcontratistas } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  EncabezadoPantalla,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
} from '@/components/ui'
import { plural, textoEnum } from '@/lib/formato'

export default async function PaginaSubcontratistas() {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Subcontratistas" />

  const subcontratistas = await listarSubcontratistas()

  return (
    <div className="pb-8">
      <EncabezadoPantalla titulo="Subcontratistas" volverA="/personal" />

      {subcontratistas.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay subcontratistas"
          mensaje="Cargá el primero para poder asignarlo a una obra."
          icono={<Wrench className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {subcontratistas.map((s) => (
            <FilaLista
              key={s.id}
              titulo={s.razonSocial}
              subtitulo={textoEnum(s.rubro)}
              detalle={
                [
                  s.contacto,
                  s.obras.length > 0 ? s.obras.join(', ') : 'Sin obras asignadas',
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              tono={s.documentosVencidos > 0 ? 'critico' : 'neutro'}
              debajoDerecha={
                s.documentosVencidos > 0 ? (
                  <Insignia tono="critico">
                    {plural(s.documentosVencidos, 'doc. vencido', 'docs. vencidos')}
                  </Insignia>
                ) : (
                  <Insignia tono="correcto">Al día</Insignia>
                )
              }
              href={`/personal/subcontratistas/${s.id}`}
            />
          ))}
        </Lista>
      )}
    </div>
  )
}
