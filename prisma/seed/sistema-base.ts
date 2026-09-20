/* =====================================================================
   Seed · SISTEMA BASE (tablas espejo)
   Lo que en producción va a traer la sincronización desde Lebane o Sorby.
   Acá se carga con fuente "mock" para que el tablero tenga con qué
   trabajar desde el primer día.

   Regla de oro de CLAUDE.md: esta app nunca edita estas tablas. Solo las
   escribe la sincronización y solo las lee el tablero.
   ===================================================================== */

import {
  type Prisma,
  CategoriaCostoExterno,
  EstadoParte,
  EstadoPedidoCompra,
  EstadoSync,
  Moneda,
  PrismaClient,
  TipoMovimientoExterno,
} from '@prisma/client'
import type { ContextoNucleo } from './nucleo'
import {
  chance,
  diasAdelante,
  diasAtras,
  entero,
  fechaEntre,
  hoy,
  mesesAtras,
  paso,
  plata,
  redondearMiles,
  titulo,
  uno,
} from './comun'

const FUENTE = 'mock'

/** Tipo de cambio del período, para los movimientos en dólares. */
const TIPO_CAMBIO = 1_640

const PROVEEDORES_MATERIALES = [
  'Hierromat S.A.', 'Corralón Norte', 'Loma Negra Distribuidora',
  'Cerámica San Lorenzo', 'Aberturas del Plata', 'Sanitarios FV Norte',
  'Pinturería Colorín Pilar', 'Hormigonera Lomax', 'Maderera Tigre',
  'Electro Norte Insumos',
]

const PROVEEDORES_SUBCONTRATOS = [
  'Electricidad Maidana S.R.L.', 'Sanitarios del Norte',
  'Yesería Hermanos Cáceres', 'Herrería Pilar S.A.', 'Pinturas Delta',
  'Excavaciones Benavídez', 'Climatización Integral S.R.L.',
]

const PROVEEDORES_EQUIPOS = [
  'Alquileres Viales S.A.', 'Grúas del Norte', 'Bombas de Hormigón Delta',
  'Andamios Pilar', 'Volquetes del Norte',
]

/** Cuánto pesa cada rubro del costo externo de una obra. */
const MEZCLA_COSTO: Array<{ categoria: CategoriaCostoExterno; peso: number; proveedores: readonly string[] }> = [
  { categoria: CategoriaCostoExterno.MATERIALES, peso: 0.52, proveedores: PROVEEDORES_MATERIALES },
  { categoria: CategoriaCostoExterno.SUBCONTRATOS, peso: 0.3, proveedores: PROVEEDORES_SUBCONTRATOS },
  { categoria: CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES, peso: 0.11, proveedores: PROVEEDORES_EQUIPOS },
  { categoria: CategoriaCostoExterno.HONORARIOS, peso: 0.04, proveedores: ['Estudio Lezama Arquitectos', 'Ingeniería Estructural Paz'] },
  { categoria: CategoriaCostoExterno.IMPUESTOS_Y_TASAS, peso: 0.03, proveedores: ['Municipalidad', 'ARBA', 'ARCA'] },
]

export async function sembrarSistemaBase(
  db: PrismaClient,
  nucleo: ContextoNucleo,
): Promise<void> {
  titulo('Sistema base · tablas espejo')

  let idExterno = 10_000
  const siguienteId = () => `MV-${++idExterno}`

  /* ------------------------------------------------------------------
     El costo de una obra no es solo lo que registra el sistema base.
     Esta app aporta mano de obra, viajes y herramientas, y el tablero
     los suma. Si los ingresos se calibraran solo contra los egresos
     externos, todas las obras darían pérdida apenas se sume la mano de
     obra. Así que primero se mide lo que ya cargó la app y después se
     fijan los ingresos sobre el costo completo.
     ------------------------------------------------------------------ */

  // Los partes cubren los últimos 45 días hábiles ≈ 2,1 meses.
  const MESES_CON_PARTES = 2.1

  const manoObraPorObra = new Map<string, number>()
  const lineas = await db.parteDiarioLinea.groupBy({
    by: ['parteId'],
    _sum: { costoCalculado: true },
    where: { parte: { estado: EstadoParte.APROBADO } },
  })
  const partes = await db.parteDiario.findMany({
    where: { estado: EstadoParte.APROBADO },
    select: { id: true, obraId: true },
  })
  const obraDelParte = new Map(partes.map((p) => [p.id, p.obraId]))
  for (const l of lineas) {
    const obraId = obraDelParte.get(l.parteId)
    if (!obraId) continue
    manoObraPorObra.set(
      obraId,
      (manoObraPorObra.get(obraId) ?? 0) + Number(l._sum.costoCalculado ?? 0),
    )
  }

  // Viajes y herramientas suman alrededor de un 30% más sobre la mano de
  // obra. Es una estimación para calibrar los ingresos del seed, no un
  // cálculo del tablero: ese sale de los datos reales.
  const FACTOR_VIAJES_Y_HERRAMIENTAS = 1.3

  /** Costo mensual que aporta esta app para una obra. Cero si no tiene partes. */
  const costoAppMensual = (obraId: string): number => {
    const manoObra = manoObraPorObra.get(obraId) ?? 0
    return (manoObra / MESES_CON_PARTES) * FACTOR_VIAJES_Y_HERRAMIENTAS
  }

  /**
   * Cuánto gasta y cuánto cobra cada obra por mes, y con qué margen.
   * Dos obras quedan en rojo a propósito: el tablero tiene que poder
   * mostrar que no todo lo que se factura deja ganancia.
   */
  const PERFIL_OBRAS: Array<{
    clave: keyof ContextoNucleo['obras']
    egresoMensual: number
    margen: number
    mesesActiva: number
    tipoIngreso: CategoriaCostoExterno
    enDolares?: boolean
  }> = [
    { clave: 'losRobles', egresoMensual: 28_500_000, margen: 0.19, mesesActiva: 6, tipoIngreso: CategoriaCostoExterno.VENTA_UNIDAD, enDolares: true },
    { clave: 'santaRita', egresoMensual: 31_200_000, margen: 0.17, mesesActiva: 6, tipoIngreso: CategoriaCostoExterno.COBRO_CLIENTE },
    { clave: 'torreAlvear', egresoMensual: 44_800_000, margen: 0.22, mesesActiva: 6, tipoIngreso: CategoriaCostoExterno.VENTA_UNIDAD, enDolares: true },
    { clave: 'cordoba', egresoMensual: 12_800_000, margen: 0.13, mesesActiva: 3, tipoIngreso: CategoriaCostoExterno.COBRO_CLIENTE },
    { clave: 'neuquen', egresoMensual: 24_600_000, margen: 0.18, mesesActiva: 2, tipoIngreso: CategoriaCostoExterno.COBRO_CLIENTE },
    // La colectora es la obra que se va de presupuesto: margen negativo.
    { clave: 'colectora', egresoMensual: 26_300_000, margen: -0.06, mesesActiva: 6, tipoIngreso: CategoriaCostoExterno.COBRO_CLIENTE },
    { clave: 'uruguay', egresoMensual: 18_200_000, margen: 0.24, mesesActiva: 3, tipoIngreso: CategoriaCostoExterno.VENTA_UNIDAD, enDolares: true },
    // El galpón está pausado: se sigue gastando poco y no entra nada.
    { clave: 'garin', egresoMensual: 3_100_000, margen: -0.4, mesesActiva: 5, tipoIngreso: CategoriaCostoExterno.COBRO_CLIENTE },
    { clave: 'alq1', egresoMensual: 320_000, margen: 1.6, mesesActiva: 6, tipoIngreso: CategoriaCostoExterno.ALQUILER_TEMPORARIO },
    { clave: 'alq2', egresoMensual: 240_000, margen: 1.8, mesesActiva: 6, tipoIngreso: CategoriaCostoExterno.ALQUILER_TEMPORARIO },
    { clave: 'alq3', egresoMensual: 210_000, margen: 1.4, mesesActiva: 6, tipoIngreso: CategoriaCostoExterno.ALQUILER_TEMPORARIO },
  ]

  const movimientos: Prisma.MovimientoExternoCreateManyInput[] = []

  for (const perfil of PERFIL_OBRAS) {
    const obra = nucleo.obras[perfil.clave]
    if (!obra) continue

    for (let mes = perfil.mesesActiva - 1; mes >= 0; mes--) {
      const desde = mesesAtras(mes + 1)
      const hasta = mes === 0 ? hoy() : mesesAtras(mes)
      // El mes en curso va por la mitad.
      const factorMes = mes === 0 ? 0.55 : 1
      const egresoDelMes = perfil.egresoMensual * factorMes

      // ------------------------- egresos -------------------------
      for (const rubro of MEZCLA_COSTO) {
        const totalRubro = egresoDelMes * rubro.peso
        // Cada rubro entra en varias facturas, no en una sola.
        const cantidadFacturas = Math.max(1, Math.round(totalRubro / 4_500_000))
        for (let f = 0; f < cantidadFacturas; f++) {
          const monto = redondearMiles(
            (totalRubro / cantidadFacturas) * (0.75 + Math.random() * 0.5),
            1_000,
          )
          if (monto <= 0) continue
          movimientos.push({
            idExterno: siguienteId(),
            fuente: FUENTE,
            tipo: TipoMovimientoExterno.EGRESO,
            categoria: rubro.categoria,
            fecha: fechaEntre(desde, hasta),
            descripcion:
              rubro.categoria === CategoriaCostoExterno.MATERIALES
                ? uno(['Hierro y malla', 'Cemento, cal y arena', 'Ladrillos y bloques', 'Aberturas', 'Instalación sanitaria', 'Cerámicos y porcelanatos', 'Pintura y revestimientos', 'Hormigón elaborado'])
                : rubro.categoria === CategoriaCostoExterno.SUBCONTRATOS
                  ? 'Certificado de avance de subcontrato'
                  : rubro.categoria === CategoriaCostoExterno.EQUIPOS_Y_ALQUILERES
                    ? uno(['Alquiler de bomba de hormigón', 'Alquiler de grúa', 'Volquetes del mes', 'Alquiler de andamios'])
                    : rubro.categoria === CategoriaCostoExterno.HONORARIOS
                      ? 'Honorarios profesionales'
                      : 'Tasas y derechos de construcción',
            proveedor: uno(rubro.proveedores),
            monto: plata(monto),
            moneda: Moneda.ARS,
            obraId: obra.id,
          })
        }
      }

      // ------------------------- ingresos ------------------------
      // El ingreso se fija sobre el costo COMPLETO del mes: lo que gastó
      // el sistema base más lo que registró esta app. Los partes solo
      // cubren los últimos meses, así que antes de eso no hay qué sumar.
      const costoApp = mes < MESES_CON_PARTES ? costoAppMensual(obra.id) * factorMes : 0
      const costoDelMes = egresoDelMes + costoApp
      const ingresoDelMes = costoDelMes * (1 + perfil.margen)
      if (ingresoDelMes > 0) {
        // Las ventas de unidades se escrituran en dólares.
        const enDolares = perfil.enDolares === true && chance(0.7)
        if (enDolares) {
          const montoUsd = Math.round(ingresoDelMes / TIPO_CAMBIO)
          movimientos.push({
            idExterno: siguienteId(),
            fuente: FUENTE,
            tipo: TipoMovimientoExterno.INGRESO,
            categoria: perfil.tipoIngreso,
            fecha: fechaEntre(desde, hasta),
            descripcion: 'Escrituración de unidad',
            proveedor: null,
            monto: plata(montoUsd),
            moneda: Moneda.USD,
            tipoCambio: plata(TIPO_CAMBIO),
            obraId: obra.id,
          })
        } else {
          // Los cobros a clientes entran en dos o tres certificados.
          const partes = entero(1, 3)
          for (let p = 0; p < partes; p++) {
            movimientos.push({
              idExterno: siguienteId(),
              fuente: FUENTE,
              tipo: TipoMovimientoExterno.INGRESO,
              categoria: perfil.tipoIngreso,
              fecha: fechaEntre(desde, hasta),
              descripcion:
                perfil.tipoIngreso === CategoriaCostoExterno.ALQUILER_TEMPORARIO
                  ? 'Alquiler temporario del período'
                  : perfil.tipoIngreso === CategoriaCostoExterno.VENTA_UNIDAD
                    ? 'Venta de unidad'
                    : 'Certificado de obra cobrado',
              proveedor: null,
              monto: plata(redondearMiles(ingresoDelMes / partes, 1_000)),
              moneda: Moneda.ARS,
              obraId: obra.id,
            })
          }
        }
      }
    }
  }

  // --------------------- gastos de estructura ------------------------
  // Van sin obra: el tablero los muestra en un bloque aparte y no los
  // reparte entre las obras.
  const ESTRUCTURA = [
    { descripcion: 'Alquiler de oficina Olivos', monto: 2_400_000 },
    { descripcion: 'Sueldos de administración', monto: 10_200_000 },
    { descripcion: 'Honorarios del estudio contable', monto: 1_800_000 },
    { descripcion: 'Servicios: luz, gas, internet y telefonía', monto: 860_000 },
    { descripcion: 'Seguros generales de la empresa', monto: 1_400_000 },
    { descripcion: 'Sistema de gestión y licencias', monto: 620_000 },
    { descripcion: 'Movilidad y representación', monto: 980_000 },
  ]

  for (let mes = 5; mes >= 0; mes--) {
    const desde = mesesAtras(mes + 1)
    const hasta = mes === 0 ? hoy() : mesesAtras(mes)
    for (const g of ESTRUCTURA) {
      movimientos.push({
        idExterno: siguienteId(),
        fuente: FUENTE,
        tipo: TipoMovimientoExterno.EGRESO,
        categoria: CategoriaCostoExterno.ESTRUCTURA,
        fecha: fechaEntre(desde, hasta),
        descripcion: g.descripcion,
        proveedor: null,
        monto: plata(redondearMiles(g.monto * (0.95 + Math.random() * 0.15), 1_000)),
        moneda: Moneda.ARS,
        obraId: null,
      })
    }
  }

  await db.movimientoExterno.createMany({ data: movimientos })
  paso(`${movimientos.length} movimientos externos de los últimos 6 meses`)

  /* ==================================================================
     PEDIDOS DE COMPRA
     25 pedidos en distintos estados. Dos están plantados a propósito:
     uno frenado sin aprobar y otro cuyo material tenía que estar en obra
     y no llegó. Son los que frenan una obra de verdad.
     ================================================================== */

  const OBRAS_CON_PEDIDOS = [
    nucleo.obras.losRobles,
    nucleo.obras.santaRita,
    nucleo.obras.torreAlvear,
    nucleo.obras.cordoba,
    nucleo.obras.neuquen,
    nucleo.obras.colectora,
  ]

  const DESCRIPCIONES_PEDIDO = [
    'Hierro del 8, 10 y 12 · 4 toneladas',
    'Cemento de albañilería · 300 bolsas',
    'Ladrillo cerámico 18x18x33 · 6.000 unidades',
    'Aberturas de aluminio línea Módena · 14 paños',
    'Membrana asfáltica 4 mm · 40 rollos',
    'Porcelanato 60x60 · 320 m²',
    'Cañería de agua PPN · 180 m',
    'Cable unipolar 2,5 mm · 12 rollos',
    'Pintura látex interior · 200 L',
    'Perfilería para durlock · 90 tiras',
    'Malla Sima Q188 · 60 paños',
    'Arena y piedra partida · 30 m³',
    'Bloques de hormigón · 2.400 unidades',
    'Tablas de encofrado · 120 unidades',
    'Aislación térmica de techos · 180 m²',
  ]

  let idPedido = 5_000
  const pedidos: Prisma.PedidoCompraExternoCreateManyInput[] = []

  // --- 1 · El plantado: pendiente de aprobación hace 6 días ---
  pedidos.push({
    idExterno: `PC-${++idPedido}`,
    fuente: FUENTE,
    numero: 'PC-2411',
    descripcion: 'Hierro del 12 y del 16 · 6 toneladas para las vigas del sector B',
    solicitante: 'Hernán Costa',
    proveedor: 'Hierromat S.A.',
    estado: EstadoPedidoCompra.PENDIENTE_APROBACION,
    monto: plata(18_400_000),
    fechaSolicitud: diasAtras(6),
    fechaNecesariaEnObra: diasAdelante(2),
    obraId: nucleo.obras.santaRita.id,
  })

  // --- 2 · El plantado: aprobado y el material no llegó ---
  pedidos.push({
    idExterno: `PC-${++idPedido}`,
    fuente: FUENTE,
    numero: 'PC-2398',
    descripcion: 'Hormigón elaborado H-21 · 42 m³ para la platea del subsuelo',
    solicitante: 'Diego Sarmiento',
    proveedor: 'Hormigonera Lomax',
    estado: EstadoPedidoCompra.APROBADO,
    monto: plata(24_800_000),
    fechaSolicitud: diasAtras(14),
    fechaAprobacion: diasAtras(11),
    fechaNecesariaEnObra: diasAtras(3),
    fechaEntregaEstimada: diasAdelante(2),
    obraId: nucleo.obras.losRobles.id,
  })

  // --- 3 · Entrega estimada después de la fecha que se necesita ---
  pedidos.push({
    idExterno: `PC-${++idPedido}`,
    fuente: FUENTE,
    numero: 'PC-2416',
    descripcion: 'Aberturas de aluminio · 14 paños del frente',
    solicitante: 'Malena Ferrari',
    proveedor: 'Aberturas del Plata',
    estado: EstadoPedidoCompra.COMPRADO,
    monto: plata(31_600_000),
    fechaSolicitud: diasAtras(20),
    fechaAprobacion: diasAtras(18),
    fechaNecesariaEnObra: diasAdelante(4),
    fechaEntregaEstimada: diasAdelante(12),
    obraId: nucleo.obras.torreAlvear.id,
  })

  // --- el resto, repartidos entre estados y obras ---
  const ESTADOS_RESTANTES: EstadoPedidoCompra[] = [
    EstadoPedidoCompra.ENTREGADO, EstadoPedidoCompra.ENTREGADO,
    EstadoPedidoCompra.ENTREGADO, EstadoPedidoCompra.ENTREGADO,
    EstadoPedidoCompra.ENTREGADO, EstadoPedidoCompra.ENTREGADO,
    EstadoPedidoCompra.ENTREGADO, EstadoPedidoCompra.ENTREGADO,
    EstadoPedidoCompra.ENTREGADO_PARCIAL, EstadoPedidoCompra.ENTREGADO_PARCIAL,
    EstadoPedidoCompra.COMPRADO, EstadoPedidoCompra.COMPRADO,
    EstadoPedidoCompra.COMPRADO,
    EstadoPedidoCompra.APROBADO, EstadoPedidoCompra.APROBADO,
    EstadoPedidoCompra.APROBADO,
    EstadoPedidoCompra.PENDIENTE_APROBACION,
    EstadoPedidoCompra.PENDIENTE_APROBACION,
    EstadoPedidoCompra.BORRADOR,
    EstadoPedidoCompra.CANCELADO,
    EstadoPedidoCompra.ENTREGADO, EstadoPedidoCompra.ENTREGADO,
  ]

  for (const [i, estado] of ESTADOS_RESTANTES.entries()) {
    const obra = OBRAS_CON_PEDIDOS[i % OBRAS_CON_PEDIDOS.length]
    const solicitud = diasAtras(entero(3, 75))
    const entregado =
      estado === EstadoPedidoCompra.ENTREGADO ||
      estado === EstadoPedidoCompra.ENTREGADO_PARCIAL
    const aprobado = estado !== EstadoPedidoCompra.BORRADOR && estado !== EstadoPedidoCompra.PENDIENTE_APROBACION

    pedidos.push({
      idExterno: `PC-${++idPedido}`,
      fuente: FUENTE,
      numero: `PC-${2300 + i}`,
      descripcion: DESCRIPCIONES_PEDIDO[i % DESCRIPCIONES_PEDIDO.length],
      solicitante: uno(['Diego Sarmiento', 'Hernán Costa', 'Malena Ferrari', 'Martín Quiroga']),
      proveedor: uno(PROVEEDORES_MATERIALES),
      estado,
      monto: plata(redondearMiles(entero(1_800_000, 34_000_000), 10_000)),
      fechaSolicitud: solicitud,
      fechaAprobacion: aprobado ? new Date(solicitud.getTime() + entero(1, 4) * 86_400_000) : null,
      fechaNecesariaEnObra: new Date(solicitud.getTime() + entero(7, 30) * 86_400_000),
      fechaEntregaEstimada: aprobado ? new Date(solicitud.getTime() + entero(8, 26) * 86_400_000) : null,
      fechaEntregaReal: entregado ? new Date(solicitud.getTime() + entero(8, 32) * 86_400_000) : null,
      obraId: obra.id,
    })
  }

  await db.pedidoCompraExterno.createMany({ data: pedidos })
  paso(`${pedidos.length} pedidos de compra · 1 frenado sin aprobar, 1 sin entregar`)

  // ------------------------ registro de sync -------------------------
  const inicio = new Date()
  inicio.setHours(7, 0, 0, 0)

  await db.registroSync.create({
    data: {
      fuente: FUENTE,
      inicio,
      fin: new Date(inicio.getTime() + 41_000),
      estado: EstadoSync.OK,
      obras: Object.keys(nucleo.obras).length,
      movimientos: movimientos.length,
      pedidos: pedidos.length,
    },
  })
  paso('Sincronización exitosa registrada esta mañana')
}
