/* =====================================================================
   Seed · HERRAMIENTAS
   120 herramientas unitarias, 8 por cantidad, su historial de
   movimientos, mantenimientos y las solicitudes del pañol.

   El problema que resuelve el módulo: la empresa compra herramientas que
   ya tiene. El seed deja plantados los casos que lo demuestran.
   ===================================================================== */

import {
  Condicion,
  EstadoHerramienta,
  EstadoSolicitudHerramienta,
  Prioridad,
  PrismaClient,
  TipoControlHerramienta,
  TipoMantenimiento,
  TipoMovimientoHerramienta,
} from '@prisma/client'
import type { ContextoNucleo } from './nucleo'
import type { ContextoPersonal, EmpleadoSembrado } from './personal'
import {
  chance,
  codigoHerramienta,
  diasAdelante,
  diasAtras,
  entero,
  fechaEntre,
  mesesAtras,
  paso,
  plata,
  redondearMiles,
  titulo,
  uno,
  varios,
} from './comun'

/* ----------------------------- catálogo ------------------------------ */

interface ModeloHerramienta {
  nombre: string
  marcas: readonly string[]
  valorMin: number
  valorMax: number
  /** Solo las herramientas grandes le cargan costo diario a la obra. */
  costoDiario?: number
  mantenimientoCadaDias?: number
}

const CATALOGO: Record<string, ModeloHerramienta[]> = {
  'Eléctricas': [
    { nombre: 'Amoladora angular 4½"', marcas: ['Bosch', 'Makita', 'DeWalt'], valorMin: 95_000, valorMax: 210_000 },
    { nombre: 'Amoladora angular 9"', marcas: ['Bosch', 'Makita'], valorMin: 260_000, valorMax: 480_000, costoDiario: 3_200 },
    { nombre: 'Taladro percutor', marcas: ['Bosch', 'DeWalt', 'Makita'], valorMin: 130_000, valorMax: 340_000 },
    { nombre: 'Atornillador a batería 18V', marcas: ['Makita', 'DeWalt', 'Bosch'], valorMin: 180_000, valorMax: 420_000 },
    { nombre: 'Martillo demoledor 11 kg', marcas: ['Bosch', 'Hilti', 'Makita'], valorMin: 780_000, valorMax: 1_450_000, costoDiario: 9_800, mantenimientoCadaDias: 120 },
    { nombre: 'Rotomartillo SDS Plus', marcas: ['Bosch', 'Hilti', 'Metabo'], valorMin: 320_000, valorMax: 690_000, costoDiario: 4_500, mantenimientoCadaDias: 150 },
    { nombre: 'Lijadora orbital', marcas: ['Bosch', 'Black+Decker'], valorMin: 88_000, valorMax: 175_000 },
    { nombre: 'Sierra caladora', marcas: ['Bosch', 'Makita'], valorMin: 115_000, valorMax: 245_000 },
  ],
  'Medición': [
    { nombre: 'Nivel láser autonivelante', marcas: ['Bosch', 'Stanley', 'DeWalt'], valorMin: 290_000, valorMax: 720_000, mantenimientoCadaDias: 180 },
    { nombre: 'Nivel óptico con trípode', marcas: ['Bosch', 'Leica'], valorMin: 480_000, valorMax: 980_000, costoDiario: 5_400, mantenimientoCadaDias: 180 },
    { nombre: 'Medidor láser de distancia', marcas: ['Bosch', 'Leica'], valorMin: 140_000, valorMax: 320_000 },
    { nombre: 'Estación total', marcas: ['Leica', 'Topcon'], valorMin: 4_800_000, valorMax: 8_600_000, costoDiario: 42_000, mantenimientoCadaDias: 120 },
    { nombre: 'Escuadra láser', marcas: ['Bosch', 'Stanley'], valorMin: 95_000, valorMax: 190_000 },
  ],
  'Andamios y encofrado': [
    { nombre: 'Cuerpo de andamio tubular', marcas: ['Gamma', 'Nacional'], valorMin: 145_000, valorMax: 260_000, costoDiario: 1_800 },
    { nombre: 'Panel de encofrado metálico 2,40 m', marcas: ['Nacional', 'Peri'], valorMin: 380_000, valorMax: 720_000, costoDiario: 2_900 },
    { nombre: 'Puntal telescópico reforzado', marcas: ['Nacional', 'Peri'], valorMin: 62_000, valorMax: 118_000 },
    { nombre: 'Torre de encofrado', marcas: ['Peri', 'Ulma'], valorMin: 890_000, valorMax: 1_600_000, costoDiario: 8_200 },
  ],
  'Hormigón': [
    { nombre: 'Hormigonera 130 L', marcas: ['Gamma', 'Lusqtoff'], valorMin: 620_000, valorMax: 1_180_000, costoDiario: 7_600, mantenimientoCadaDias: 90 },
    { nombre: 'Hormigonera 300 L', marcas: ['Gamma', 'Czerweny'], valorMin: 1_240_000, valorMax: 2_100_000, costoDiario: 13_400, mantenimientoCadaDias: 90 },
    { nombre: 'Vibrador de inmersión', marcas: ['Dowen Pagio', 'Lusqtoff'], valorMin: 340_000, valorMax: 680_000, costoDiario: 4_100, mantenimientoCadaDias: 120 },
    { nombre: 'Regla vibradora', marcas: ['Dowen Pagio', 'Enar'], valorMin: 480_000, valorMax: 890_000, costoDiario: 5_800, mantenimientoCadaDias: 120 },
    { nombre: 'Alisadora de hormigón', marcas: ['Dowen Pagio', 'Enar'], valorMin: 1_450_000, valorMax: 2_600_000, costoDiario: 16_500, mantenimientoCadaDias: 100 },
  ],
  'Corte': [
    { nombre: 'Sierra circular 7¼"', marcas: ['Makita', 'DeWalt', 'Bosch'], valorMin: 180_000, valorMax: 390_000 },
    { nombre: 'Cortadora de hierro de banco', marcas: ['Gamma', 'Lusqtoff'], valorMin: 420_000, valorMax: 780_000, costoDiario: 4_900, mantenimientoCadaDias: 150 },
    { nombre: 'Amoladora de corte de piso', marcas: ['Husqvarna', 'Makita'], valorMin: 1_800_000, valorMax: 3_200_000, costoDiario: 19_000, mantenimientoCadaDias: 90 },
    { nombre: 'Cortadora de cerámicos', marcas: ['Rubi', 'Gamma'], valorMin: 260_000, valorMax: 520_000 },
  ],
  'Manuales': [
    { nombre: 'Juego de llaves combinadas', marcas: ['Bahco', 'Stanley', 'Crown'], valorMin: 58_000, valorMax: 130_000 },
    { nombre: 'Maza de 5 kg', marcas: ['Stanley', 'Crown'], valorMin: 32_000, valorMax: 68_000 },
    { nombre: 'Juego de destornilladores', marcas: ['Stanley', 'Bahco'], valorMin: 28_000, valorMax: 62_000 },
    { nombre: 'Pinza de corte', marcas: ['Bahco', 'Stanley'], valorMin: 24_000, valorMax: 55_000 },
    { nombre: 'Carretilla reforzada', marcas: ['Nacional', 'Gamma'], valorMin: 95_000, valorMax: 180_000 },
  ],
  'Elevación': [
    { nombre: 'Malacate de obra 300 kg', marcas: ['Gamma', 'Nacional'], valorMin: 1_100_000, valorMax: 2_200_000, costoDiario: 14_200, mantenimientoCadaDias: 60 },
    { nombre: 'Aparejo de cadena 2 t', marcas: ['Yale', 'Nacional'], valorMin: 320_000, valorMax: 610_000, mantenimientoCadaDias: 180 },
    { nombre: 'Zorra hidráulica 2,5 t', marcas: ['Nacional', 'Crown'], valorMin: 480_000, valorMax: 880_000, costoDiario: 5_200, mantenimientoCadaDias: 180 },
  ],
  'Seguridad': [
    { nombre: 'Arnés de cuerpo entero', marcas: ['Libus', '3M'], valorMin: 78_000, valorMax: 160_000, mantenimientoCadaDias: 365 },
    { nombre: 'Línea de vida retráctil', marcas: ['Libus', '3M'], valorMin: 240_000, valorMax: 480_000, mantenimientoCadaDias: 365 },
    { nombre: 'Matafuego ABC 10 kg', marcas: ['Melisam', 'Drago'], valorMin: 62_000, valorMax: 120_000, mantenimientoCadaDias: 365 },
    { nombre: 'Torre de iluminación portátil', marcas: ['Nacional', 'Gamma'], valorMin: 520_000, valorMax: 960_000, costoDiario: 6_100 },
  ],
  'Compactación': [
    { nombre: 'Placa compactadora 90 kg', marcas: ['Dowen Pagio', 'Wacker'], valorMin: 1_600_000, valorMax: 2_900_000, costoDiario: 18_400, mantenimientoCadaDias: 90 },
    { nombre: 'Apisonador tipo canguro', marcas: ['Wacker', 'Dowen Pagio'], valorMin: 2_100_000, valorMax: 3_800_000, costoDiario: 23_000, mantenimientoCadaDias: 80 },
    { nombre: 'Rodillo compactador manual', marcas: ['Dowen Pagio', 'Nacional'], valorMin: 890_000, valorMax: 1_500_000, costoDiario: 9_600, mantenimientoCadaDias: 100 },
  ],
  'Generadores': [
    { nombre: 'Grupo electrógeno 5,5 kVA', marcas: ['Honda', 'Gamma', 'Czerweny'], valorMin: 1_400_000, valorMax: 2_600_000, costoDiario: 16_800, mantenimientoCadaDias: 60 },
    { nombre: 'Grupo electrógeno 12 kVA', marcas: ['Honda', 'Czerweny'], valorMin: 3_200_000, valorMax: 5_400_000, costoDiario: 34_000, mantenimientoCadaDias: 60 },
    { nombre: 'Compresor de aire 100 L', marcas: ['Gamma', 'Lusqtoff'], valorMin: 680_000, valorMax: 1_250_000, costoDiario: 8_100, mantenimientoCadaDias: 90 },
    { nombre: 'Soldadora inverter 200 A', marcas: ['Lusqtoff', 'Gamma', 'Esab'], valorMin: 310_000, valorMax: 620_000, costoDiario: 4_300, mantenimientoCadaDias: 150 },
  ],
}

/** Las 8 controladas por cantidad: nadie las cuenta de a una. */
const POR_CANTIDAD = [
  { nombre: 'Pala ancha', categoria: 'Manuales', valor: 34_000 },
  { nombre: 'Pala de punta', categoria: 'Manuales', valor: 32_000 },
  { nombre: 'Balde de albañil', categoria: 'Manuales', valor: 9_500 },
  { nombre: 'Puntal telescópico común', categoria: 'Andamios y encofrado', valor: 48_000 },
  { nombre: 'Caballete metálico', categoria: 'Andamios y encofrado', valor: 62_000 },
  { nombre: 'Tablón de andamio', categoria: 'Andamios y encofrado', valor: 78_000 },
  { nombre: 'Carretilla de obra', categoria: 'Manuales', valor: 118_000 },
  { nombre: 'Cono de señalización', categoria: 'Seguridad', valor: 14_500 },
]

export interface ContextoHerramientas {
  categorias: Record<string, string>
  /** Cuánto se ahorró la empresa resolviendo solicitudes con stock propio. */
  compraEvitada: number
}

export async function sembrarHerramientas(
  db: PrismaClient,
  nucleo: ContextoNucleo,
  personal: ContextoPersonal,
): Promise<ContextoHerramientas> {
  titulo('Herramientas')

  // ---------------------------- categorías ---------------------------
  const categorias: Record<string, string> = {}
  for (const nombre of Object.keys(CATALOGO)) {
    const creada = await db.categoriaHerramienta.create({ data: { nombre } })
    categorias[nombre] = creada.id
  }
  paso(`${Object.keys(categorias).length} categorías`)

  // ------------------------- dónde puede estar -----------------------
  const depositos = [nucleo.depositos.central, nucleo.depositos.secundario, nucleo.depositos.obrador]
  const obrasActivas = [
    nucleo.obras.losRobles,
    nucleo.obras.santaRita,
    nucleo.obras.torreAlvear,
    nucleo.obras.cordoba,
    nucleo.obras.neuquen,
    nucleo.obras.colectora,
  ]

  /** Alguien de la obra que pueda hacerse responsable de la herramienta. */
  const responsableDe = (obraId: string): EmpleadoSembrado | null => {
    const plantel = personal.asignacionPorObra[obraId]
    return plantel && plantel.length > 0 ? uno(plantel) : null
  }

  // ---------------------- herramientas unitarias ---------------------
  // Se arma una lista plana de 120 modelos repartidos entre las categorías.
  const modelos: Array<{ categoria: string; modelo: ModeloHerramienta }> = []
  const nombresCategorias = Object.keys(CATALOGO)
  let vuelta = 0
  while (modelos.length < 120) {
    for (const cat of nombresCategorias) {
      if (modelos.length >= 120) break
      const lista = CATALOGO[cat]
      modelos.push({ categoria: cat, modelo: lista[vuelta % lista.length] })
    }
    vuelta += 1
  }

  interface Sembrada {
    id: string
    codigo: string
    nombre: string
    categoria: string
    estado: EstadoHerramienta
    obraId: string | null
    depositoId: string | null
    responsableId: string | null
    valorCompra: number
  }

  const sembradas: Sembrada[] = []
  let numero = 0
  let movimientos = 0

  for (const { categoria, modelo } of modelos) {
    numero += 1
    const codigo = codigoHerramienta(numero)
    const valorCompra = redondearMiles(entero(modelo.valorMin, modelo.valorMax), 1_000)
    const fechaCompra = fechaEntre(mesesAtras(entero(4, 60)), diasAtras(20))

    // Reparto: la mayoría en obra, el resto en depósito, y unas pocas
    // con problemas (reparación, extravío, baja).
    let estado: EstadoHerramienta = EstadoHerramienta.DISPONIBLE
    if (numero <= 6) estado = EstadoHerramienta.EN_REPARACION
    else if (numero === 7 || numero === 8) estado = EstadoHerramienta.EXTRAVIADA
    else if (numero >= 9 && numero <= 11) estado = EstadoHerramienta.BAJA
    else estado = chance(0.55) ? EstadoHerramienta.EN_OBRA : EstadoHerramienta.DISPONIBLE

    const enObra = estado === EstadoHerramienta.EN_OBRA
    const obra = enObra ? uno(obrasActivas) : null
    const deposito = enObra || estado === EstadoHerramienta.EXTRAVIADA || estado === EstadoHerramienta.BAJA
      ? null
      : uno(depositos)
    // En reparación la herramienta sale del depósito pero no llega a una obra:
    // el schema la deja sin ubicación y el estado lo explica.
    const depositoFinal = estado === EstadoHerramienta.EN_REPARACION ? null : deposito

    const responsable = obra ? responsableDe(obra.id) : null
    const fechaSalida = obra ? fechaEntre(diasAtras(entero(10, 90)), diasAtras(3)) : null

    const creada = await db.herramienta.create({
      data: {
        codigo,
        nombre: modelo.nombre,
        marca: uno(modelo.marcas),
        modelo: `${uno(['GWS', 'HR', 'DCD', 'MT', 'PRO', 'XT'])}-${entero(100, 990)}`,
        nroSerie: `${uno(['SN', 'NS'])}${entero(100_000, 999_999)}`,
        tipoControl: TipoControlHerramienta.UNITARIO,
        estado,
        condicion:
          estado === EstadoHerramienta.EN_REPARACION
            ? Condicion.MALA
            : chance(0.78)
              ? Condicion.BUENA
              : Condicion.REGULAR,
        fechaCompra,
        valorCompra: plata(valorCompra),
        proveedor: uno(['Ferretería Industrial Norte', 'Hierromat', 'Casa Pérez Herramientas', 'Distribuidora Pilar', 'Sodimac']),
        costoDiarioImputable: modelo.costoDiario ? plata(modelo.costoDiario) : null,
        mantenimientoCadaDias: modelo.mantenimientoCadaDias ?? null,
        proximoMantenimiento: modelo.mantenimientoCadaDias
          ? diasAdelante(entero(5, modelo.mantenimientoCadaDias))
          : null,
        categoriaId: categorias[categoria],
        depositoId: depositoFinal,
        obraId: obra?.id ?? null,
        responsableActualId: responsable?.id ?? null,
        fechaDevolucionPrevista: obra ? diasAdelante(entero(5, 60)) : null,
        notas: estado === EstadoHerramienta.BAJA ? 'Dada de baja por rotura irreparable.' : null,
      },
    })

    sembradas.push({
      id: creada.id,
      codigo,
      nombre: modelo.nombre,
      categoria,
      estado,
      obraId: obra?.id ?? null,
      depositoId: depositoFinal,
      responsableId: responsable?.id ?? null,
      valorCompra,
    })

    // --------------------- historial de movimientos -------------------
    // El historial tiene que cerrar con dónde está la herramienta hoy.
    const depositoOrigen = deposito ?? nucleo.depositos.central

    await db.movimientoHerramienta.create({
      data: {
        herramientaId: creada.id,
        tipo: TipoMovimientoHerramienta.ALTA,
        fecha: fechaCompra,
        condicion: Condicion.BUENA,
        destinoDepositoId: nucleo.depositos.central,
        registradoPorId: nucleo.usuarios.panolero,
        observaciones: 'Alta de inventario.',
      },
    })
    movimientos += 1

    if (enObra && obra && fechaSalida) {
      await db.movimientoHerramienta.create({
        data: {
          herramientaId: creada.id,
          tipo: TipoMovimientoHerramienta.SALIDA_A_OBRA,
          fecha: fechaSalida,
          condicion: Condicion.BUENA,
          origenDepositoId: depositoOrigen,
          destinoObraId: obra.id,
          registradoPorId: nucleo.usuarios.panolero,
          recibidoPorId: responsable?.id ?? null,
          fechaDevolucionPrevista: diasAdelante(entero(5, 60)),
        },
      })
      movimientos += 1
    }

    if (estado === EstadoHerramienta.EN_REPARACION) {
      await db.movimientoHerramienta.create({
        data: {
          herramientaId: creada.id,
          tipo: TipoMovimientoHerramienta.ENVIO_A_REPARACION,
          // Dos llevan más de 20 días en el taller: dispara la alerta.
          fecha: numero <= 2 ? diasAtras(entero(26, 40)) : diasAtras(entero(3, 18)),
          condicion: Condicion.MALA,
          origenDepositoId: nucleo.depositos.central,
          registradoPorId: nucleo.usuarios.panolero,
          observaciones: uno(['No arranca.', 'Rotura de carcasa.', 'Pérdida de aceite.', 'Cable de alimentación dañado.']),
        },
      })
      movimientos += 1
    }

    if (estado === EstadoHerramienta.EXTRAVIADA) {
      await db.movimientoHerramienta.create({
        data: {
          herramientaId: creada.id,
          tipo: TipoMovimientoHerramienta.EXTRAVIO,
          fecha: diasAtras(entero(15, 60)),
          origenObraId: uno(obrasActivas).id,
          registradoPorId: nucleo.usuarios.panolero,
          observaciones: 'No aparece en el recuento de fin de mes. Se reclamó a la obra.',
        },
      })
      movimientos += 1
    }

    if (estado === EstadoHerramienta.BAJA) {
      await db.movimientoHerramienta.create({
        data: {
          herramientaId: creada.id,
          tipo: TipoMovimientoHerramienta.BAJA,
          fecha: diasAtras(entero(20, 120)),
          condicion: Condicion.MALA,
          origenDepositoId: nucleo.depositos.central,
          registradoPorId: nucleo.usuarios.panolero,
          observaciones: 'Rotura irreparable. Presupuesto de arreglo mayor al valor de reposición.',
        },
      })
      movimientos += 1
    }
  }
  paso(`120 herramientas unitarias · ${movimientos} movimientos`)

  /* ==================================================================
     PROBLEMAS PLANTADOS A PROPÓSITO
     Son los que hacen que la demo muestre para qué sirve el sistema.
     ================================================================== */

  // 1 y 2 · Una amoladora y un martillo demoledor con la devolución
  //         vencida hace 9 días.
  const vencidas = [
    sembradas.find((h) => h.nombre.includes('Amoladora angular 4½')),
    sembradas.find((h) => h.nombre.includes('Martillo demoledor')),
  ].filter((h): h is Sembrada => Boolean(h))

  for (const h of vencidas) {
    const obra = uno(obrasActivas)
    const responsable = responsableDe(obra.id)
    await db.herramienta.update({
      where: { id: h.id },
      data: {
        estado: EstadoHerramienta.EN_OBRA,
        depositoId: null,
        obraId: obra.id,
        responsableActualId: responsable?.id ?? null,
        fechaDevolucionPrevista: diasAtras(9),
      },
    })
    await db.movimientoHerramienta.create({
      data: {
        herramientaId: h.id,
        tipo: TipoMovimientoHerramienta.SALIDA_A_OBRA,
        fecha: diasAtras(23),
        condicion: Condicion.BUENA,
        origenDepositoId: nucleo.depositos.central,
        destinoObraId: obra.id,
        registradoPorId: nucleo.usuarios.panolero,
        recibidoPorId: responsable?.id ?? null,
        fechaDevolucionPrevista: diasAtras(9),
        observaciones: 'Entrega por dos semanas para el corte de hierro.',
      },
    })
  }
  paso('Plantado · 2 herramientas con devolución vencida hace 9 días')

  // 3 · Cuatro herramientas que siguen figurando en la obra finalizada.
  const enObraFinalizada = sembradas
    .filter((h) => h.estado === EstadoHerramienta.EN_OBRA && !vencidas.includes(h))
    .slice(0, 4)

  for (const h of enObraFinalizada) {
    await db.herramienta.update({
      where: { id: h.id },
      data: {
        obraId: nucleo.obras.uruguay.id,
        depositoId: null,
        responsableActualId: null,
        fechaDevolucionPrevista: diasAtras(entero(30, 70)),
      },
    })
    await db.movimientoHerramienta.create({
      data: {
        herramientaId: h.id,
        tipo: TipoMovimientoHerramienta.SALIDA_A_OBRA,
        fecha: diasAtras(entero(120, 200)),
        condicion: Condicion.BUENA,
        origenDepositoId: nucleo.depositos.central,
        destinoObraId: nucleo.obras.uruguay.id,
        registradoPorId: nucleo.usuarios.panolero,
      },
    })
    h.obraId = nucleo.obras.uruguay.id
  }
  paso('Plantado · 4 herramientas en la obra finalizada')

  // 4 · Una hormigonera con el mantenimiento vencido.
  const hormigonera = sembradas.find((h) => h.nombre.startsWith('Hormigonera'))
  if (hormigonera) {
    await db.herramienta.update({
      where: { id: hormigonera.id },
      data: { proximoMantenimiento: diasAtras(14), mantenimientoCadaDias: 90 },
    })
    await db.mantenimientoHerramienta.create({
      data: {
        herramientaId: hormigonera.id,
        tipo: TipoMantenimiento.PREVENTIVO,
        fecha: diasAtras(104),
        descripcion: 'Service general: cambio de correa y engrase de corona.',
        proveedor: 'Taller Mecánico Pilar',
        costo: plata(148_000),
        proximaFecha: diasAtras(14),
      },
    })
    paso('Plantado · hormigonera con mantenimiento vencido')
  }

  // ------------------------- mantenimientos --------------------------
  let mantenimientos = 0
  for (const h of varios(
    sembradas.filter((s) => s.estado !== EstadoHerramienta.BAJA),
    34,
  )) {
    const tipo = chance(0.65) ? TipoMantenimiento.PREVENTIVO : TipoMantenimiento.CORRECTIVO
    const fecha = fechaEntre(mesesAtras(10), diasAtras(5))
    await db.mantenimientoHerramienta.create({
      data: {
        herramientaId: h.id,
        tipo,
        fecha,
        descripcion:
          tipo === TipoMantenimiento.PREVENTIVO
            ? uno(['Service de rutina.', 'Cambio de escobillas y limpieza.', 'Engrase y control general.', 'Calibración anual.'])
            : uno(['Cambio de rodamiento.', 'Reparación de inducido.', 'Cambio de cable y ficha.', 'Reemplazo de gatillo.']),
        proveedor: uno(['Taller Mecánico Pilar', 'Service Bosch Olivos', 'Rectificaciones Norte', 'Electromecánica Tigre']),
        costo: plata(redondearMiles(entero(35_000, 420_000), 1_000)),
        proximaFecha: tipo === TipoMantenimiento.PREVENTIVO ? diasAdelante(entero(15, 150)) : null,
      },
    })
    mantenimientos += 1
  }
  paso(`${mantenimientos} mantenimientos registrados`)

  // --------------------- herramientas por cantidad -------------------
  let existencias = 0
  for (const [i, item] of POR_CANTIDAD.entries()) {
    numero += 1
    const creada = await db.herramienta.create({
      data: {
        codigo: codigoHerramienta(numero),
        nombre: item.nombre,
        marca: uno(['Nacional', 'Gamma', 'Crown', 'Tramontina']),
        tipoControl: TipoControlHerramienta.CANTIDAD,
        estado: EstadoHerramienta.DISPONIBLE,
        fechaCompra: fechaEntre(mesesAtras(24), diasAtras(30)),
        valorCompra: plata(item.valor),
        categoriaId: categorias[item.categoria],
      },
    })

    // El stock se reparte entre depósitos y obras. Nunca se toca la
    // ubicación de la herramienta: para CANTIDAD el stock vive acá.
    const lugares: Array<{ depositoId?: string; obraId?: string }> = [
      { depositoId: nucleo.depositos.central },
      { depositoId: nucleo.depositos.secundario },
      ...varios(obrasActivas, 3).map((o) => ({ obraId: o.id })),
    ]

    for (const lugar of lugares) {
      await db.existenciaHerramienta.create({
        data: {
          herramientaId: creada.id,
          depositoId: lugar.depositoId ?? null,
          obraId: lugar.obraId ?? null,
          cantidad: entero(2, i === 2 ? 40 : 18),
        },
      })
      existencias += 1
    }
  }
  paso(`8 herramientas por cantidad · ${existencias} existencias repartidas`)

  /* ==================================================================
     SOLICITUDES DE HERRAMIENTAS
     Este es el freno a las compras duplicadas. Seis solicitudes en
     distintos estados, incluida la que se resolvió con stock y evitó
     una compra: ese número es el que le importa al dueño.
     ================================================================== */

  let compraEvitada = 0

  // 1 · Resuelta con stock propio: la herramienta ya estaba en el depósito.
  const disponibleParaPrestar = sembradas.find(
    (h) => h.estado === EstadoHerramienta.DISPONIBLE && h.valorCompra > 800_000,
  )

  if (disponibleParaPrestar) {
    const solicitud = await db.solicitudHerramienta.create({
      data: {
        obraId: nucleo.obras.santaRita.id,
        categoriaId: categorias[disponibleParaPrestar.categoria],
        descripcion: `${disponibleParaPrestar.nombre} para el hormigonado de la platea`,
        cantidad: 1,
        fechaNecesaria: diasAtras(6),
        prioridad: Prioridad.ALTA,
        estado: EstadoSolicitudHerramienta.RESUELTA_CON_STOCK,
        solicitanteId: nucleo.usuarios.jefe2,
        resueltaPorId: nucleo.usuarios.panolero,
        resueltaEn: diasAtras(7),
        resolucionNota: `Había una disponible en el Depósito Central (${disponibleParaPrestar.codigo}). Se entregó en el día y no se compró nada.`,
        creadaEn: diasAtras(9),
      },
    })

    const responsable = responsableDe(nucleo.obras.santaRita.id)
    await db.movimientoHerramienta.create({
      data: {
        herramientaId: disponibleParaPrestar.id,
        tipo: TipoMovimientoHerramienta.SALIDA_A_OBRA,
        fecha: diasAtras(7),
        condicion: Condicion.BUENA,
        origenDepositoId: disponibleParaPrestar.depositoId ?? nucleo.depositos.central,
        destinoObraId: nucleo.obras.santaRita.id,
        registradoPorId: nucleo.usuarios.panolero,
        recibidoPorId: responsable?.id ?? null,
        fechaDevolucionPrevista: diasAdelante(20),
        solicitudId: solicitud.id,
      },
    })

    await db.herramienta.update({
      where: { id: disponibleParaPrestar.id },
      data: {
        estado: EstadoHerramienta.EN_OBRA,
        depositoId: null,
        obraId: nucleo.obras.santaRita.id,
        responsableActualId: responsable?.id ?? null,
        fechaDevolucionPrevista: diasAdelante(20),
      },
    })

    compraEvitada += disponibleParaPrestar.valorCompra
  }

  // 2 · Otra resuelta con stock, del mes pasado.
  const otraDisponible = sembradas.find(
    (h) =>
      h.estado === EstadoHerramienta.DISPONIBLE &&
      h.valorCompra > 400_000 &&
      h.id !== disponibleParaPrestar?.id,
  )

  if (otraDisponible) {
    await db.solicitudHerramienta.create({
      data: {
        obraId: nucleo.obras.torreAlvear.id,
        categoriaId: categorias[otraDisponible.categoria],
        descripcion: `${otraDisponible.nombre} para el nivel 7`,
        cantidad: 1,
        fechaNecesaria: diasAtras(18),
        prioridad: Prioridad.NORMAL,
        estado: EstadoSolicitudHerramienta.RESUELTA_CON_STOCK,
        solicitanteId: nucleo.usuarios.arquitecta,
        resueltaPorId: nucleo.usuarios.panolero,
        resueltaEn: diasAtras(19),
        resolucionNota: `Se usó la que estaba en el Depósito Pilar (${otraDisponible.codigo}).`,
        creadaEn: diasAtras(21),
      },
    })
    compraEvitada += otraDisponible.valorCompra
  }

  // 3 · Pendiente y urgente: la necesitan pasado mañana.
  await db.solicitudHerramienta.create({
    data: {
      obraId: nucleo.obras.losRobles.id,
      categoriaId: categorias['Compactación'],
      descripcion: 'Placa compactadora para el contrapiso del subsuelo',
      cantidad: 1,
      fechaNecesaria: diasAdelante(2),
      prioridad: Prioridad.URGENTE,
      estado: EstadoSolicitudHerramienta.PENDIENTE,
      solicitanteId: nucleo.usuarios.jefe1,
      creadaEn: diasAtras(2),
    },
  })

  // 4 · Pendiente, a dos días de la fecha en que se necesita: alerta.
  await db.solicitudHerramienta.create({
    data: {
      obraId: nucleo.obras.colectora.id,
      categoriaId: categorias['Corte'],
      descripcion: 'Cortadora de hierro de banco para armadura de vigas',
      cantidad: 1,
      fechaNecesaria: diasAdelante(1),
      prioridad: Prioridad.ALTA,
      estado: EstadoSolicitudHerramienta.PENDIENTE,
      solicitanteId: nucleo.usuarios.capataz,
      creadaEn: diasAtras(4),
    },
  })

  // 5 · Derivada a compra: no había nada en ningún lado.
  await db.solicitudHerramienta.create({
    data: {
      obraId: nucleo.obras.neuquen.id,
      categoriaId: categorias['Generadores'],
      descripcion: 'Grupo electrógeno 12 kVA para el frente de obra sin red',
      cantidad: 1,
      fechaNecesaria: diasAdelante(12),
      prioridad: Prioridad.ALTA,
      estado: EstadoSolicitudHerramienta.DERIVADA_A_COMPRA,
      solicitanteId: nucleo.usuarios.jefe2,
      resueltaPorId: nucleo.usuarios.panolero,
      resueltaEn: diasAtras(3),
      resolucionNota: 'No hay ninguno libre: los dos que tenemos están en Los Robles y en la colectora. Se pasa a compra.',
      creadaEn: diasAtras(5),
    },
  })

  // 6 · Rechazada.
  await db.solicitudHerramienta.create({
    data: {
      obraId: nucleo.obras.santaRita.id,
      categoriaId: categorias['Medición'],
      descripcion: 'Estación total para replanteo',
      cantidad: 1,
      fechaNecesaria: diasAtras(10),
      prioridad: Prioridad.NORMAL,
      estado: EstadoSolicitudHerramienta.RECHAZADA,
      solicitanteId: nucleo.usuarios.capataz,
      resueltaPorId: nucleo.usuarios.panolero,
      resueltaEn: diasAtras(11),
      resolucionNota: 'Para una casa alcanza con el nivel óptico. La estación total queda para Torre Alvear.',
      creadaEn: diasAtras(13),
    },
  })

  paso(`6 solicitudes · compras evitadas por $ ${compraEvitada.toLocaleString('es-AR')}`)

  return { categorias, compraEvitada }
}
