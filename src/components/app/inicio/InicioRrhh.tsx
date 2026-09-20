import Link from 'next/link'
import { FileWarning, UserMinus } from 'lucide-react'
import type { InicioRrhh as Datos } from '@/server/nucleo/inicio'
import {
  AvisoFijo,
  EstadoVacio,
  FilaLista,
  GrillaResumen,
  Insignia,
  Lista,
  NumeroResumen,
  TituloSeccion,
} from '@/components/ui'
import { numero, plural, textoEnum, textoVencimiento } from '@/lib/formato'

export function InicioRrhh({ datos }: { datos: Datos }) {
  const vencidos = datos.documentacionPorVencer.filter((d) => d.vencido)

  return (
    <>
      <TituloSeccion>Personal</TituloSeccion>
      <GrillaResumen columnas={3}>
        <NumeroResumen
          etiqueta="Empleados activos"
          valor={numero(datos.totalEmpleados)}
          href="/personal/empleados"
        />
        <NumeroResumen
          etiqueta="Docs. vencidos"
          valor={numero(vencidos.length)}
          tono={vencidos.length > 0 ? 'critico' : 'neutro'}
          href="/personal/empleados?documentacion=vencida"
        />
        <NumeroResumen
          etiqueta="Sin asignar"
          valor={numero(datos.sinAsignacion.length)}
          tono={datos.sinAsignacion.length > 0 ? 'aviso' : 'neutro'}
          href="/personal/planificacion"
        />
      </GrillaResumen>

      {datos.subcontratistasConDocVencida > 0 && (
        <div className="px-4 pb-1">
          <AvisoFijo tono="critico" titulo="Subcontratistas con documentación vencida">
            {plural(
              datos.subcontratistasConDocVencida,
              'subcontratista tiene',
              'subcontratistas tienen',
            )}{' '}
            papeles vencidos. Por seguridad y por responsabilidad legal no
            deberían entrar a una obra.{' '}
            <Link href="/personal/subcontratistas" className="underline">
              Revisar
            </Link>
            .
          </AvisoFijo>
        </div>
      )}

      <TituloSeccion
        accion={
          <Link
            href="/personal/empleados"
            className="text-menor text-grafito underline"
          >
            Ver todos
          </Link>
        }
      >
        Documentación por vencer
      </TituloSeccion>

      {datos.documentacionPorVencer.length === 0 ? (
        <EstadoVacio
          titulo="Toda la documentación al día"
          mensaje="No hay nada por vencer en los próximos 15 días."
          icono={<FileWarning className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {datos.documentacionPorVencer.map((d) => (
            <FilaLista
              key={d.id}
              titulo={d.empleado}
              subtitulo={`${textoEnum(d.tipo)} · legajo ${d.legajo}`}
              tono={d.vencido ? 'critico' : 'aviso'}
              debajoDerecha={
                <Insignia tono={d.vencido ? 'critico' : 'aviso'}>
                  {textoVencimiento(d.vencimiento)}
                </Insignia>
              }
              href={`/personal/empleados/${d.empleadoId}?pestana=documentacion`}
            />
          ))}
        </Lista>
      )}

      <TituloSeccion>Empleados sin asignación</TituloSeccion>
      {datos.sinAsignacion.length === 0 ? (
        <EstadoVacio
          titulo="Todos asignados"
          mensaje="No hay empleados activos sin obra."
          icono={<UserMinus className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {datos.sinAsignacion.map((e) => (
            <FilaLista
              key={e.id}
              titulo={e.nombre}
              subtitulo={`Legajo ${e.legajo} · ${textoEnum(e.categoria)}`}
              tono="aviso"
              href={`/personal/empleados/${e.id}`}
            />
          ))}
        </Lista>
      )}
    </>
  )
}
