'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { Boton, HojaConfirmacion } from '@/components/ui'
import { accionCerrarSesion } from '@/app/(app)/acciones-sesion'

export function BotonCerrarSesion({
  /** En la barra lateral negra: sin fondo blanco y sin ocupar tanto. */
  compacto = false,
}: {
  compacto?: boolean
} = {}) {
  const [confirmar, setConfirmar] = useState(false)
  const [pendiente, empezar] = useTransition()

  return (
    <>
      {compacto ? (
        <button
          type="button"
          onClick={() => setConfirmar(true)}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-acero transition-colors hover:bg-carbon hover:text-blanco"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      ) : (
        <Boton
          variante="secundario"
          ancho
          iconoIzquierda={<LogOut aria-hidden className="size-4" />}
          onClick={() => setConfirmar(true)}
        >
          Cerrar sesión
        </Boton>
      )}

      <HojaConfirmacion
        abierta={confirmar}
        alCerrar={() => setConfirmar(false)}
        alConfirmar={() => empezar(() => { void accionCerrarSesion() })}
        titulo="¿Cerrar sesión?"
        mensaje="Vas a tener que volver a escribir tu email y tu contraseña para entrar."
        textoConfirmar="Cerrar sesión"
        cargando={pendiente}
      />
    </>
  )
}
