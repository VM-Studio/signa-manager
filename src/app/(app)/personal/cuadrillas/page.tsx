import { Plus, Users } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { puede } from '@/lib/auth/permisos'
import { listarCuadrillas } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  BotonFlotante,
  EncabezadoPantalla,
  EnlaceBoton,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
} from '@/components/ui'
import { plural, textoEnum } from '@/lib/formato'

export default async function PaginaCuadrillas() {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Cuadrillas" />

  const cuadrillas = await listarCuadrillas()
  const puedeEditar = puede(sesion, 'personal.editar')

  return (
    <div className="pb-8">
      <EncabezadoPantalla titulo="Cuadrillas" volverA="/personal" />

      {cuadrillas.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay cuadrillas"
          mensaje="Armá la primera con su capataz y sus miembros."
          icono={<Users className="size-8" strokeWidth={1.5} />}
          accion={
            puede(sesion, 'personal.crear')
              ? { texto: 'Armar cuadrilla', href: '/personal/cuadrillas/nueva' }
              : undefined
          }
        />
      ) : (
        cuadrillas.map((c) => (
          <div key={c.id}>
            <TituloSeccion
              accion={
                <span className="flex items-center gap-2">
                  {c.asignaciones[0] ? (
                    <Insignia tono="neutro">
                      {c.asignaciones[0].obra.codigo}
                    </Insignia>
                  ) : (
                    <Insignia tono="aviso">Sin obra</Insignia>
                  )}
                  {puedeEditar && (
                    <EnlaceBoton
                      tamano="chico"
                      variante="fantasma"
                      href={`/personal/cuadrillas/${c.id}/editar`}
                    >
                      Editar
                    </EnlaceBoton>
                  )}
                </span>
              }
            >
              {c.nombre}
            </TituloSeccion>

            <Lista>
              {c.capataz && (
                <FilaLista
                  titulo={`${c.capataz.apellido}, ${c.capataz.nombre}`}
                  subtitulo="Capataz"
                  debajoDerecha={<Insignia tono="neutro">A cargo</Insignia>}
                  href={`/personal/empleados/${c.capataz.id}`}
                />
              )}
              {c.miembros.map((m) => (
                <FilaLista
                  key={m.id}
                  titulo={`${m.empleado.apellido}, ${m.empleado.nombre}`}
                  subtitulo={`${m.empleado.legajo} · ${textoEnum(m.empleado.categoria)}`}
                  href={`/personal/empleados/${m.empleado.id}`}
                />
              ))}
            </Lista>

            <p className="px-4 pt-2 text-menor text-metadato">
              {plural(c.miembros.length, 'persona')}
              {c.capataz ? ' más el capataz' : ''}.
            </p>
          </div>
        ))
      )}

      {puede(sesion, 'personal.crear') && (
        <BotonFlotante
          href="/personal/cuadrillas/nueva"
          icono={<Plus aria-hidden className="size-5" />}
          etiqueta="Nueva cuadrilla"
        />
      )}
    </div>
  )
}
