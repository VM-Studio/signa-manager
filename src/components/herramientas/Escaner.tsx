'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CameraOff, Check, Keyboard, Trash2 } from 'lucide-react'
import { accionEntregarVarias } from '@/server/herramientas/acciones'
import {
  AvisoFijo,
  Boton,
  CampoFecha,
  CampoSelect,
  CampoTexto,
  FilaLista,
  HojaInferior,
  Insignia,
  Interruptor,
  Lista,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import { plural } from '@/lib/formato'

/* =====================================================================
   Escáner de QR.

   Dos modos:
   · Normal: se escanea una y se va directo a su ficha, con la acción
     más probable ya abierta.
   · Carga continua: el pañolero escanea varias seguidas y las entrega
     todas juntas a la misma obra y persona.

   Si la cámara falla (permiso denegado, teléfono viejo, obra sin luz),
   siempre queda la opción de escribir el código a mano.
   ===================================================================== */

export interface HerramientaEscaneada {
  id: string
  codigo: string
  nombre: string
  estado: string
  accionSugerida: string | null
  ubicacion: string | null
}

export function Escaner({
  obras,
  empleados,
  buscar,
}: {
  obras: Array<{ id: string; codigo: string; nombre: string }>
  empleados: Array<{ id: string; nombre: string; apellido: string; legajo: string }>
  buscar: (texto: string) => Promise<HerramientaEscaneada | null>
}) {
  const router = useRouter()
  const avisos = useAvisos()

  const contenedor = useRef<HTMLDivElement>(null)
  const lector = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const ultimaLectura = useRef<{ texto: string; cuando: number }>({
    texto: '',
    cuando: 0,
  })

  const [camaraActiva, setCamaraActiva] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [cargaContinua, setCargaContinua] = useState(false)
  const [lote, setLote] = useState<HerramientaEscaneada[]>([])
  const [manual, setManual] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [procesando, setProcesando] = useState(false)

  const detenerCamara = useCallback(async () => {
    if (lector.current) {
      try {
        await lector.current.stop()
        lector.current.clear()
      } catch {
        // Ya estaba detenida.
      }
      lector.current = null
    }
    setCamaraActiva(false)
  }, [])

  const procesarLectura = useCallback(
    async (texto: string) => {
      // El lector dispara muchas veces por segundo sobre el mismo código.
      const ahora = Date.now()
      if (
        ultimaLectura.current.texto === texto &&
        ahora - ultimaLectura.current.cuando < 2500
      ) {
        return
      }
      ultimaLectura.current = { texto, cuando: ahora }

      setProcesando(true)
      const herramienta = await buscar(texto)
      setProcesando(false)

      if (!herramienta) {
        avisos.error('Ese código no corresponde a ninguna herramienta')
        return
      }

      if (cargaContinua) {
        setLote((previo) => {
          if (previo.some((h) => h.id === herramienta.id)) {
            avisos.mostrar(`${herramienta.codigo} ya estaba en la lista`)
            return previo
          }
          avisos.correcto(`${herramienta.codigo} agregada`)
          return [...previo, herramienta]
        })
        return
      }

      // Modo normal: a la ficha, con la acción más probable ya abierta.
      await detenerCamara()
      router.push(
        herramienta.accionSugerida
          ? `/herramientas/${herramienta.id}?accion=${herramienta.accionSugerida}`
          : `/herramientas/${herramienta.id}`,
      )
    },
    [buscar, cargaContinua, avisos, router, detenerCamara],
  )

  const iniciarCamara = useCallback(async () => {
    setErrorCamara(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara(
        'Este navegador no puede usar la cámara. Escribí el código a mano.',
      )
      return
    }

    try {
      // La librería se carga recién acá: pesa y no hace falta hasta que
      // alguien realmente abre la cámara.
      const { Html5Qrcode } = await import('html5-qrcode')
      const instancia = new Html5Qrcode('lector-qr', { verbose: false })
      lector.current = instancia as unknown as {
        stop: () => Promise<void>
        clear: () => void
      }

      await instancia.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (texto) => {
          void procesarLectura(texto)
        },
        () => {
          // Cuadros sin QR: es lo normal, no se informa.
        },
      )

      setCamaraActiva(true)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      setErrorCamara(
        mensaje.toLowerCase().includes('permission') ||
          mensaje.toLowerCase().includes('denied')
          ? 'No nos diste permiso para usar la cámara. Habilitala desde la configuración del navegador, o escribí el código a mano.'
          : 'No se pudo abrir la cámara. Escribí el código a mano.',
      )
      setCamaraActiva(false)
    }
  }, [procesarLectura])

  // Al salir de la pantalla hay que apagar la cámara sí o sí.
  useEffect(() => {
    return () => {
      void detenerCamara()
    }
  }, [detenerCamara])

  const entregarLote = async (datos: FormData) => {
    const obraId = String(datos.get('obraId') ?? '')
    if (!obraId) {
      avisos.error('Elegí a qué obra van')
      return
    }

    const resultado = await accionEntregarVarias(
      lote.map((h) => h.id),
      obraId,
      String(datos.get('empleadoId') ?? '') || null,
      String(datos.get('fechaDevolucion') ?? '') || null,
    )

    if (resultado.error) {
      avisos.error(resultado.error)
      return
    }

    avisos.correcto(resultado.mensaje ?? 'Entregadas')
    setLote([])
    setEntregando(false)
    router.refresh()
  }

  return (
    <div className="pb-8">
      <div className="border-b border-niebla bg-blanco px-4 py-3">
        <Interruptor
          name="cargaContinua"
          etiqueta="Carga continua"
          descripcion="Escaneá varias seguidas y entregalas todas juntas."
          checked={cargaContinua}
          onChange={(e) => {
            setCargaContinua(e.target.checked)
            if (!e.target.checked) setLote([])
          }}
        />
      </div>

      {/* La cámara */}
      <div className="bg-negro">
        <div
          id="lector-qr"
          ref={contenedor}
          className="mx-auto aspect-square w-full max-w-[400px]"
        />
      </div>

      {!camaraActiva && (
        <div className="space-y-3 px-4 pt-4">
          {errorCamara && <AvisoFijo tono="aviso">{errorCamara}</AvisoFijo>}
          <Boton
            ancho
            tamano="grande"
            iconoIzquierda={<Camera aria-hidden className="size-5" />}
            onClick={iniciarCamara}
          >
            Abrir la cámara
          </Boton>
        </div>
      )}

      {camaraActiva && (
        <div className="space-y-2 px-4 pt-4">
          <p className="text-center text-chico text-grafito">
            {procesando
              ? 'Buscando…'
              : 'Apuntá al código QR de la herramienta.'}
          </p>
          <Boton
            variante="secundario"
            ancho
            iconoIzquierda={<CameraOff aria-hidden className="size-4" />}
            onClick={detenerCamara}
          >
            Apagar la cámara
          </Boton>
        </div>
      )}

      <div className="px-4 pt-3">
        <Boton
          variante="fantasma"
          ancho
          iconoIzquierda={<Keyboard aria-hidden className="size-4" />}
          onClick={() => setManual(true)}
        >
          Escribir el código a mano
        </Boton>
      </div>

      {/* El lote de la carga continua */}
      {cargaContinua && (
        <>
          <TituloSeccion>
            {lote.length === 0
              ? 'Todavía no escaneaste nada'
              : plural(lote.length, 'herramienta escaneada', 'herramientas escaneadas')}
          </TituloSeccion>

          {lote.length > 0 && (
            <>
              <Lista>
                {lote.map((h) => (
                  <FilaLista
                    key={h.id}
                    titulo={h.nombre}
                    subtitulo={h.codigo}
                    detalle={h.ubicacion ?? undefined}
                    debajoDerecha={
                      h.estado !== 'DISPONIBLE' ? (
                        <Insignia tono="aviso">No está disponible</Insignia>
                      ) : (
                        <Insignia tono="correcto">Lista</Insignia>
                      )
                    }
                    alTocar={() =>
                      setLote((p) => p.filter((x) => x.id !== h.id))
                    }
                    flecha={false}
                    derecha={
                      <Trash2 aria-hidden className="size-4 text-metadato" />
                    }
                  />
                ))}
              </Lista>

              <div className="px-4 pt-4">
                <Boton
                  ancho
                  tamano="grande"
                  iconoIzquierda={<Check aria-hidden className="size-5" />}
                  onClick={() => setEntregando(true)}
                >
                  Entregar {plural(lote.length, 'herramienta')}
                </Boton>
              </div>
            </>
          )}
        </>
      )}

      {/* Código a mano */}
      <HojaInferior
        abierta={manual}
        alCerrar={() => setManual(false)}
        titulo="Escribir el código"
        descripcion="El que está impreso en la etiqueta"
      >
        <form
          action={async (datos: FormData) => {
            const codigo = String(datos.get('codigo') ?? '').trim()
            if (!codigo) return
            setManual(false)
            await procesarLectura(codigo)
          }}
          className="space-y-4"
        >
          <CampoTexto
            name="codigo"
            etiqueta="Código de la herramienta"
            placeholder="SIG-H-0042"
            autoCapitalize="characters"
            autoComplete="off"
            required
          />
          <Boton type="submit" ancho>
            Buscar
          </Boton>
        </form>
      </HojaInferior>

      {/* Entrega del lote */}
      <HojaInferior
        abierta={entregando}
        alCerrar={() => setEntregando(false)}
        titulo="Entregar todas juntas"
        descripcion={plural(lote.length, 'herramienta')}
        alto="alto"
      >
        <form action={entregarLote} className="space-y-4">
          <CampoSelect
            name="obraId"
            etiqueta="Obra"
            vacio="Elegí una obra…"
            required
            opciones={obras.map((o) => ({
              valor: o.id,
              texto: `${o.codigo} · ${o.nombre}`,
            }))}
          />
          <CampoSelect
            name="empleadoId"
            etiqueta="Quién las recibe"
            vacio="Sin responsable"
            opciones={empleados.map((e) => ({
              valor: e.id,
              texto: `${e.apellido}, ${e.nombre} · ${e.legajo}`,
            }))}
          />
          <CampoFecha
            name="fechaDevolucion"
            etiqueta="Devolución prevista"
            ayuda="La misma para todas."
          />
          <Boton type="submit" ancho tamano="grande">
            Entregar {plural(lote.length, 'herramienta')}
          </Boton>
        </form>
      </HojaInferior>
    </div>
  )
}
