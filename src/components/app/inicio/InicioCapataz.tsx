import Link from 'next/link'
import { ClipboardList, Hammer } from 'lucide-react'
import type { InicioCapataz as Datos } from '@/server/nucleo/inicio'
import {
  AvisoFijo,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  Tarjeta,
  TituloSeccion,
} from '@/components/ui'
import { plural, textoVencimiento } from '@/lib/formato'

export function InicioCapataz({ datos }: { datos: Datos }) {
  if (!datos.obra) {
    return (
      <EstadoVacio
        titulo="No tenés una obra asignada"
        mensaje="Hablá con tu jefe de obra para que te asigne."
        icono={<ClipboardList className="size-8" strokeWidth={1.5} />}
      />
    )
  }

  const vencidas = datos.herramientasACargo.filter((h) => h.vencida)

  return (
    <>
      <TituloSeccion>Tu obra de hoy</TituloSeccion>
      <Tarjeta className="mx-4">
        <p className="text-titulo font-medium text-negro">{datos.obra.nombre}</p>
        <p className="mt-0.5 text-menor text-grafito">
          {datos.obra.codigo}
          {datos.obra.localidad ? ` · ${datos.obra.localidad}` : ''}
        </p>
        <p className="mt-2 text-chico text-grafito">
          {plural(datos.personasAsignadas, 'persona asignada', 'personas asignadas')}
        </p>
      </Tarjeta>

      {/* El botón más importante de toda la app para este rol. */}
      <div className="px-4 pt-4">
        {datos.yaCargoElParteDeHoy ? (
          <div className="flex flex-col gap-2">
            <AvisoFijo tono="correcto" titulo="Ya cargaste el parte de hoy">
              Si necesitás corregir algo, entrá y editalo mientras el jefe de obra
              no lo haya aprobado.
            </AvisoFijo>
            <Link
              href={`/personal/partes/nuevo?obra=${datos.obra.id}`}
              className="flex min-h-[52px] items-center justify-center rounded-[var(--radius-control)] border border-niebla bg-blanco text-base font-medium text-negro active:bg-hueso"
            >
              Ver el parte de hoy
            </Link>
          </div>
        ) : (
          <Link
            href={`/personal/partes/nuevo?obra=${datos.obra.id}`}
            className="flex min-h-[72px] items-center justify-center gap-3 rounded-[var(--radius-panel)] bg-negro px-4 text-titulo font-medium text-blanco active:bg-carbon"
          >
            <ClipboardList aria-hidden className="size-6" strokeWidth={1.75} />
            Cargar parte de hoy
          </Link>
        )}
      </div>

      <TituloSeccion
        accion={
          <Link href="/herramientas" className="text-menor text-grafito underline">
            Ver todas
          </Link>
        }
      >
        Herramientas a tu cargo
      </TituloSeccion>

      {datos.herramientasACargo.length === 0 ? (
        <EstadoVacio
          titulo="No tenés herramientas a cargo"
          mensaje="Cuando el pañol te entregue una, aparece acá."
          icono={<Hammer className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <>
          {vencidas.length > 0 && (
            <div className="px-4 pb-2">
              <AvisoFijo tono="critico" titulo="Tenés devoluciones vencidas">
                {plural(vencidas.length, 'herramienta', 'herramientas')} que tenías
                que devolver. Avisale al pañolero o devolvelas hoy.
              </AvisoFijo>
            </div>
          )}
          <Lista>
            {datos.herramientasACargo.map((h) => (
              <FilaLista
                key={h.id}
                titulo={h.nombre}
                subtitulo={h.codigo}
                tono={h.vencida ? 'critico' : 'neutro'}
                debajoDerecha={
                  h.fechaDevolucionPrevista ? (
                    <Insignia tono={h.vencida ? 'critico' : 'neutro'}>
                      {textoVencimiento(h.fechaDevolucionPrevista)}
                    </Insignia>
                  ) : undefined
                }
                href={`/herramientas/${h.id}`}
              />
            ))}
          </Lista>
        </>
      )}
    </>
  )
}
