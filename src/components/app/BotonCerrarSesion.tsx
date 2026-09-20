'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { Boton, HojaConfirmacion } from '@/components/ui'
import { accionCerrarSesion } from '@/app/(app)/acciones-sesion'

export function BotonCerrarSesion() {
  const [confirmar, setConfirmar] = useState(false)
  const [pendiente, empezar] = useTransition()

  return (
    <>
      <Boton
        variante="secundario"
        ancho
        iconoIzquierda={<LogOut aria-hidden className="size-4" />}
        onClick={() => setConfirmar(true)}
      >
        Cerrar sesión
      </Boton>

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
