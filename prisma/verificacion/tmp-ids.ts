import './sin-server-only'
import { db } from '../../src/lib/db'
async function main() {
  const p = await db.parteDiario.findFirst({
    where: { estado: 'BORRADOR' },
    select: { obraId: true, fecha: true },
  })
  const q = await db.quincena.findFirst({ select: { id: true } })
  const sol = await db.solicitudViaje.findFirst({ where: { estado: 'PENDIENTE' }, select: { id: true } })
  const ale = await db.alerta.findFirst({ where: { estado: 'ABIERTA' }, select: { id: true } })
  const obraConParte = await db.parteDiario.findFirst({ select: { obraId: true, fecha: true }, orderBy: { fecha: 'desc' } })
  console.log(JSON.stringify({
    parteBorrador: p ? `/personal/partes/nuevo?obra=${p.obraId}&fecha=${p.fecha.toISOString().slice(0,10)}` : null,
    parteCualquiera: obraConParte ? `/personal/partes/nuevo?obra=${obraConParte.obraId}&fecha=${obraConParte.fecha.toISOString().slice(0,10)}` : null,
    quincena: q?.id, solicitudViaje: sol?.id, alerta: ale?.id,
  }))
  await db.$disconnect()
}
main()
