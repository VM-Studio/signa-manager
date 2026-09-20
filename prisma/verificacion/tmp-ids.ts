import './sin-server-only'
import { db } from '../../src/lib/db'
async function main() {
  const [h, e, s, v, o, viaje] = await Promise.all([
    db.herramienta.findFirst({ where: { estado: 'EN_OBRA' }, select: { id: true } }),
    db.empleado.findFirst({ where: { activo: true }, select: { id: true } }),
    db.subcontratista.findFirst({ select: { id: true } }),
    db.vehiculo.findFirst({ select: { id: true } }),
    db.obra.findFirst({ where: { estado: 'EN_CURSO' }, select: { id: true } }),
    db.viaje.findFirst({ select: { id: true } }),
  ])
  console.log(JSON.stringify({ herramienta: h?.id, empleado: e?.id, subcontratista: s?.id, vehiculo: v?.id, obra: o?.id, viaje: viaje?.id }))
  await db.$disconnect()
}
main()
