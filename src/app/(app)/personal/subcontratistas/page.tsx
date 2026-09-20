import { Plus, Wrench } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { listarSubcontratistas } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  BotonFlotante,
  EncabezadoPantalla,
  EnlaceBoton,
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
      <EncabezadoPantalla
        titulo="Subcontratistas"
        volverA="/personal"
        accion={
          puede(sesion, 'personal.crear') ? (
            <EnlaceBoton
              tamano="chico"
              variante="primario"
              href="/personal/subcontratistas/nuevo"
              className="hidden lg:inline-flex"
              iconoIzquierda={<Plus aria-hidden className="size-4" />}
            >
              Nuevo subcontratista
            </EnlaceBoton>
          ) : undefined
        }
      />

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

      {puede(sesion, 'personal.crear') && (
        <BotonFlotante
          href="/personal/subcontratistas/nuevo"
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Nuevo subcontratista"
        />
      )}
    </div>
  )
}
