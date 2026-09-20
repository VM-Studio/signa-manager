'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/* =====================================================================
   Aviso tipo toast.
   Aparece abajo, encima de la barra inferior, y se va solo. Se usa para
   confirmar que una acción salió bien ("Herramienta entregada") o para
   avisar de un error que no corresponde a un campo.
   ===================================================================== */

export type TonoAviso = 'correcto' | 'aviso' | 'critico' | 'neutro'

interface Aviso {
  id: number
  tono: TonoAviso
  mensaje: string
}

interface ContextoAvisos {
  mostrar: (mensaje: string, tono?: TonoAviso) => void
  correcto: (mensaje: string) => void
  error: (mensaje: string) => void
}

const Contexto = createContext<ContextoAvisos | null>(null)

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const mostrar = useCallback((mensaje: string, tono: TonoAviso = 'neutro') => {
    const id = Date.now() + Math.random()
    setAvisos((previos) => [...previos, { id, tono, mensaje }])
  }, [])

  const valor = useMemo<ContextoAvisos>(
    () => ({
      mostrar,
      correcto: (m: string) => mostrar(m, 'correcto'),
      error: (m: string) => mostrar(m, 'critico'),
    }),
    [mostrar],
  )

  const cerrar = useCallback((id: number) => {
    setAvisos((previos) => previos.filter((a) => a.id !== id))
  }, [])

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(var(--alto-barra-inferior)+16px)]"
        role="status"
        aria-live="polite"
      >
        {avisos.map((a) => (
          <TarjetaAviso key={a.id} aviso={a} alCerrar={() => cerrar(a.id)} />
        ))}
      </div>
    </Contexto.Provider>
  )
}

export function useAvisos(): ContextoAvisos {
  const ctx = useContext(Contexto)
  if (!ctx) {
    throw new Error('useAvisos necesita estar dentro de <ProveedorAvisos>')
  }
  return ctx
}

const estilos: Record<TonoAviso, string> = {
  neutro: 'bg-carbon text-blanco',
  correcto: 'bg-correcto text-blanco',
  aviso: 'bg-aviso text-blanco',
  critico: 'bg-critico text-blanco',
}

const iconos: Record<TonoAviso, ReactNode> = {
  neutro: <Info aria-hidden className="size-4 shrink-0" />,
  correcto: <CheckCircle2 aria-hidden className="size-4 shrink-0" />,
  aviso: <AlertTriangle aria-hidden className="size-4 shrink-0" />,
  critico: <XCircle aria-hidden className="size-4 shrink-0" />,
}

function TarjetaAviso({
  aviso,
  alCerrar,
}: {
  aviso: Aviso
  alCerrar: () => void
}) {
  // Los errores se quedan más tiempo: hay que poder leerlos.
  const duracion = aviso.tono === 'critico' ? 6000 : 3500

  useEffect(() => {
    const t = setTimeout(alCerrar, duracion)
    return () => clearTimeout(t)
  }, [alCerrar, duracion])

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-[var(--ancho-operativo)] items-center gap-2.5',
        'rounded-[var(--radius-control)] px-3.5 py-3 text-base shadow-sm',
        estilos[aviso.tono],
      )}
      style={{ animation: 'aviso-entra 180ms ease-out' }}
    >
      {iconos[aviso.tono]}
      <span className="flex-1">{aviso.mensaje}</span>
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar aviso"
        className="sobre-negro -mr-1 flex size-7 shrink-0 items-center justify-center rounded opacity-80"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------------
   Aviso fijo dentro de una pantalla (no desaparece): se usa para avisar
   que la sincronización está atrasada, que falta documentación, etc.
   --------------------------------------------------------------------- */

export function AvisoFijo({
  tono = 'aviso',
  titulo,
  children,
  className,
}: {
  tono?: TonoAviso
  titulo?: string
  children: ReactNode
  className?: string
}) {
  const fondos: Record<TonoAviso, string> = {
    neutro: 'bg-hueso text-grafito border-niebla',
    correcto: 'bg-[var(--color-correcto-suave)] text-correcto border-[color-mix(in_srgb,var(--color-correcto)_25%,transparent)]',
    aviso: 'bg-[var(--color-aviso-suave)] text-aviso border-[color-mix(in_srgb,var(--color-aviso)_25%,transparent)]',
    critico: 'bg-[var(--color-critico-suave)] text-critico border-[color-mix(in_srgb,var(--color-critico)_25%,transparent)]',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--radius-control)] border px-3.5 py-3',
        fondos[tono],
        className,
      )}
    >
      {iconos[tono]}
      <div className="min-w-0 flex-1 text-chico">
        {titulo && <p className="font-medium">{titulo}</p>}
        <div className={cn(titulo && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  )
}
