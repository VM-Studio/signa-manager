'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react'
import {
  accionImportarEmpleadosCsv,
  accionPrevisualizarEmpleadosCsv,
  type FilaEmpleadoCsv,
} from '@/server/personal/empleados'
import {
  AvisoFijo,
  Boton,
  EstadoVacio,
  FilaLista,
  Insignia,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { moneda, plural } from '@/lib/formato'

/* =====================================================================
   Alta masiva de empleados desde CSV.

   Igual que en herramientas: primero se ve todo el archivo con los
   errores marcados fila por fila, y recién ahí se confirma. Cargar
   sesenta legajos mal sería mucho peor que cargarlos a mano.
   ===================================================================== */

export function AltaMasivaEmpleados() {
  const router = useRouter()
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()

  const [filas, setFilas] = useState<FilaEmpleadoCsv[] | null>(null)
  const [validas, setValidas] = useState(0)
  const [conError, setConError] = useState(0)
  const [leyendo, setLeyendo] = useState(false)

  const leerArchivo = async (archivo: File) => {
    setLeyendo(true)
    try {
      const contenido = await archivo.text()
      const resultado = await accionPrevisualizarEmpleadosCsv(contenido)
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
    if (!filas) return
    empezar(async () => {
      const r = await accionImportarEmpleadosCsv(filas)
      if (r.error) avisos.error(r.error)
      else {
        avisos.correcto(r.mensaje ?? 'Cargados')
        router.push('/personal/empleados')
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
              <strong>
                legajo, nombre, apellido, dni, categoría, valor hora, fecha
                ingreso
              </strong>{' '}
              (obligatorias) y <strong>cuil, especialidad, teléfono, localidad</strong>{' '}
              (opcionales). Separado por comas o punto y coma.
            </AvisoFijo>
          </div>

          <TituloSeccion>Categorías que se reconocen</TituloSeccion>
          <p className="px-4 text-chico text-grafito">
            Oficial especializado, oficial, medio oficial, ayudante (o peón),
            sereno, capataz, chofer, administrativo, otro.
          </p>

          <TituloSeccion>Fechas</TituloSeccion>
          <p className="px-4 text-chico text-grafito">
            Se entiende 14/09/2026 y también 2026-09-14.
          </p>

          <div className="px-4 pt-5">
            <label
              htmlFor="archivo-empleados"
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
              id="archivo-empleados"
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
              <AvisoFijo
                tono="correcto"
                titulo={plural(validas, 'fila lista', 'filas listas')}
              >
                Entran como activos, con el valor hora del archivo como valor
                de ingreso.
              </AvisoFijo>
            )}
            {conError > 0 && (
              <AvisoFijo
                tono="critico"
                titulo={plural(conError, 'fila con error', 'filas con error')}
              >
                Estas no se van a cargar. Corregí el archivo y volvé a subirlo,
                o cargá solo las que están bien.
              </AvisoFijo>
            )}
          </div>

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
                  titulo={
                    [f.apellido, f.nombre].filter(Boolean).join(', ') ||
                    '(sin nombre)'
                  }
                  subtitulo={`Fila ${f.fila} · legajo ${f.legajo || '—'}`}
                  detalle={
                    f.errores.length > 0
                      ? f.errores.join(' · ')
                      : [f.categoria, f.especialidad].filter(Boolean).join(' · ')
                  }
                  tono={f.errores.length > 0 ? 'critico' : 'neutro'}
                  derecha={f.valorHora ? moneda(f.valorHora) : undefined}
                  debajoDerecha={
                    f.errores.length > 0 ? (
                      <Insignia
                        tono="critico"
                        icono={<AlertTriangle className="size-3" />}
                      >
                        Con error
                      </Insignia>
                    ) : (
                      <Insignia
                        tono="correcto"
                        icono={<CheckCircle2 className="size-3" />}
                      >
                        Listo
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
              disabled={validas === 0}
              cargando={pendiente}
              onClick={confirmar}
            >
              Cargar {plural(validas, 'empleado')}
            </Boton>
          </div>
        </>
      )}
    </div>
  )
}
