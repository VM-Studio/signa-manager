/* =====================================================================
   Seed · VEHÍCULOS
   10 vehículos, su documentación, 40 viajes de los últimos 30 días,
   cargas de combustible, mantenimientos e incidentes.

   El problema que resuelve el módulo: la empresa no sabe dónde están sus
   camiones, qué están haciendo ni cuánto le cuestan a cada obra.
   ===================================================================== */

import {
  type Prisma,
  Combustible,
  EstadoSolicitudViaje,
  EstadoVehiculo,
  EstadoViaje,
  Prioridad,
  PrismaClient,
  TipoDocumentoVehiculo,
  TipoIncidenteVehiculo,
  TipoMantenimiento,
  TipoVehiculo,
  TipoViaje,
} from '@prisma/client'
import type { ContextoNucleo } from './nucleo'
import type { ContextoPersonal, EmpleadoSembrado } from './personal'
import {
  aHora,
  chance,
  diasAdelante,
  diasAtras,
  entero,
  fechaEntre,
  hoy,
  patenteNueva,
  patenteVieja,
  paso,
  plata,
  redondearMiles,
  titulo,
  uno,
} from './comun'

interface DefinicionVehiculo {
  clave: string
  tipo: TipoVehiculo
  marca: string
  modelo: string
  anio: number
  capacidadCargaKg: number | null
  volumenM3: number | null
  pasajeros: number | null
  combustible: Combustible
  costoKm: number
  kmActual: number
  patenteVieja?: boolean
}

const anioActual = new Date().getFullYear()

const FLOTA: DefinicionVehiculo[] = [
  { clave: 'camion15t', tipo: TipoVehiculo.CAMION, marca: 'Mercedes-Benz', modelo: 'Atego 1726', anio: anioActual - 6, capacidadCargaKg: 15_000, volumenM3: 38, pasajeros: 2, combustible: Combustible.DIESEL, costoKm: 1_180, kmActual: 268_400 },
  { clave: 'camion8t', tipo: TipoVehiculo.CAMION, marca: 'Iveco', modelo: 'Tector 170E22', anio: anioActual - 8, capacidadCargaKg: 8_500, volumenM3: 24, pasajeros: 2, combustible: Combustible.DIESEL, costoKm: 860, kmActual: 341_200 },
  { clave: 'camion6t', tipo: TipoVehiculo.CAMION, marca: 'Ford', modelo: 'Cargo 1119', anio: anioActual - 10, capacidadCargaKg: 6_000, volumenM3: 20, pasajeros: 2, combustible: Combustible.DIESEL, costoKm: 720, kmActual: 412_800, patenteVieja: true },
  { clave: 'camion35', tipo: TipoVehiculo.CAMION, marca: 'Iveco', modelo: 'Daily 55-170', anio: anioActual - 4, capacidadCargaKg: 3_500, volumenM3: 16, pasajeros: 3, combustible: Combustible.DIESEL, costoKm: 540, kmActual: 148_900 },
  { clave: 'pickup1', tipo: TipoVehiculo.CAMIONETA, marca: 'Toyota', modelo: 'Hilux 4x4 SRV', anio: anioActual - 3, capacidadCargaKg: 1_000, volumenM3: 2.5, pasajeros: 5, combustible: Combustible.DIESEL, costoKm: 380, kmActual: 96_300 },
  { clave: 'pickup2', tipo: TipoVehiculo.CAMIONETA, marca: 'Volkswagen', modelo: 'Amarok Comfortline', anio: anioActual - 5, capacidadCargaKg: 1_000, volumenM3: 2.5, pasajeros: 5, combustible: Combustible.DIESEL, costoKm: 395, kmActual: 132_700 },
  { clave: 'utilitario1', tipo: TipoVehiculo.UTILITARIO, marca: 'Renault', modelo: 'Kangoo Express', anio: anioActual - 4, capacidadCargaKg: 650, volumenM3: 3, pasajeros: 2, combustible: Combustible.NAFTA, costoKm: 260, kmActual: 118_400 },
  { clave: 'utilitario2', tipo: TipoVehiculo.UTILITARIO, marca: 'Fiat', modelo: 'Fiorino Fire', anio: anioActual - 7, capacidadCargaKg: 500, volumenM3: 2.8, pasajeros: 2, combustible: Combustible.NAFTA, costoKm: 235, kmActual: 176_500, patenteVieja: true },
  { clave: 'auto', tipo: TipoVehiculo.AUTO, marca: 'Chevrolet', modelo: 'Onix LT', anio: anioActual - 2, capacidadCargaKg: 300, volumenM3: 0.8, pasajeros: 5, combustible: Combustible.NAFTA, costoKm: 210, kmActual: 48_200 },
  { clave: 'minicargadora', tipo: TipoVehiculo.MAQUINA_VIAL, marca: 'Bobcat', modelo: 'S570', anio: anioActual - 6, capacidadCargaKg: 900, volumenM3: null, pasajeros: 1, combustible: Combustible.DIESEL, costoKm: 0, kmActual: 0 },
]

export interface ContextoVehiculos {
  vehiculos: Record<string, { id: string; patente: string; capacidadCargaKg: number | null }>
}

export async function sembrarVehiculos(
  db: PrismaClient,
  nucleo: ContextoNucleo,
  personal: ContextoPersonal,
): Promise<ContextoVehiculos> {
  titulo('Vehículos')

  const choferes = personal.choferes.length > 0 ? personal.choferes : [personal.choferPrincipal]
  const obrasActivas = [
    nucleo.obras.losRobles,
    nucleo.obras.santaRita,
    nucleo.obras.torreAlvear,
    nucleo.obras.colectora,
  ]

  const vehiculos: ContextoVehiculos['vehiculos'] = {}
  const creados: Array<{
    clave: string
    id: string
    patente: string
    def: DefinicionVehiculo
    chofer: EmpleadoSembrado
  }> = []

  for (const [i, def] of FLOTA.entries()) {
    const patente = def.patenteVieja ? patenteVieja(i + 3) : patenteNueva(i + 1)
    // Roberto Ledesma, que es el usuario CHOFER de la demo, maneja el Iveco Tector.
    const chofer = def.clave === 'camion8t' ? personal.choferPrincipal : choferes[i % choferes.length]

    const creado = await db.vehiculo.create({
      data: {
        patente,
        interno: `I-${String(i + 1).padStart(2, '0')}`,
        tipo: def.tipo,
        marca: def.marca,
        modelo: def.modelo,
        anio: def.anio,
        combustible: def.combustible,
        capacidadCargaKg: def.capacidadCargaKg,
        volumenM3: def.volumenM3 ? plata(def.volumenM3) : null,
        cantidadPasajeros: def.pasajeros,
        kmActual: def.kmActual,
        horasActual: def.tipo === TipoVehiculo.MAQUINA_VIAL ? entero(2_400, 4_800) : null,
        estado: EstadoVehiculo.DISPONIBLE,
        costoKmEstimado: plata(def.costoKm),
        choferHabitualId: chofer.id,
      },
    })

    vehiculos[def.clave] = {
      id: creado.id,
      patente,
      capacidadCargaKg: def.capacidadCargaKg,
    }
    creados.push({ clave: def.clave, id: creado.id, patente, def, chofer })
  }
  paso(`${FLOTA.length} vehículos`)

  // --------------------------- documentación -------------------------
  let documentos = 0
  for (const v of creados) {
    // Problemas plantados:
    //   · el camión de 15 t tiene la VTV a 5 días de vencer
    //   · la Hilux tiene el seguro vencido ayer (bloquea su asignación)
    const vtvPorVencer = v.clave === 'camion15t'
    const seguroVencido = v.clave === 'pickup1'

    // Tipado explícito: a los camiones se les agregan después RUTA y
    // matafuego, y TypeScript infiere el tipo del literal inicial.
    const aCargar: Prisma.DocumentoVehiculoCreateManyInput[] = [
      {
        vehiculoId: v.id,
        tipo: TipoDocumentoVehiculo.SEGURO,
        descripcion: 'Póliza de seguro · Sancor',
        vencimiento: seguroVencido ? diasAtras(1) : diasAdelante(entero(25, 300)),
        costo: plata(redondearMiles(entero(180_000, 640_000), 1_000)),
      },
      {
        vehiculoId: v.id,
        tipo: TipoDocumentoVehiculo.VTV,
        descripcion: 'Verificación técnica vehicular',
        vencimiento: vtvPorVencer ? diasAdelante(5) : diasAdelante(entero(30, 330)),
        costo: plata(redondearMiles(entero(45_000, 120_000), 1_000)),
      },
      {
        vehiculoId: v.id,
        tipo: TipoDocumentoVehiculo.PATENTE,
        descripcion: 'Patente municipal del período',
        vencimiento: diasAdelante(entero(10, 90)),
        costo: plata(redondearMiles(entero(60_000, 320_000), 1_000)),
      },
      {
        vehiculoId: v.id,
        tipo: TipoDocumentoVehiculo.CEDULA,
        descripcion: 'Cédula verde',
        vencimiento: diasAdelante(entero(200, 900)),
      },
    ]

    if (v.def.tipo === TipoVehiculo.CAMION) {
      aCargar.push(
        {
          vehiculoId: v.id,
          tipo: TipoDocumentoVehiculo.RUTA,
          descripcion: 'RUTA · Registro Único del Transporte Automotor',
          vencimiento: diasAdelante(entero(40, 400)),
          costo: plata(redondearMiles(entero(30_000, 90_000), 1_000)),
        },
        {
          vehiculoId: v.id,
          tipo: TipoDocumentoVehiculo.MATAFUEGO,
          descripcion: 'Carga de matafuego',
          vencimiento: diasAdelante(entero(15, 300)),
          costo: plata(28_000),
        },
      )
    }

    await db.documentoVehiculo.createMany({ data: aCargar })
    documentos += aCargar.length
  }
  paso(`${documentos} documentos de vehículo · VTV por vencer y seguro vencido plantados`)

  // ------------------------------ viajes -----------------------------
  const transitables = creados.filter((v) => v.def.tipo !== TipoVehiculo.MAQUINA_VIAL)

  const ORIGENES = [
    'Depósito Central · Olivos',
    'Depósito Pilar',
    'Hierromat · Munro',
    'Corralón Norte · San Fernando',
    'Hormigonera Lomax · Tigre',
    'Obrador Santa Rita',
  ]

  const tiposDeViaje = [
    TipoViaje.ENTREGA_MATERIALES,
    TipoViaje.ENTREGA_MATERIALES,
    TipoViaje.RETIRO_EN_PROVEEDOR,
    TipoViaje.TRASLADO_HERRAMIENTAS,
    TipoViaje.TRASLADO_PERSONAL,
    TipoViaje.RETIRO_ESCOMBROS,
    TipoViaje.TRAMITE,
  ]

  let viajesFinalizados = 0

  // 34 viajes ya finalizados en los últimos 30 días.
  for (let i = 0; i < 34; i++) {
    const v = uno(transitables)
    const obra = uno(obrasActivas)
    const fecha = fechaEntre(diasAtras(30), diasAtras(1))
    const salida = aHora(fecha, entero(7, 14), uno([0, 15, 30]))
    const kmRecorridos = entero(18, 140)
    const kmSalida = v.def.kmActual - entero(1_000, 12_000)
    const peajes = chance(0.4) ? redondearMiles(entero(3_000, 14_000), 500) : 0
    const costoKm = v.def.costoKm
    const costo = kmRecorridos * costoKm + peajes

    await db.viaje.create({
      data: {
        vehiculoId: v.id,
        choferId: v.chofer.id,
        obraId: obra.id,
        tipo: uno(tiposDeViaje),
        estado: EstadoViaje.FINALIZADO,
        origen: uno(ORIGENES),
        destino: `Obra ${obra.codigo}`,
        descripcionCarga: uno([
          'Hierro del 8 y del 12',
          'Bolsas de cemento y cal',
          'Encofrado metálico',
          'Ladrillos cerámicos',
          'Herramientas para el frente nuevo',
          'Personal de la cuadrilla de estructura',
          'Escombros de demolición',
          'Arena y piedra',
        ]),
        pesoCargaKg: v.def.capacidadCargaKg
          ? entero(Math.round(v.def.capacidadCargaKg * 0.25), v.def.capacidadCargaKg)
          : null,
        salidaPrevista: salida,
        salidaReal: new Date(salida.getTime() + entero(-10, 35) * 60_000),
        llegadaReal: new Date(salida.getTime() + entero(70, 320) * 60_000),
        kmSalida,
        kmLlegada: kmSalida + kmRecorridos,
        peajes: plata(peajes),
        costoCalculado: plata(costo),
        observaciones: chance(0.2) ? uno(['Demora en la descarga.', 'Tránsito cortado en Panamericana.', 'Se esperó al capataz para recibir.']) : null,
      },
    })
    viajesFinalizados += 1
  }

  // 3 viajes en curso hoy: el vehículo queda EN_VIAJE.
  const enCurso = [transitables[1], transitables[4], transitables[6]]
  for (const [i, v] of enCurso.entries()) {
    const obra = obrasActivas[i % obrasActivas.length]
    const salida = aHora(hoy(), entero(7, 10), uno([0, 30]))

    await db.viaje.create({
      data: {
        vehiculoId: v.id,
        choferId: v.chofer.id,
        obraId: obra.id,
        tipo: TipoViaje.ENTREGA_MATERIALES,
        estado: EstadoViaje.EN_CURSO,
        origen: uno(ORIGENES),
        destino: `Obra ${obra.codigo}`,
        descripcionCarga: uno(['Hierro y malla', 'Cemento y cal', 'Encofrado']),
        pesoCargaKg: v.def.capacidadCargaKg ? Math.round(v.def.capacidadCargaKg * 0.7) : null,
        salidaPrevista: salida,
        salidaReal: salida,
        kmSalida: v.def.kmActual - entero(100, 600),
      },
    })

    await db.vehiculo.update({
      where: { id: v.id },
      data: { estado: EstadoVehiculo.EN_VIAJE },
    })
  }

  // 3 viajes programados para mañana.
  for (let i = 0; i < 3; i++) {
    const v = transitables[(i + 2) % transitables.length]
    const obra = obrasActivas[(i + 1) % obrasActivas.length]
    await db.viaje.create({
      data: {
        vehiculoId: v.id,
        choferId: v.chofer.id,
        obraId: obra.id,
        tipo: uno(tiposDeViaje),
        estado: EstadoViaje.PROGRAMADO,
        origen: uno(ORIGENES),
        destino: `Obra ${obra.codigo}`,
        descripcionCarga: uno(['Ladrillos y mortero', 'Puntales y tablones', 'Membrana y perfiles']),
        pesoCargaKg: v.def.capacidadCargaKg ? Math.round(v.def.capacidadCargaKg * 0.5) : null,
        salidaPrevista: aHora(diasAdelante(1), entero(7, 11), 0),
      },
    })
  }
  paso(`40 viajes · ${viajesFinalizados} finalizados, 3 en curso, 3 programados`)

  // Un vehículo entra al taller.
  await db.vehiculo.update({
    where: { id: vehiculos.camion6t.id },
    data: { estado: EstadoVehiculo.EN_TALLER },
  })

  // ------------------------- solicitudes de viaje --------------------
  // Una urgente sin asignar: es uno de los problemas plantados.
  await db.solicitudViaje.create({
    data: {
      obraId: nucleo.obras.santaRita.id,
      solicitanteId: nucleo.usuarios.jefe2,
      tipo: TipoViaje.ENTREGA_MATERIALES,
      origen: 'Hierromat · Munro',
      destino: 'Obra Santa Rita · Benavídez',
      descripcionCarga: 'Hierro del 10 y del 16 para las vigas del sector B. Sin esto mañana para la cuadrilla de armado.',
      pesoEstimadoKg: 4_200,
      fechaHoraNecesaria: aHora(hoy(), 14, 0),
      prioridad: Prioridad.URGENTE,
      estado: EstadoSolicitudViaje.PENDIENTE,
      creadaEn: diasAtras(1),
    },
  })

  await db.solicitudViaje.create({
    data: {
      obraId: nucleo.obras.losRobles.id,
      solicitanteId: nucleo.usuarios.capataz,
      tipo: TipoViaje.RETIRO_ESCOMBROS,
      origen: 'Obra Los Robles · Martínez',
      destino: 'Volquetes del Norte · San Isidro',
      descripcionCarga: 'Escombro de demolición del contrapiso viejo',
      pesoEstimadoKg: 5_500,
      fechaHoraNecesaria: aHora(diasAdelante(2), 8, 0),
      prioridad: Prioridad.NORMAL,
      estado: EstadoSolicitudViaje.PENDIENTE,
      creadaEn: diasAtras(1),
    },
  })

  await db.solicitudViaje.create({
    data: {
      obraId: nucleo.obras.torreAlvear.id,
      solicitanteId: nucleo.usuarios.arquitecta,
      tipo: TipoViaje.TRASLADO_PERSONAL,
      origen: 'Depósito Central · Olivos',
      destino: 'Obra Torre Alvear · Vicente López',
      cantidadPersonas: 6,
      fechaHoraNecesaria: aHora(diasAdelante(3), 7, 0),
      prioridad: Prioridad.BAJA,
      estado: EstadoSolicitudViaje.PENDIENTE,
      creadaEn: hoy(),
    },
  })

  await db.solicitudViaje.create({
    data: {
      obraId: nucleo.obras.torreAlvear.id,
      solicitanteId: nucleo.usuarios.jefe2,
      tipo: TipoViaje.RETIRO_EN_PROVEEDOR,
      origen: 'Corralón Norte · San Fernando',
      destino: 'Obra Torre Alvear · Vicente López',
      descripcionCarga: 'Aberturas de aluminio',
      pesoEstimadoKg: 900,
      fechaHoraNecesaria: aHora(diasAtras(2), 9, 0),
      prioridad: Prioridad.NORMAL,
      estado: EstadoSolicitudViaje.RECHAZADA,
      motivoRechazo: 'El proveedor entrega con flete propio sin costo. No hace falta mandar un vehículo.',
      creadaEn: diasAtras(4),
    },
  })
  paso('4 solicitudes de viaje · 1 urgente sin asignar')

  // --------------------------- combustible ---------------------------
  let cargas = 0
  for (const v of transitables) {
    let km = v.def.kmActual - entero(4_000, 9_000)
    for (let i = 0; i < entero(4, 7); i++) {
      km += entero(420, 950)
      const litrosCarga = entero(55, 190)
      // Un vehículo tiene el consumo disparado: dispara la alerta.
      const litrosFinal = v.clave === 'camion6t' && i >= 4 ? Math.round(litrosCarga * 1.35) : litrosCarga
      const precioLitro = v.def.combustible === Combustible.DIESEL ? entero(1_480, 1_680) : entero(1_520, 1_760)

      await db.cargaCombustible.create({
        data: {
          vehiculoId: v.id,
          choferId: v.chofer.id,
          fecha: fechaEntre(diasAtras(60), diasAtras(1)),
          litros: plata(litrosFinal),
          monto: plata(litrosFinal * precioLitro),
          km,
          estacion: uno(['YPF Panamericana', 'Shell Maipú', 'Axion Pilar', 'YPF Ruta 26', 'Puma Escobar']),
          obraId: chance(0.5) ? uno(obrasActivas).id : null,
        },
      })
      cargas += 1
    }
  }
  paso(`${cargas} cargas de combustible`)

  // -------------------------- mantenimiento --------------------------
  let mantenimientos = 0
  for (const v of creados) {
    const cantidad = entero(2, 4)
    for (let i = 0; i < cantidad; i++) {
      const tipo = chance(0.7) ? TipoMantenimiento.PREVENTIVO : TipoMantenimiento.CORRECTIVO
      const kmService = v.def.kmActual - entero(2_000, 40_000)
      const esUltimo = i === cantidad - 1

      await db.mantenimientoVehiculo.create({
        data: {
          vehiculoId: v.id,
          tipo,
          fecha: fechaEntre(diasAtras(400), diasAtras(10)),
          km: v.def.tipo === TipoVehiculo.MAQUINA_VIAL ? null : kmService,
          descripcion:
            tipo === TipoMantenimiento.PREVENTIVO
              ? uno(['Service de 10.000 km: aceite, filtros y revisión general.', 'Cambio de correa de distribución.', 'Rotación y balanceo de cubiertas.'])
              : uno(['Cambio de embrague.', 'Reparación de sistema de frenos.', 'Cambio de alternador.', 'Reparación de caja de dirección.']),
          taller: uno(['Taller Mecánico Pilar', 'Service Oficial Iveco', 'Gomería y Tren Delantero Norte', 'Diesel Norte S.R.L.']),
          costo: plata(redondearMiles(entero(280_000, 3_400_000), 10_000)),
          // El último service deja marcado el próximo, por km y por fecha.
          proximoKm: esUltimo && v.def.tipo !== TipoVehiculo.MAQUINA_VIAL
            // Dos quedan a menos de 1.000 km: dispara la alerta de service próximo.
            ? v.clave === 'camion8t' || v.clave === 'pickup2'
              ? v.def.kmActual + entero(300, 900)
              : v.def.kmActual + entero(3_000, 12_000)
            : null,
          proximaFecha: esUltimo
            ? v.clave === 'utilitario1'
              ? diasAdelante(entero(3, 13))
              : diasAdelante(entero(40, 220))
            : null,
        },
      })
      mantenimientos += 1
    }
  }
  paso(`${mantenimientos} mantenimientos de flota`)

  // ---------------------------- incidentes ---------------------------
  await db.incidenteVehiculo.create({
    data: {
      vehiculoId: vehiculos.camion8t.id,
      choferId: personal.choferPrincipal.id,
      tipo: TipoIncidenteVehiculo.MULTA,
      fecha: diasAtras(23),
      descripcion: 'Exceso de velocidad en Ruta 202, radar km 12. Acta municipal de Tigre.',
      monto: plata(186_000),
      resuelto: false,
    },
  })

  await db.incidenteVehiculo.create({
    data: {
      vehiculoId: vehiculos.pickup2.id,
      choferId: choferes[1 % choferes.length].id,
      tipo: TipoIncidenteVehiculo.SINIESTRO,
      fecha: diasAtras(47),
      descripcion: 'Choque en la parte trasera al estacionar en obra. Se hizo la denuncia al seguro.',
      monto: plata(890_000),
      resuelto: true,
    },
  })

  await db.incidenteVehiculo.create({
    data: {
      vehiculoId: vehiculos.camion6t.id,
      tipo: TipoIncidenteVehiculo.ROTURA,
      fecha: diasAtras(6),
      descripcion: 'Rotura del sistema hidráulico del volcador. Por eso está en el taller.',
      monto: plata(1_640_000),
      resuelto: false,
    },
  })
  paso('3 incidentes')

  return { vehiculos }
}
