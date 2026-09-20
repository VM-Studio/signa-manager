'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff, RefreshCw, Upload } from 'lucide-react'
import { accionGuardarParte } from '@/server/personal/partes'
import {
  hayConexion,
  leerCola,
  marcarIntentoFallido,
  sacarDeLaCola,
  type EnCola,
} from '@/lib/cola-partes'
import { Boton, HojaInferior, useAvisos } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fechaCorta, plural } from '@/lib/formato'

/* =====================================================================
   El indicador de partes pendientes de envío.

   Vive en el layout de la app: si el capataz cargó un parte sin señal y
   después vuelve a abrir cualquier pantalla, lo ve y se envía solo.
   ===================================================================== */

export function ColaDePartes() {
  const router = useRouter()
  const avisos = useAvisos()

  const [cola, setCola] = useState<EnCola[]>([])
  const [enviando, setEnviando] = useState(false)
  const [abierta, setAbierta] = useState(false)
  const [conexion, setConexion] = useState(true)

  const refrescar = useCallback(() => setCola(leerCola()), [])

  const enviarTodo = useCallback(async () => {
    const pendientes = leerCola()
    if (pendientes.length === 0 || enviando) return
    if (!hayConexion()) return

    setEnviando(true)
    let enviados = 0

    for (const parte of pendientes) {
      try {
        const resultado = await accionGuardarParte({
          obraId: parte.obraId,
          fecha: parte.fecha,
          clima: parte.clima as never,
          tareasDelDia: parte.tareasDelDia,
          observaciones: parte.observaciones,
          lineas: parte.lineas as never,
          subcontratistas: parte.subcontratistas,
          enviar: true,
        })

        if (resultado.ok) {
          sacarDeLaCola(parte.id)
          enviados += 1
        } else {
          marcarIntentoFallido(parte.id, resultado.error ?? 'No se pudo enviar')
        }
      } catch {
        // Sigue sin haber señal: se deja para el próximo intento.
        marcarIntentoFallido(parte.id, 'Sin conexión')
        break
      }
    }

    setEnviando(false)
    refrescar()

    if (enviados > 0) {
      avisos.correcto(
        `${plural(enviados, 'parte enviado', 'partes enviados')} al volver la señal`,
      )
      router.refresh()
    }
  }, [enviando, refrescar, avisos, router])

  useEffect(() => {
    refrescar()
    setConexion(hayConexion())

    const alVolver = () => {
      setConexion(true)
      void enviarTodo()
    }
    const alCaerse = () => setConexion(false)

    window.addEventListener('online', alVolver)
    window.addEventListener('offline', alCaerse)

    // Al abrir la app, si hay pendientes y señal, se intenta enseguida.
    if (hayConexion()) void enviarTodo()

    return () => {
      window.removeEventListener('online', alVolver)
      window.removeEventListener('offline', alCaerse)
    }
  }, [refrescar, enviarTodo])

  if (cola.length === 0 && conexion) return null

  return (
    <>
      <button
        type="button"
        onClick={() => (cola.length > 0 ? setAbierta(true) : undefined)}
        className={cn(
          'fixed inset-x-0 z-40 flex items-center justify-center gap-2 py-1.5 text-micro font-medium text-blanco',
          cola.length > 0 ? 'bg-[var(--color-aviso-texto)]' : 'bg-grafito',
        )}
        style={{ top: 'calc(var(--alto-header) + env(safe-area-inset-top, 0px))' }}
      >
        {cola.length > 0 ? (
          <>
            <Upload
              aria-hidden
              className={cn('size-3.5', enviando && 'animate-pulse')}
            />
            {enviando
              ? 'Enviando el parte…'
              : `${plural(cola.length, 'parte pendiente', 'partes pendientes')} de envío`}
          </>
        ) : (
          <>
            <CloudOff aria-hidden className="size-3.5" />
            Sin conexión
          </>
        )}
      </button>

      <HojaInferior
        abierta={abierta}
        alCerrar={() => setAbierta(false)}
        titulo="Partes pendientes de envío"
        descripcion="Se envían solos cuando haya señal"
        pie={
          <Boton
            ancho
            cargando={enviando}
            disabled={!conexion}
            iconoIzquierda={<RefreshCw aria-hidden className="size-4" />}
            onClick={enviarTodo}
          >
            {conexion ? 'Intentar ahora' : 'Sin conexión'}
          </Boton>
        }
      >
        <div className="divide-y divide-niebla">
          {cola.map((p) => (
            <div key={p.id} className="py-3">
              <p className="text-base font-medium text-negro">
                Parte del {fechaCorta(new Date(`${p.fecha}T00:00:00`))}
              </p>
              <p className="text-menor text-grafito">
                {plural(p.lineas.length, 'persona')} · guardado{' '}
                {fechaCorta(new Date(p.guardadoEn))}
              </p>
              {p.ultimoError && (
                <p className="mt-1 text-menor text-critico">
                  {p.intentos > 0 &&
                    `${plural(p.intentos, 'intento')}: `}
                  {p.ultimoError}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 border-t border-niebla pt-3 text-menor text-metadato">
          El parte quedó guardado en este teléfono. No lo borres ni cierres
          sesión hasta que se envíe.
        </p>
      </HojaInferior>
    </>
  )
}
