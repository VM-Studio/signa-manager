'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react'
import {
  accionImportarCsv,
  accionPrevisualizarCsv,
  type FilaCsv,
} from '@/server/herramientas/acciones'
import {
  AvisoFijo,
  Boton,
  CampoSelect,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { moneda, plural } from '@/lib/formato'

/* =====================================================================
   Alta masiva desde un archivo CSV.

   Siempre con vista previa antes de confirmar: van a cargar cientos de
   herramientas al empezar y un error de columna sin revisar sería un
   desastre difícil de deshacer.
   ===================================================================== */

export function AltaMasiva({
  depositos,
  categorias,
}: {
  depositos: Array<{ id: string; nombre: string }>
  categorias: string[]
}) {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const [filas, setFilas] = useState<FilaCsv[] | null>(null)
  const [validas, setValidas] = useState(0)
  const [conError, setConError] = useState(0)
  const [depositoId, setDepositoId] = useState('')
  const [leyendo, setLeyendo] = useState(false)

  const leerArchivo = async (archivo: File) => {
    setLeyendo(true)
    try {
      const contenido = await archivo.text()
      const resultado = await accionPrevisualizarCsv(contenido)
      setFilas(resultado.filas)
      setValidas(resultado.validas)
      setConError(resultado.conError)
      if (resultado.filas.length === 0) {
        avisos.error('El archivo no tiene filas para cargar')
      }
    } catch {
      avisos.error('No se pudo leer el archivo')
    } finally {
      setLeyendo(false)
    }
  }

  const confirmar = () => {
    if (!filas || !depositoId) {
      avisos.error('Elegí a qué depósito entran')
      return
    }
    empezar(async () => {
      const r = await accionImportarCsv(filas, depositoId)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Cargadas')
        router.push('/herramientas')
      }
    })
  }

  return (
    <div className="pb-8">
      {!filas && (
        <>
          <div className="px-4 pt-4">
            <AvisoFijo tono="neutro" titulo="Cómo tiene que ser el archivo">
              Un CSV con estas columnas en la primera fila:{' '}
              <strong>código, nombre, categoría</strong> (obligatorias) y{' '}
              <strong>marca, modelo, nro serie, valor, costo diario</strong>{' '}
              (opcionales). Separado por comas o punto y coma.
            </AvisoFijo>
          </div>

          <TituloSeccion>Categorías que existen</TituloSeccion>
          <p className="px-4 text-chico text-grafito">
            La columna categoría tiene que decir exactamente una de estas:{' '}
            {categorias.join(', ')}.
          </p>

          <div className="px-4 pt-5">
            <label
              htmlFor="archivo-csv"
              className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border-2 border-dashed border-niebla bg-blanco px-4 py-6 text-center active:bg-hueso"
            >
              <Upload aria-hidden className="size-7 text-metadato" strokeWidth={1.5} />
              <span className="text-base font-medium text-negro">
                {leyendo ? 'Leyendo el archivo…' : 'Elegí el archivo CSV'}
              </span>
              <span className="text-menor text-metadato">
                Se revisa antes de cargar nada.
              </span>
            </label>
            <input
              id="archivo-csv"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const archivo = e.target.files?.[0]
                if (archivo) void leerArchivo(archivo)
              }}
            />
          </div>
        </>
      )}

      {filas && (
        <>
          <div className="space-y-2 px-4 pt-4">
            {validas > 0 && (
              <AvisoFijo tono="correcto" titulo={`${plural(validas, 'fila lista', 'filas listas')}`}>
                Se van a cargar como disponibles en el depósito que elijas.
              </AvisoFijo>
            )}
            {conError > 0 && (
              <AvisoFijo tono="critico" titulo={`${plural(conError, 'fila con error', 'filas con error')}`}>
                Estas no se van a cargar. Corregí el archivo y volvé a
                subirlo, o cargá solo las que están bien.
              </AvisoFijo>
            )}
          </div>

          {validas > 0 && (
            <div className="px-4 pt-4">
              <CampoSelect
                name="depositoId"
                etiqueta="¿A qué depósito entran?"
                value={depositoId}
                onChange={(e) => setDepositoId(e.target.value)}
                vacio="Elegí un depósito…"
                required
                opciones={depositos.map((d) => ({ valor: d.id, texto: d.nombre }))}
              />
            </div>
          )}

          <TituloSeccion>Vista previa</TituloSeccion>
          {filas.length === 0 ? (
            <EstadoVacio
              titulo="El archivo no tiene filas"
              mensaje="Revisá que tenga encabezados y al menos una fila de datos."
            />
          ) : (
            <Lista>
              {filas.map((f) => (
                <FilaLista
                  key={f.fila}
                  titulo={f.nombre || '(sin nombre)'}
                  subtitulo={`Fila ${f.fila} · ${f.codigo || '(sin código)'}`}
                  detalle={
                    f.errores.length > 0
                      ? f.errores.join(' · ')
                      : [f.categoria, f.marca].filter(Boolean).join(' · ')
                  }
                  tono={f.errores.length > 0 ? 'critico' : 'neutro'}
                  derecha={f.valorCompra ? moneda(f.valorCompra) : undefined}
                  debajoDerecha={
                    f.errores.length > 0 ? (
                      <Insignia tono="critico" icono={<AlertTriangle className="size-3" />}>
                        Con error
                      </Insignia>
                    ) : (
                      <Insignia tono="correcto" icono={<CheckCircle2 className="size-3" />}>
                        Lista
                      </Insignia>
                    )
                  }
                  flecha={false}
                />
              ))}
            </Lista>
          )}

          <div className="flex gap-2 px-4 pt-5">
            <Boton
              variante="secundario"
              ancho
              onClick={() => {
                setFilas(null)
                setValidas(0)
                setConError(0)
              }}
            >
              Elegir otro archivo
            </Boton>
            <Boton
              ancho
              disabled={validas === 0 || !depositoId}
              cargando={pendiente}
              onClick={confirmar}
            >
              Cargar {plural(validas, 'herramienta')}
            </Boton>
          </div>
        </>
      )}
    </div>
  )
}
