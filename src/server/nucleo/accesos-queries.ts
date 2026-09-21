import 'server-only'

import { db } from '@/lib/db'

/* =====================================================================
   Lectura de los accesos, para la pantalla de Accesos.

   Va en un archivo aparte y NO en configuracion.ts: ese tiene
   'use server' en la primera línea, y ahí toda función exportada queda
   publicada como Server Action, o sea invocable desde el navegador por
   cualquiera. Una consulta que devuelve la lista de usuarios no tiene
   por qué ser un endpoint.
   ===================================================================== */

export async function listarAccesos() {
  const usuarios = await db.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      ultimoAcceso: true,
      accesos: { select: { modulo: true, permitido: true } },
    },
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
  })

  return usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo,
    ultimoAcceso: u.ultimoAcceso,
    accesos: Object.fromEntries(
      u.accesos.map((a) => [a.modulo, a.permitido]),
    ) as Record<string, boolean>,
  }))
}

export type UsuarioConAccesos = Awaited<
  ReturnType<typeof listarAccesos>
>[number]
