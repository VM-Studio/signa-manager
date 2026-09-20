'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

/* =====================================================================
   El puente entre cada pantalla y la barra superior de escritorio.

   En el celular, EncabezadoPantalla se dibuja donde está, con su botón
   de volver. En escritorio ese mismo encabezado tiene que aparecer
   arriba de todo, junto a la campana de alertas, que es global y vive
   en el layout.

   En vez de duplicar el encabezado en cada pantalla, cada pantalla
   publica acá lo suyo (título, subtítulo y acciones) y la barra
   superior lo muestra. Una sola fuente, un solo componente por
   pantalla.
   ===================================================================== */

export interface Encabezado {
  titulo: string
  subtitulo?: string
  /** Para la miga de pan: de dónde viene esta pantalla. */
  volverA?: string
  acciones?: ReactNode
}

interface Contexto {
  encabezado: Encabezado | null
  publicar: (e: Encabezado | null) => void
}

const ContextoEncabezado = createContext<Contexto>({
  encabezado: null,
  publicar: () => {},
})

export function ProveedorEncabezado({ children }: { children: ReactNode }) {
  const [encabezado, setEncabezado] = useState<Encabezado | null>(null)

  const publicar = useCallback((e: Encabezado | null) => {
    setEncabezado(e)
  }, [])

  const valor = useMemo(
    () => ({ encabezado, publicar }),
    [encabezado, publicar],
  )

  return (
    <ContextoEncabezado.Provider value={valor}>
      {children}
    </ContextoEncabezado.Provider>
  )
}

export function useEncabezado() {
  return useContext(ContextoEncabezado)
}
