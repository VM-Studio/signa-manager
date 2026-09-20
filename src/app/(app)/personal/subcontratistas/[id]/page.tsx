import { notFound } from 'next/navigation'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { obtenerSubcontratista } from '@/server/personal/queries'
import { SinPermiso } from '@/components/app/SinPermiso'
import {
  AvisoFijo,
  Dato,
  EncabezadoPantalla,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  ListaDatos,
  TituloSeccion,
} from '@/components/ui'
import { fechaCorta, moneda, plural, textoEnum, textoVencimiento } from '@/lib/formato'

export default async function PaginaSubcontratista({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sesion = await sesionConPermiso('personal.ver')
  if (!sesion) return <SinPermiso titulo="Subcontratista" />

  const { id } = await params
  const s = await obtenerSubcontratista(id)
  if (!s) notFound()

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // Documentación vencida + gente en obra en los últimos 7 días: eso es
  // responsabilidad legal directa de la empresa.
  const riesgoLegal = s.documentosVencidos.length > 0 && s.presenciasRecientes > 0

  return (
    <div className="pb-8">
      <EncabezadoPantalla
        titulo={s.razonSocial}
        subtitulo={textoEnum(s.rubro)}
        volverA="/personal/subcontratistas"
      />

      {riesgoLegal && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="critico" titulo="No debería estar trabajando">
            Tiene {plural(s.documentosVencidos.length, 'documento vencido', 'documentos vencidos')} y
            registró presencia en obra en los últimos 7 días. Por seguridad y
            por responsabilidad legal de la empresa, no debería entrar así.
          </AvisoFijo>
        </div>
      )}

      {!riesgoLegal && s.documentosVencidos.length > 0 && (
        <div className="px-4 pt-4">
          <AvisoFijo tono="aviso" titulo="Documentación vencida">
            {s.documentosVencidos.map((d) => textoEnum(d.tipo)).join(', ')}.
            Pedísela antes de que vuelva a entrar a una obra.
          </AvisoFijo>
        </div>
      )}

      <TituloSeccion>Datos</TituloSeccion>
      <div className="border-y border-niebla bg-blanco">
        <ListaDatos>
          <Dato etiqueta="CUIT">{s.cuit}</Dato>
          <Dato etiqueta="Rubro">{textoEnum(s.rubro)}</Dato>
          <Dato etiqueta="Contacto">{s.contacto ?? '—'}</Dato>
          <Dato etiqueta="Teléfono">{s.telefono ?? '—'}</Dato>
          <Dato etiqueta="Email">{s.email ?? '—'}</Dato>
        </ListaDatos>
      </div>

      <TituloSeccion>Documentación</TituloSeccion>
      {s.documentos.length === 0 ? (
        <EstadoVacio
          titulo="Sin documentación cargada"
          mensaje="Pedí la nómina de ART, los seguros y la constancia de ARCA."
        />
      ) : (
        <Lista>
          {s.documentos.map((d) => {
            const vencido = d.vencimiento !== null && d.vencimiento < hoy
            return (
              <FilaLista
                key={d.id}
                titulo={textoEnum(d.tipo)}
                subtitulo={d.descripcion ?? undefined}
                tono={vencido ? 'critico' : 'neutro'}
                debajoDerecha={
                  <Insignia tono={vencido ? 'critico' : 'correcto'}>
                    {textoVencimiento(d.vencimiento)}
                  </Insignia>
                }
                flecha={false}
              />
            )
          })}
        </Lista>
      )}

      <TituloSeccion>Obras</TituloSeccion>
      {s.asignaciones.length === 0 ? (
        <EstadoVacio titulo="Sin obras asignadas" mensaje="—" />
      ) : (
        <Lista>
          {s.asignaciones.map((a) => (
            <FilaLista
              key={a.id}
              titulo={a.obra.nombre}
              subtitulo={`${a.obra.codigo} · desde ${fechaCorta(a.desde)}`}
              detalle={a.tarea ?? undefined}
              href={`/obras/${a.obra.id}`}
            />
          ))}
        </Lista>
      )}

      <TituloSeccion>Días de presencia</TituloSeccion>
      {s.presencias.length === 0 ? (
        <EstadoVacio
          titulo="Sin presencias registradas"
          mensaje="Aparecen cuando el capataz los carga en el parte diario."
        />
      ) : (
        <Lista>
          {s.presencias.slice(0, 15).map((p) => (
            <FilaLista
              key={p.id}
              titulo={fechaCorta(p.parte.fecha)}
              subtitulo={p.parte.obra.codigo}
              detalle={p.tarea ?? undefined}
              derecha={plural(p.cantidadPersonas, 'persona')}
              flecha={false}
            />
          ))}
        </Lista>
      )}

      <TituloSeccion>Pagos</TituloSeccion>
      {s.pagos.length === 0 ? (
        <EstadoVacio titulo="Sin pagos registrados" mensaje="—" />
      ) : (
        <Lista>
          {s.pagos.map((p) => (
            <FilaLista
              key={p.id}
              titulo={p.concepto ?? 'Pago'}
              subtitulo={`${fechaCorta(p.fecha)} · ${textoEnum(p.medio)}`}
              derecha={moneda(p.monto)}
              flecha={false}
            />
          ))}
        </Lista>
      )}
    </div>
  )
}
