'use client'

import { Printer } from 'lucide-react'
import { Boton } from '@/components/ui'

export function BotonImprimir() {
  return (
    <div className="space-y-2">
      <Boton
        ancho
        tamano="grande"
        iconoIzquierda={<Printer aria-hidden className="size-5" />}
        onClick={() => window.print()}
      >
        Imprimir o guardar como PDF
      </Boton>
      <p className="text-center text-menor text-acero">
        En el diálogo de impresión elegí “Guardar como PDF”. Sale apaisado y
        con el logo.
      </p>
    </div>
  )
}
