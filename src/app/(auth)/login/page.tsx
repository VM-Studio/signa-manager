import Image from 'next/image'
import type { Metadata } from 'next'
import { FormularioLogin } from './FormularioLogin'
import { CLAVE_DEMO, listarUsuariosDemo, modoDemo } from './usuarios-demo'

export const metadata: Metadata = { title: 'Ingresar · Signa' }

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volverA?: string }>
}) {
  const { volverA } = await searchParams
  const demo = modoDemo()
  const usuariosDemo = demo ? await listarUsuariosDemo() : []

  return (
    <main className="sobre-negro flex min-h-dvh flex-col items-center justify-center bg-negro px-6 py-12">
      <div className="pad-arriba-seguro" />

      <Image
        src="/signalogo.png"
        alt="Signa"
        width={160}
        height={90}
        priority
        className="mb-10 w-[160px]"
      />

      <FormularioLogin
        volverA={volverA}
        usuariosDemo={usuariosDemo}
        claveDemo={CLAVE_DEMO}
      />

      <div className="pad-abajo-seguro" />
    </main>
  )
}
