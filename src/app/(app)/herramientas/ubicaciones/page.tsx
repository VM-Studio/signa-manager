import { AlertTriangle, Building2, Warehouse } from 'lucide-react'
import { sesionConPermiso } from '@/lib/auth/pantalla'
import { listarUbicaciones } from '@/server/herramientas/queries'
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
import { moneda, monedaCorta, numero, plural } from '@/lib/formato'

export default async function PaginaUbicaciones() {
  const sesion = await sesionConPermiso('herramientas.ver')
  if (!sesion) return <SinPermiso titulo="Ubicaciones" />

  const ubicaciones = await listarUbicaciones()

  const destacadas = ubicaciones.filter((u) => u.destacada && u.cantidad > 0)
  const depositos = ubicaciones.filter((u) => u.tipo === 'deposito')
  const obras = ubicaciones.filter((u) => u.tipo === 'obra' && !u.destacada)

  const valorTotal = ubicaciones.reduce((a, u) => a + u.valor, 0)
  const valorParado = destacadas.reduce((a, u) => a + u.valor, 0)

  const fila = (u: (typeof ubicaciones)[number]) => (
    <FilaLista
      key={u.id}
      titulo={u.nombre}
      subtitulo={plural(u.cantidad, 'herramienta')}
      detalle={u.valor > 0 ? `${moneda(u.valor)} en valor de compra` : undefined}
      izquierda={
        u.tipo === 'deposito' ? (
          <Warehouse aria-hidden className="size-5 text-grafito" strokeWidth={1.75} />
        ) : (
          <Building2 aria-hidden className="size-5 text-grafito" strokeWidth={1.75} />
        )
      }
      tono={u.destacada ? 'aviso' : u.vencidas > 0 ? 'critico' : 'neutro'}
      derecha={numero(u.cantidad)}
      debajoDerecha={
        u.vencidas > 0 ? (
          <Insignia tono="critico">
            {plural(u.vencidas, 'vencida', 'vencidas')}
          </Insignia>
        ) : u.destacada ? (
          <Insignia tono="aviso">
            {u.estadoObra === 'FINALIZADA' ? 'Obra terminada' : 'Obra pausada'}
          </Insignia>
        ) : undefined
      }
      href={
        u.tipo === 'deposito'
          ? `/herramientas?deposito=${u.id}`
          : `/obras/${u.id}?pestana=herramientas`
      }
    />
  )

  return (
    <div className="pb-8">
      <EncabezadoPantalla
        titulo="Ubicaciones"
        subtitulo={`${monedaCorta(valorTotal)} en herramientas`}
        volverA="/herramientas"
      />

      {ubicaciones.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay herramientas ubicadas"
          mensaje="Cargá herramientas y asignalas a un depósito."
        />
      ) : (
        <>
          {/* Lo que está parado en obras que ya no trabajan va primero:
              es la plata que se puede recuperar hoy. */}
          {destacadas.length > 0 && (
            <>
              <div className="px-4 pt-4">
                <AvisoFijo tono="aviso" titulo="Herramientas paradas">
                  Hay {monedaCorta(valorParado)} en herramientas en obras que
                  terminaron o están pausadas. Conviene traerlas al depósito.
                </AvisoFijo>
              </div>
              <TituloSeccion>Obras sin actividad</TituloSeccion>
              <Lista>{destacadas.map(fila)}</Lista>
            </>
          )}

          <TituloSeccion>Depósitos</TituloSeccion>
          {depositos.length === 0 ? (
            <EstadoVacio
              titulo="Ningún depósito con herramientas"
              mensaje="Está todo en obra."
              icono={<AlertTriangle className="size-8" strokeWidth={1.5} />}
            />
          ) : (
            <Lista>{depositos.map(fila)}</Lista>
          )}

          <TituloSeccion>Obras en curso</TituloSeccion>
          {obras.length === 0 ? (
            <EstadoVacio
              titulo="Ninguna obra con herramientas"
              mensaje="Está todo en el depósito."
            />
          ) : (
            <Lista>{obras.map(fila)}</Lista>
          )}
        </>
      )}
    </div>
  )
}
