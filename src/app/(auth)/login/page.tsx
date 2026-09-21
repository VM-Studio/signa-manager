import Image from 'next/image'
import type { Metadata } from 'next'
import { FormularioLogin } from './FormularioLogin'
import { CLAVE_DEMO, listarUsuariosDemo, modoDemo } from './usuarios-demo'

export const metadata: Metadata = { title: 'Ingresar · Signa' }

/* =====================================================================
   Entrada a la app.

   En celular, el logo arriba y el formulario debajo, sobre negro, como
   estaba. En escritorio se parte en dos: la mitad izquierda negra con
   solo el logo grande —que es la marca— y la derecha clara con el
   formulario, que es donde va la atención.
   ===================================================================== */

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volverA?: string }>
}) {
  const { volverA } = await searchParams
  const demo = modoDemo()
  const usuariosDemo = demo ? await listarUsuariosDemo() : []

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* ------------------------- la marca ------------------------- */}
      <div className="sobre-negro flex shrink-0 flex-col items-center justify-center bg-negro px-6 pt-12 pb-8 lg:w-1/2 lg:px-16 lg:py-0">
        <div className="pad-arriba-seguro lg:hidden" />

        {/* El logo va solo y centrado. Antes estaba alineado a la
            izquierda dentro de una caja de 420px porque debajo iba una
            frase; sacada la frase, esa caja lo dejaba descentrado. */}
        <Image
          src="/signalogo.png"
          alt="Signa"
          width={320}
          height={180}
          priority
          className="w-[160px] lg:w-[280px]"
        />
      </div>

      {/* ----------------------- el formulario ---------------------- */}
      <div className="flex flex-1 flex-col items-center justify-center bg-negro px-6 pb-12 lg:bg-hueso lg:px-16 lg:py-12">
        <div className="w-full max-w-[400px]">
          <h1 className="mb-6 hidden text-cifra font-medium text-negro lg:block">
            Ingresar
          </h1>

          <FormularioLogin
            volverA={volverA}
            usuariosDemo={usuariosDemo}
            claveDemo={CLAVE_DEMO}
          />
        </div>

        <div className="pad-abajo-seguro lg:hidden" />
      </div>
    </main>
  )
}
