import Link from 'next/link'
import { Inbox, QrCode } from 'lucide-react'
import type { InicioPanolero as Datos } from '@/server/nucleo/inicio'
import {
  EstadoVacio,
  FilaLista,
  GrillaResumen,
  Insignia,
  Lista,
  NumeroResumen,
  TituloSeccion,
} from '@/components/ui'
import { fechaRelativaCorta, numero, plural, textoEnum } from '@/lib/formato'

export function InicioPanolero({ datos }: { datos: Datos }) {
  return (
    <>
      {/* El botón grande: el pañolero trabaja escaneando. */}
      <div className="px-4 pt-4">
        <Link
          href="/herramientas/escanear"
          className="flex min-h-[72px] items-center justify-center gap-3 rounded-[var(--radius-panel)] bg-negro px-4 text-titulo font-medium text-blanco active:bg-carbon"
        >
          <QrCode aria-hidden className="size-6" strokeWidth={1.75} />
          Escanear herramienta
        </Link>
      </div>

      <GrillaResumen columnas={3}>
        <NumeroResumen
          etiqueta="Disponibles"
          valor={numero(datos.disponibles)}
          href="/herramientas?estado=DISPONIBLE"
        />
        <NumeroResumen
          etiqueta="En reparación"
          valor={numero(datos.enReparacion)}
          tono={datos.enReparacion > 0 ? 'aviso' : 'neutro'}
          href="/herramientas?estado=EN_REPARACION"
        />
        <NumeroResumen
          etiqueta="Vencidas"
          valor={numero(datos.devolucionesVencidas.length)}
          tono={datos.devolucionesVencidas.length > 0 ? 'critico' : 'neutro'}
          href="/herramientas?vencidas=1"
        />
      </GrillaResumen>

      <TituloSeccion
        accion={
          <Link
            href="/herramientas/solicitudes"
            className="text-menor text-grafito underline"
          >
            Ver todas
          </Link>
        }
      >
        Solicitudes pendientes
      </TituloSeccion>

      {datos.solicitudesPendientes.length === 0 ? (
        <EstadoVacio
          titulo="No hay solicitudes pendientes"
          mensaje="Cuando una obra pida una herramienta, aparece acá."
          icono={<Inbox className="size-8" strokeWidth={1.5} />}
        />
      ) : (
        <Lista>
          {datos.solicitudesPendientes.map((s) => (
            <FilaLista
              key={s.id}
              titulo={s.descripcion}
              subtitulo={`${s.obra} · para el ${fechaRelativaCorta(s.fechaNecesaria).toLowerCase()}`}
              tono={s.prioridad === 'URGENTE' ? 'critico' : s.prioridad === 'ALTA' ? 'aviso' : 'neutro'}
              debajoDerecha={
                s.prioridad !== 'NORMAL' && s.prioridad !== 'BAJA' ? (
                  <Insignia tono={s.prioridad === 'URGENTE' ? 'critico' : 'aviso'}>
                    {textoEnum(s.prioridad)}
                  </Insignia>
                ) : undefined
              }
              href={`/herramientas/solicitudes/${s.id}`}
            />
          ))}
        </Lista>
      )}

      <TituloSeccion>Devoluciones vencidas</TituloSeccion>
      {datos.devolucionesVencidas.length === 0 ? (
        <EstadoVacio
          titulo="Ninguna devolución vencida"
          mensaje="Todas las herramientas en obra están dentro de su fecha."
        />
      ) : (
        <Lista>
          {datos.devolucionesVencidas.map((h) => (
            <FilaLista
              key={h.id}
              titulo={h.nombre}
              subtitulo={`${h.codigo}${h.obra ? ` · ${h.obra}` : ''}`}
              detalle={h.responsable ?? undefined}
              tono="critico"
              debajoDerecha={
                <Insignia tono="critico">
                  {plural(h.diasDeAtraso, 'día', 'días')} de atraso
                </Insignia>
              }
              href={`/herramientas/${h.id}`}
            />
          ))}
        </Lista>
      )}
    </>
  )
}
