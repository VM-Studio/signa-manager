'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

/* =====================================================================
   Splash de inicio.

   Es el único momento de animación protagonista de toda la app, así que
   está hecho a mano y no con una librería: pantalla negra, el logo que
   entra con un fundido y una barra que avanza de 0 a 100% en 1,8s con
   una curva que arranca rápido y frena al final.

   Se muestra una sola vez por sesión del navegador. Si la persona
   prefiere movimiento reducido, se muestra el logo medio segundo y
   listo.
   ===================================================================== */

const CLAVE_SESION = 'signa_splash_visto'
const DURACION_BARRA = 1800
const DURACION_SALIDA = 400
const DURACION_REDUCIDA = 500

export function Splash({ children }: { children: React.ReactNode }) {
  // Arranca en null: hasta no saber si ya se vio, no se decide nada.
  const [mostrar, setMostrar] = useState<boolean | null>(null)
  const [saliendo, setSaliendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const cuadro = useRef<number | null>(null)

  useEffect(() => {
    let yaVisto = false
    try {
      yaVisto = sessionStorage.getItem(CLAVE_SESION) === '1'
    } catch {
      // Navegación privada o almacenamiento bloqueado: se muestra igual.
    }

    if (yaVisto) {
      setMostrar(false)
      return
    }

    setMostrar(true)

    const movimientoReducido = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const terminar = () => {
      try {
        sessionStorage.setItem(CLAVE_SESION, '1')
      } catch {
        /* sin almacenamiento, se vuelve a ver: no es grave */
      }
      setSaliendo(true)
      setTimeout(() => setMostrar(false), DURACION_SALIDA)
    }

    if (movimientoReducido) {
      setProgreso(1)
      const t = setTimeout(terminar, DURACION_REDUCIDA)
      return () => clearTimeout(t)
    }

    // Curva que arranca rápido y frena al final (ease-out cúbica).
    const curva = (t: number) => 1 - Math.pow(1 - t, 3)
    const arranque = performance.now()

    const avanzar = (ahora: number) => {
      const t = Math.min(1, (ahora - arranque) / DURACION_BARRA)
      setProgreso(curva(t))
      if (t < 1) {
        cuadro.current = requestAnimationFrame(avanzar)
      } else {
        terminar()
      }
    }

    cuadro.current = requestAnimationFrame(avanzar)
    return () => {
      if (cuadro.current !== null) cancelAnimationFrame(cuadro.current)
    }
  }, [])

  // Mientras no se sabe, se pinta el fondo negro y nada más: así no hay
  // ningún destello de la app antes del splash.
  if (mostrar === null) {
    return <div className="fixed inset-0 z-[100] bg-negro" aria-hidden />
  }

  return (
    <>
      {children}
      {mostrar && (
        <div
          role="status"
          aria-label="Iniciando Signa"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-negro transition-opacity ease-out"
          style={{
            opacity: saliendo ? 0 : 1,
            transitionDuration: `${DURACION_SALIDA}ms`,
          }}
        >
          <Image
            src="/signalogo.png"
            alt="Signa"
            width={180}
            height={101}
            priority
            className="w-[180px]"
            style={{ animation: 'fundido-entra 500ms ease-out both' }}
          />

          {/* Pista de 180px por 2px, con el relleno en blanco. */}
          <div
            aria-hidden
            className="mt-10 h-[2px] w-[180px] overflow-hidden bg-[#2a2a2a]"
          >
            <div
              className="h-full bg-blanco"
              style={{ width: `${progreso * 100}%` }}
            />
          </div>
        </div>
      )}
    </>
  )
}
