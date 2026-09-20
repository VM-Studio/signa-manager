import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sin conexión · Signa' }

/**
 * Lo que se ve cuando no hay señal y la página pedida no está en caché.
 * Pasa seguido: muchas obras no tienen cobertura.
 */
export default function SinConexion() {
  return (
    <main className="sobre-negro flex min-h-dvh flex-col items-center justify-center gap-6 bg-negro px-8 text-center">
      <Image
        src="/signalogo.png"
        alt="Signa"
        width={160}
        height={90}
        priority
        className="w-[160px]"
      />

      <div>
        <h1 className="text-titulo font-medium text-blanco">
          No hay conexión
        </h1>
        <p className="mt-2 text-base text-acero">
          Estás sin señal. Cuando vuelva, esta pantalla se actualiza sola.
        </p>
      </div>

      <div className="w-full max-w-[300px] rounded-[var(--radius-panel)] border border-[#262626] p-4 text-left">
        <p className="text-chico text-acero">
          Si estabas cargando un parte diario, tu borrador quedó guardado en
          el teléfono. Se va a enviar solo apenas haya señal.
        </p>
      </div>

      <a
        href="/inicio"
        className="sobre-negro inline-flex min-h-[48px] items-center rounded-[var(--radius-control)] border border-[#333] px-4 text-base font-medium text-blanco"
      >
        Reintentar
      </a>
    </main>
  )
}
