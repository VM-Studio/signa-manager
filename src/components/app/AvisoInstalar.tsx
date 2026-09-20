'use client'

import { useEffect, useState } from 'react'
import { Share, SquarePlus, X } from 'lucide-react'
import { Boton, HojaInferior } from '@/components/ui'

/* =====================================================================
   Invitación a instalar la app.

   En Android el navegador ofrece instalar solo, con el evento
   beforeinstallprompt. En iPhone no existe ese evento: hay que
   explicarle a la persona que vaya al menú Compartir de Safari, que es
   lo que nadie encuentra.
   ===================================================================== */

const CLAVE = 'signa_instalar_descartado'

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function AvisoInstalar() {
  const [visible, setVisible] = useState(false)
  const [esIphone, setEsIphone] = useState(false)
  const [instrucciones, setInstrucciones] = useState(false)
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)

  useEffect(() => {
    // Si ya está instalada, no hay nada que ofrecer.
    const yaInstalada =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    if (yaInstalada) return

    try {
      if (localStorage.getItem(CLAVE) === '1') return
    } catch {
      // Sin almacenamiento se ofrece igual.
    }

    const ua = window.navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(ua)
    setEsIphone(iOS)

    if (iOS) {
      // En iPhone no hay evento: se ofrece después de un rato, para no
      // molestar apenas entra.
      const t = setTimeout(() => setVisible(true), 8000)
      return () => clearTimeout(t)
    }

    const alPoderInstalar = (e: Event) => {
      e.preventDefault()
      setEvento(e as EventoInstalacion)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', alPoderInstalar)
    return () =>
      window.removeEventListener('beforeinstallprompt', alPoderInstalar)
  }, [])

  const descartar = () => {
    setVisible(false)
    setInstrucciones(false)
    try {
      localStorage.setItem(CLAVE, '1')
    } catch {
      /* no pasa nada */
    }
  }

  const instalar = async () => {
    if (esIphone) {
      setInstrucciones(true)
      return
    }
    if (!evento) return
    await evento.prompt()
    const { outcome } = await evento.userChoice
    if (outcome === 'accepted') descartar()
    else setVisible(false)
  }

  /*
   * Mientras la franja está a la vista, el contenido de la página se
   * corre otro tanto hacia arriba. Antes tapaba el final del inicio: el
   * aviso para instalar no puede comerse información de verdad.
   *
   * Se publica como variable en el <html> y la usa el padding de abajo
   * del layout, así no hace falta que ningún componente sepa de esto.
   */
  useEffect(() => {
    const raiz = document.documentElement
    if (visible) raiz.style.setProperty('--alto-aviso-instalar', '60px')
    else raiz.style.removeProperty('--alto-aviso-instalar')

    return () => {
      raiz.style.removeProperty('--alto-aviso-instalar')
    }
  }, [visible])

  if (!visible) return null

  return (
    <>
      {/* Franja discreta arriba de la barra inferior. Nunca en escritorio:
          la app se instala en el teléfono, no en la computadora. */}
      <div className="fixed inset-x-0 bottom-[calc(var(--alto-barra-inferior)+env(safe-area-inset-bottom,0px))] z-40 px-4 pb-2 lg:hidden">
        <div className="mx-auto flex max-w-[var(--ancho-operativo)] items-center gap-2 rounded-[var(--radius-control)] border border-niebla bg-blanco px-3 py-2.5 shadow-sm">
          <SquarePlus
            aria-hidden
            className="size-5 shrink-0 text-grafito"
            strokeWidth={1.75}
          />
          <p className="min-w-0 flex-1 text-menor text-grafito">
            Instalá Signa en el teléfono y entrás de un toque.
          </p>
          <Boton tamano="chico" onClick={instalar}>
            Instalar
          </Boton>
          <button
            type="button"
            onClick={descartar}
            aria-label="No mostrar más"
            className="flex size-8 shrink-0 items-center justify-center rounded text-metadato active:bg-hueso"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {/* En iPhone, las instrucciones que nadie encuentra solo. */}
      <HojaInferior
        abierta={instrucciones}
        alCerrar={descartar}
        titulo="Instalar en el iPhone"
        descripcion="Son tres pasos, una sola vez"
        pie={
          <Boton ancho onClick={descartar}>
            Entendido
          </Boton>
        }
      >
        <ol className="space-y-4">
          {[
            {
              icono: <Share aria-hidden className="size-5" />,
              texto: (
                <>
                  Tocá el botón <strong>Compartir</strong> de Safari: es el
                  cuadradito con la flecha para arriba, abajo en el centro de
                  la pantalla.
                </>
              ),
            },
            {
              icono: <SquarePlus aria-hidden className="size-5" />,
              texto: (
                <>
                  Deslizá hacia abajo y tocá{' '}
                  <strong>“Agregar a inicio”</strong>.
                </>
              ),
            },
            {
              icono: <span aria-hidden className="text-base font-bold">3</span>,
              texto: (
                <>
                  Tocá <strong>Agregar</strong>. El ícono de Signa queda en la
                  pantalla de inicio como cualquier otra app.
                </>
              ),
            },
          ].map((paso, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-niebla text-grafito">
                {paso.icono}
              </span>
              <p className="pt-1.5 text-base text-grafito">{paso.texto}</p>
            </li>
          ))}
        </ol>

        <p className="mt-4 border-t border-niebla pt-3 text-menor text-metadato">
          Tiene que ser desde Safari. Si estás en Chrome, abrí la página en
          Safari primero.
        </p>
      </HojaInferior>
    </>
  )
}
