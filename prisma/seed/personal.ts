/* =====================================================================
   Seed · PERSONAL
   60 empleados, subcontratistas, cuadrillas, asignaciones, 45 días
   hábiles de partes diarios, quincenas, novedades y pagos.

   Lo importante para la demo: los partes tienen que dar un costo de mano
   de obra creíble por obra, porque de ahí sale el tablero del dueño.
   ===================================================================== */

import {
  Asistencia,
  CategoriaLaboral,
  Clima,
  EstadoParte,
  EstadoQuincena,
  MedioPago,
  PrismaClient,
  RubroSubcontratista,
  TipoDocumentoEmpleado,
  TipoDocumentoSubcontratista,
  TipoNovedad,
} from '@prisma/client'
import type { ContextoNucleo } from './nucleo'
import {
  chance,
  cuilDesdeDni,
  decimal,
  diaHabilAnterior,
  diasAdelante,
  diasAtras,
  direccionZonaNorte,
  dniFicticio,
  entero,
  fechaEntre,
  hoy,
  legajo,
  LOCALIDADES_ZONA_NORTE,
  mesesAtras,
  paso,
  personaUnica,
  plata,
  quincenaAnterior,
  quincenaDe,
  redondearMiles,
  telefonoMovil,
  titulo,
  ultimosDiasHabiles,
  uno,
  varios,
} from './comun'

/* ------------------------ valores del convenio ----------------------- */

/** Valor hora vigente hoy, por categoría del convenio de la construcción. */
const VALOR_HORA: Record<CategoriaLaboral, number> = {
  OFICIAL_ESPECIALIZADO: 5200,
  OFICIAL: 4500,
  MEDIO_OFICIAL: 3900,
  AYUDANTE: 3400,
  SERENO: 3200,
  CAPATAZ: 6300,
  CHOFER: 4800,
  ADMINISTRATIVO: 4200,
  OTRO: 3600,
}

/** El aumento de paritaria fue hace dos meses: antes se cobraba un 18% menos. */
const FACTOR_ANTES_DEL_AUMENTO = 1 / 1.18

const ESPECIALIDADES: Record<string, readonly string[]> = {
  OFICIAL_ESPECIALIZADO: ['armador', 'encofrador', 'hormigonero', 'soldador', 'gruista'],
  OFICIAL: ['albañil', 'armador', 'encofrador', 'colocador', 'revocador', 'hormigonero'],
  MEDIO_OFICIAL: ['albañil', 'encofrador', 'colocador', 'ayudante de armador'],
  AYUDANTE: ['general', 'limpieza de obra', 'acarreo'],
  CAPATAZ: ['estructura', 'terminaciones', 'movimiento de suelos'],
  CHOFER: ['camión volcador', 'camión con hidrogrúa', 'utilitario'],
  SERENO: ['nocturno'],
}

const TALLES_ROPA = ['S', 'M', 'L', 'XL', 'XXL']
const TALLES_CALZADO = ['39', '40', '41', '42', '43', '44', '45']

const PLANTEL: Array<{ categoria: CategoriaLaboral; cantidad: number }> = [
  { categoria: CategoriaLaboral.CAPATAZ, cantidad: 8 },
  { categoria: CategoriaLaboral.CHOFER, cantidad: 5 },
  { categoria: CategoriaLaboral.OFICIAL_ESPECIALIZADO, cantidad: 10 },
  { categoria: CategoriaLaboral.OFICIAL, cantidad: 16 },
  { categoria: CategoriaLaboral.MEDIO_OFICIAL, cantidad: 12 },
  { categoria: CategoriaLaboral.AYUDANTE, cantidad: 7 },
  { categoria: CategoriaLaboral.SERENO, cantidad: 2 },
]

export interface EmpleadoSembrado {
  id: string
  legajo: string
  nombre: string
  apellido: string
  categoria: CategoriaLaboral
  valorHora: number
  /** Valor hora anterior al aumento de hace dos meses. */
  valorHoraPrevio: number
}

export interface ContextoPersonal {
  empleados: EmpleadoSembrado[]
  /** Empleados vinculados a un usuario: el capataz y el chofer. */
  capatazPrincipal: EmpleadoSembrado
  choferPrincipal: EmpleadoSembrado
  choferes: EmpleadoSembrado[]
  subcontratistas: Array<{ id: string; razonSocial: string }>
  /** Qué empleados están asignados a cada obra. */
  asignacionPorObra: Record<string, EmpleadoSembrado[]>
  /** Costo de mano de obra acumulado por obra, ya calculado desde los partes. */
  costoManoObraPorObra: Record<string, number>
  fechaAumento: Date
}

/** Valor hora que corresponde aplicar en una fecha dada. */
function valorHoraEn(e: EmpleadoSembrado, fecha: Date, fechaAumento: Date): number {
  return fecha < fechaAumento ? e.valorHoraPrevio : e.valorHora
}

/** Regla de CLAUDE.md: normales × vh + extra50 × vh × 1,5 + extra100 × vh × 2 */
function costoLinea(
  vh: number,
  normales: number,
  extra50: number,
  extra100: number,
): number {
  return vh * normales + vh * extra50 * 1.5 + vh * extra100 * 2
}

export async function sembrarPersonal(
  db: PrismaClient,
  nucleo: ContextoNucleo,
): Promise<ContextoPersonal> {
  titulo('Personal')

  const fechaAumento = mesesAtras(2)

  // ---------------------------- empleados ----------------------------
  const empleados: EmpleadoSembrado[] = []
  let numeroLegajo = 100

  // Los dos primeros tienen nombre fijo porque están vinculados a un usuario.
  const fijos: Array<{
    nombre: string
    apellido: string
    categoria: CategoriaLaboral
    usuarioClave: 'capataz' | 'chofer'
  }> = [
    { nombre: 'Martín', apellido: 'Quiroga', categoria: CategoriaLaboral.CAPATAZ, usuarioClave: 'capataz' },
    { nombre: 'Roberto', apellido: 'Ledesma', categoria: CategoriaLaboral.CHOFER, usuarioClave: 'chofer' },
  ]

  const aCrear: Array<{
    nombre: string
    apellido: string
    categoria: CategoriaLaboral
    usuarioClave?: 'capataz' | 'chofer'
  }> = [...fijos]

  // El resto del plantel, descontando los dos fijos de su categoría.
  for (const { categoria, cantidad } of PLANTEL) {
    const yaCreados = fijos.filter((f) => f.categoria === categoria).length
    for (let i = 0; i < cantidad - yaCreados; i++) {
      // Una parte del plantel administrativo y de obra es mujer.
      const genero = chance(0.12) ? 'M' : 'V'
      const { nombre, apellido } = personaUnica(genero)
      aCrear.push({ nombre, apellido, categoria })
    }
  }

  for (const [indice, def] of aCrear.entries()) {
    numeroLegajo += 1
    const valorHoraBase = VALOR_HORA[def.categoria]
    // Un poco de dispersión por antigüedad dentro de la misma categoría.
    const valorHora = redondearMiles(valorHoraBase * decimal(0.97, 1.09, 3), 50)
    const valorHoraPrevio = redondearMiles(valorHora * FACTOR_ANTES_DEL_AUMENTO, 50)

    const dni = dniFicticio(indice)
    const especialidades = ESPECIALIDADES[def.categoria] ?? ['general']

    const creado = await db.empleado.create({
      data: {
        legajo: legajo(numeroLegajo),
        nombre: def.nombre,
        apellido: def.apellido,
        dni,
        cuil: cuilDesdeDni(dni, chance(0.12) ? '27' : '20'),
        telefono: telefonoMovil(),
        direccion: direccionZonaNorte(),
        localidad: uno(LOCALIDADES_ZONA_NORTE),
        fechaIngreso: fechaEntre(mesesAtras(entero(3, 96)), diasAtras(30)),
        categoria: def.categoria,
        especialidad: uno(especialidades),
        valorHora: plata(valorHora),
        talleRopa: uno(TALLES_ROPA),
        talleCalzado: uno(TALLES_CALZADO),
        contactoEmergenciaNombre: `${uno(['María', 'Norma', 'Claudia', 'Rosa', 'Gladys', 'Mónica'])} ${def.apellido}`,
        contactoEmergenciaTelefono: telefonoMovil(),
      },
    })

    const sembrado: EmpleadoSembrado = {
      id: creado.id,
      legajo: creado.legajo,
      nombre: creado.nombre,
      apellido: creado.apellido,
      categoria: creado.categoria,
      valorHora,
      valorHoraPrevio,
    }
    empleados.push(sembrado)

    // Historial de valor hora: el valor previo y el aumento de hace dos meses.
    await db.historialValorHora.createMany({
      data: [
        {
          empleadoId: creado.id,
          valorHora: plata(valorHoraPrevio),
          desde: mesesAtras(10),
          motivo: 'Paritaria UOCRA',
        },
        {
          empleadoId: creado.id,
          valorHora: plata(valorHora),
          desde: fechaAumento,
          motivo: 'Paritaria UOCRA · acuerdo del 18%',
        },
      ],
    })

    // Vincular con su usuario cuando corresponde.
    if (def.usuarioClave) {
      await db.usuario.update({
        where: { id: nucleo.usuarios[def.usuarioClave] },
        data: { empleadoId: creado.id },
      })
    }
  }

  const capatazPrincipal = empleados[0]
  const choferPrincipal = empleados[1]
  const choferes = empleados.filter((e) => e.categoria === CategoriaLaboral.CHOFER)
  paso(`${empleados.length} empleados con historial de valor hora`)

  // -------------------------- documentación --------------------------
  // Dos empleados con documentación vencida: es uno de los problemas
  // plantados a propósito para que la demo muestre la alerta.
  const conDocVencida = [empleados[7], empleados[23]]

  let documentos = 0
  for (const e of empleados) {
    const vencida = conDocVencida.includes(e)

    const aptoMedico = {
      empleadoId: e.id,
      tipo: TipoDocumentoEmpleado.APTO_MEDICO,
      descripcion: 'Apto médico preocupacional',
      emision: diasAtras(entero(300, 400)),
      vencimiento: vencida ? diasAtras(entero(5, 20)) : diasAdelante(entero(20, 300)),
    }

    const altaArt = {
      empleadoId: e.id,
      tipo: TipoDocumentoEmpleado.ALTA_ART,
      descripcion: 'Alta temprana ART',
      emision: diasAtras(entero(200, 700)),
      vencimiento: diasAdelante(entero(60, 400)),
    }

    const cursoSeguridad = {
      empleadoId: e.id,
      tipo: TipoDocumentoEmpleado.CURSO_SEGURIDAD,
      descripcion: 'Curso de seguridad e higiene en obra',
      emision: diasAtras(entero(100, 500)),
      // Algunos por vencer dentro de los 15 días: dispara la alerta de aviso.
      vencimiento: chance(0.08) ? diasAdelante(entero(3, 14)) : diasAdelante(entero(40, 500)),
    }

    // Se tipa explícito porque después se le empuja la licencia de
    // conducir y TypeScript infiere el tipo del literal inicial.
    const aCargar: Array<{
      empleadoId: string
      tipo: TipoDocumentoEmpleado
      descripcion: string
      emision: Date
      vencimiento: Date
    }> = [aptoMedico, altaArt, cursoSeguridad]

    // Los choferes además tienen licencia de conducir.
    if (e.categoria === CategoriaLaboral.CHOFER) {
      aCargar.push({
        empleadoId: e.id,
        tipo: TipoDocumentoEmpleado.LICENCIA_CONDUCIR,
        descripcion: 'Licencia nacional de conducir · clase E1',
        emision: diasAtras(entero(400, 1000)),
        // Roberto Ledesma es el chofer con la licencia por vencer en 10 días.
        vencimiento: e.id === choferPrincipal.id ? diasAdelante(10) : diasAdelante(entero(120, 900)),
      })
    }

    await db.documentoEmpleado.createMany({ data: aCargar })
    documentos += aCargar.length
  }
  paso(`${documentos} documentos de empleado`)

  // ----------------------------- EPP ---------------------------------
  const ELEMENTOS_EPP = [
    { elemento: 'Casco de seguridad', marca: 'Libus' },
    { elemento: 'Botines con puntera', marca: 'Ombu' },
    { elemento: 'Guantes de descarne', marca: 'Vulcano' },
    { elemento: 'Anteojos de seguridad', marca: '3M' },
    { elemento: 'Arnés de seguridad', marca: 'Libus' },
    { elemento: 'Ropa de trabajo · pantalón y camisa', marca: 'Pampero' },
    { elemento: 'Protector auditivo', marca: '3M' },
    { elemento: 'Faja lumbar', marca: 'Ombu' },
  ]

  let entregasEpp = 0
  for (const e of empleados) {
    for (const item of varios(ELEMENTOS_EPP, entero(3, 6))) {
      await db.entregaEpp.create({
        data: {
          empleadoId: e.id,
          elemento: item.elemento,
          marca: item.marca,
          cantidad: 1,
          fecha: fechaEntre(mesesAtras(10), diasAtras(5)),
          firmado: chance(0.88),
        },
      })
      entregasEpp += 1
    }
  }
  paso(`${entregasEpp} entregas de elementos de protección`)

  // ------------------------- subcontratistas -------------------------
  const SUBCONTRATISTAS = [
    { razonSocial: 'Electricidad Maidana S.R.L.', rubro: RubroSubcontratista.ELECTRICIDAD, contacto: 'Jorge Maidana' },
    { razonSocial: 'Sanitarios del Norte', rubro: RubroSubcontratista.PLOMERIA, contacto: 'Ariel Sosa' },
    { razonSocial: 'Yesería Hermanos Cáceres', rubro: RubroSubcontratista.YESERIA, contacto: 'Ramón Cáceres' },
    { razonSocial: 'Herrería Pilar S.A.', rubro: RubroSubcontratista.HERRERIA, contacto: 'Walter Godoy' },
    { razonSocial: 'Pinturas Delta', rubro: RubroSubcontratista.PINTURA, contacto: 'Silvia Rojas' },
    { razonSocial: 'Excavaciones Benavídez', rubro: RubroSubcontratista.EXCAVACION, contacto: 'Héctor Vera' },
    { razonSocial: 'Climatización Integral S.R.L.', rubro: RubroSubcontratista.CLIMATIZACION, contacto: 'Pablo Ibarra' },
  ]

  const subcontratistas: Array<{ id: string; razonSocial: string }> = []
  for (const [i, s] of SUBCONTRATISTAS.entries()) {
    const dni = dniFicticio(500 + i)
    const creado = await db.subcontratista.create({
      data: {
        razonSocial: s.razonSocial,
        cuit: cuilDesdeDni(dni, '23').replace(/^23/, '30'),
        rubro: s.rubro,
        contacto: s.contacto,
        telefono: telefonoMovil(),
        email: `contacto@${s.razonSocial.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14)}.com.ar`,
      },
    })
    subcontratistas.push({ id: creado.id, razonSocial: creado.razonSocial })

    // El segundo tiene la ART vencida: con presencia registrada en obra,
    // dispara la alerta crítica de responsabilidad legal.
    const artVencida = i === 1

    await db.documentoSubcontratista.createMany({
      data: [
        {
          subcontratistaId: creado.id,
          tipo: TipoDocumentoSubcontratista.ART_NOMINA,
          descripcion: 'Nómina de ART del mes',
          vencimiento: artVencida ? diasAtras(11) : diasAdelante(entero(10, 60)),
        },
        {
          subcontratistaId: creado.id,
          tipo: TipoDocumentoSubcontratista.SEGURO_RESPONSABILIDAD_CIVIL,
          descripcion: 'Seguro de responsabilidad civil',
          vencimiento: diasAdelante(entero(30, 300)),
        },
        {
          subcontratistaId: creado.id,
          tipo: TipoDocumentoSubcontratista.CONSTANCIA_ARCA,
          descripcion: 'Constancia de inscripción ARCA',
          vencimiento: diasAdelante(entero(60, 400)),
        },
      ],
    })
  }
  paso(`${subcontratistas.length} subcontratistas con documentación`)

  // ---------------------------- cuadrillas ---------------------------
  const capataces = empleados.filter((e) => e.categoria === CategoriaLaboral.CAPATAZ)
  const operarios = empleados.filter(
    (e) =>
      e.categoria !== CategoriaLaboral.CAPATAZ &&
      e.categoria !== CategoriaLaboral.CHOFER &&
      e.categoria !== CategoriaLaboral.SERENO,
  )

  const NOMBRES_CUADRILLA = [
    'Estructura A', 'Estructura B', 'Encofrado', 'Albañilería 1',
    'Albañilería 2', 'Terminaciones', 'Hormigón', 'Movimiento de suelos',
  ]

  // Un empleado va a una sola cuadrilla activa (regla de CLAUDE.md).
  const sinCuadrilla = [...operarios]
  const cuadrillas: Array<{ id: string; miembros: EmpleadoSembrado[]; capataz: EmpleadoSembrado }> = []

  for (const [i, nombre] of NOMBRES_CUADRILLA.entries()) {
    const capataz = capataces[i % capataces.length]
    const cantidad = Math.min(entero(4, 6), sinCuadrilla.length)
    const miembros = sinCuadrilla.splice(0, cantidad)

    const creada = await db.cuadrilla.create({
      data: {
        nombre: `Cuadrilla ${nombre}`,
        capatazId: capataz.id,
        miembros: {
          create: miembros.map((m) => ({ empleadoId: m.id })),
        },
      },
    })
    cuadrillas.push({ id: creada.id, miembros, capataz })
  }
  paso(`${cuadrillas.length} cuadrillas`)

  // --------------------------- asignaciones --------------------------
  // Las obras en curso con gente. Los departamentos de alquiler no llevan
  // plantel propio.
  const obrasConPersonal = [
    nucleo.obras.losRobles,
    nucleo.obras.santaRita,
    nucleo.obras.torreAlvear,
    nucleo.obras.cordoba,
    nucleo.obras.neuquen,
    nucleo.obras.colectora,
  ]

  const asignacionPorObra: Record<string, EmpleadoSembrado[]> = {}
  for (const o of obrasConPersonal) asignacionPorObra[o.id] = []

  // El capataz principal va a Los Robles: es la obra que ve en su inicio.
  const obraDelCapataz = nucleo.obras.losRobles

  for (const [i, cuadrilla] of cuadrillas.entries()) {
    const obra =
      cuadrilla.capataz.id === capatazPrincipal.id
        ? obraDelCapataz
        : obrasConPersonal[i % obrasConPersonal.length]

    await db.asignacionObra.create({
      data: {
        obraId: obra.id,
        cuadrillaId: cuadrilla.id,
        desde: diasAtras(entero(40, 120)),
        tarea: 'Trabajo de cuadrilla',
      },
    })

    for (const m of [cuadrilla.capataz, ...cuadrilla.miembros]) {
      // Un empleado puede aparecer como capataz de dos cuadrillas; lo
      // asignamos una sola vez a una obra.
      if (Object.values(asignacionPorObra).some((lista) => lista.includes(m))) continue

      await db.asignacionObra.create({
        data: {
          obraId: obra.id,
          empleadoId: m.id,
          desde: diasAtras(entero(30, 110)),
          tarea: m.categoria === CategoriaLaboral.CAPATAZ ? 'Conducción de obra' : null,
        },
      })
      asignacionPorObra[obra.id].push(m)
    }
  }

  // Los serenos y los choferes que no quedaron en ninguna cuadrilla.
  const sueltos = empleados.filter(
    (e) => !Object.values(asignacionPorObra).some((lista) => lista.includes(e)),
  )
  // Tres quedan sin asignación a propósito: dispara la alerta de
  // "empleado activo sin asignación".
  const aAsignar = sueltos.slice(0, Math.max(0, sueltos.length - 3))

  for (const [i, e] of aAsignar.entries()) {
    const obra = obrasConPersonal[i % obrasConPersonal.length]
    await db.asignacionObra.create({
      data: {
        obraId: obra.id,
        empleadoId: e.id,
        desde: diasAtras(entero(20, 90)),
        tarea: e.categoria === CategoriaLaboral.SERENO ? 'Serenazgo nocturno' : 'Logística de obra',
      },
    })
    asignacionPorObra[obra.id].push(e)
  }

  // Subcontratistas asignados a obras.
  for (const [i, s] of subcontratistas.entries()) {
    const obra = obrasConPersonal[i % obrasConPersonal.length]
    await db.asignacionObra.create({
      data: {
        obraId: obra.id,
        subcontratistaId: s.id,
        desde: diasAtras(entero(15, 70)),
        tarea: 'Trabajo subcontratado',
      },
    })
  }
  paso(
    `Asignaciones vigentes · ${Object.values(asignacionPorObra).reduce((a, l) => a + l.length, 0)} personas en obra, ${sueltos.length - aAsignar.length} sin asignar`,
  )

  // -------------------------- partes diarios -------------------------
  const diasHabiles = ultimosDiasHabiles(45)
  // Dos días de suspensión por lluvia, iguales para todas las obras de AMBA.
  const diasDeLluvia = [diasHabiles[12], diasHabiles[31]]
  const ayerHabil = diaHabilAnterior()

  // Una obra en curso se queda sin el parte de ayer, a propósito.
  const obraSinParteDeAyer = nucleo.obras.torreAlvear

  const costoManoObraPorObra: Record<string, number> = {}
  let partesCreados = 0
  let lineasCreadas = 0

  for (const obra of obrasConPersonal) {
    const plantel = asignacionPorObra[obra.id]
    if (plantel.length === 0) continue
    costoManoObraPorObra[obra.id] = 0

    for (const dia of diasHabiles) {
      if (obra.id === obraSinParteDeAyer.id && dia.getTime() === ayerHabil.getTime()) {
        continue
      }

      const esLluvia = diasDeLluvia.some((d) => d.getTime() === dia.getTime())
      // Las obras del interior no paran por la lluvia de Buenos Aires.
      const esObraInterior = obra.id === nucleo.obras.cordoba.id || obra.id === nucleo.obras.neuquen.id
      const paroPorLluvia = esLluvia && !esObraInterior

      // Los últimos tres días quedan sin aprobar: uno en borrador y dos
      // enviados, para que el jefe de obra tenga algo que revisar.
      const diasDesdeHoy = Math.round((hoy().getTime() - dia.getTime()) / 86_400_000)
      const estado =
        diasDesdeHoy <= 1
          ? EstadoParte.BORRADOR
          : diasDesdeHoy <= 4
            ? EstadoParte.ENVIADO
            : EstadoParte.APROBADO

      const clima = paroPorLluvia
        ? Clima.LLUVIA_CON_PARO
        : esLluvia
          ? Clima.LLUVIA
          : uno([Clima.DESPEJADO, Clima.DESPEJADO, Clima.DESPEJADO, Clima.NUBLADO, Clima.VIENTO_FUERTE])

      const parte = await db.parteDiario.create({
        data: {
          obraId: obra.id,
          fecha: dia,
          clima,
          estado,
          cargadoPorId: nucleo.usuarios.capataz,
          aprobadoPorId: estado === EstadoParte.APROBADO ? nucleo.usuarios.jefe1 : null,
          enviadoEn: estado === EstadoParte.BORRADOR ? null : new Date(dia.getTime() + 17 * 3_600_000),
          aprobadoEn: estado === EstadoParte.APROBADO ? new Date(dia.getTime() + 30 * 3_600_000) : null,
          tareasDelDia: paroPorLluvia
            ? 'Jornada suspendida por lluvia.'
            : uno([
                'Armado de encofrado de losa.',
                'Hormigonado de columnas del nivel 3.',
                'Mampostería de cerramiento.',
                'Colocación de instalación sanitaria.',
                'Revoque grueso interior.',
                'Montaje de armaduras.',
                'Movimiento de suelos y nivelación.',
                'Colocación de contrapisos.',
              ]),
          observaciones: paroPorLluvia
            ? 'Se retiró el personal a las 9:30. No se registran horas trabajadas.'
            : chance(0.15)
              ? uno([
                  'Llegó el camión de hierro a las 11.',
                  'Faltó material de albañilería por la mañana.',
                  'Visita de inspección municipal.',
                  'Se trabajó con media cuadrilla por entrega de material.',
                ])
              : null,
        },
      })
      partesCreados += 1

      const vh = (e: EmpleadoSembrado) => valorHoraEn(e, dia, fechaAumento)

      for (const e of plantel) {
        let asistencia: Asistencia = Asistencia.PRESENTE
        let normales = 8
        let extra50 = 0
        let extra100 = 0

        if (paroPorLluvia) {
          asistencia = Asistencia.SUSPENSION_POR_LLUVIA
          normales = 0
        } else if (chance(0.045)) {
          asistencia = chance(0.6) ? Asistencia.AUSENTE_CON_AVISO : Asistencia.AUSENTE_SIN_AVISO
          normales = 0
        } else if (chance(0.02)) {
          asistencia = Asistencia.LICENCIA
          normales = 0
        } else if (chance(0.025)) {
          asistencia = Asistencia.MEDIA_JORNADA
          normales = 4
        } else if (chance(0.12)) {
          // Horas extra puntuales: hormigonado que se estira, cierre de losa.
          extra50 = uno([1, 2, 2, 3])
        } else if (chance(0.02)) {
          // Sábado o feriado trabajado: se paga al 100%.
          extra100 = uno([2, 3])
        }

        const valorHora = vh(e)
        const costo = costoLinea(valorHora, normales, extra50, extra100)
        const congelado = estado === EstadoParte.APROBADO

        await db.parteDiarioLinea.create({
          data: {
            parteId: parte.id,
            empleadoId: e.id,
            asistencia,
            horasNormales: plata(normales),
            horasExtra50: plata(extra50),
            horasExtra100: plata(extra100),
            tarea: chance(0.3) ? uno(ESPECIALIDADES[e.categoria] ?? ['general']) : null,
            // Solo los partes aprobados congelan valor hora y costo.
            valorHoraAplicado: congelado ? plata(valorHora) : null,
            costoCalculado: congelado ? plata(costo) : null,
          },
        })
        lineasCreadas += 1

        if (congelado) {
          costoManoObraPorObra[obra.id] += costo
        }
      }

      // Qué subcontratistas vinieron ese día.
      if (!paroPorLluvia && chance(0.45)) {
        const s = uno(subcontratistas)
        await db.parteSubcontratista.create({
          data: {
            parteId: parte.id,
            subcontratistaId: s.id,
            cantidadPersonas: entero(2, 6),
            tarea: 'Trabajo de su rubro',
          },
        })
      }
    }
  }
  paso(`${partesCreados} partes diarios · ${lineasCreadas} líneas de asistencia`)

  // ------------------------- ajuste de presupuesto -------------------
  // Dos de los problemas plantados: una obra al 92% de su presupuesto de
  // mano de obra y otra que ya lo pasó. En vez de inventar el número, se
  // ajusta el presupuesto contra el costo que realmente dieron los partes.
  const obraAl92 = nucleo.obras.losRobles
  const obraExcedida = nucleo.obras.colectora

  if (costoManoObraPorObra[obraAl92.id]) {
    await db.obra.update({
      where: { id: obraAl92.id },
      data: { presupuestoManoObra: plata(redondearMiles(costoManoObraPorObra[obraAl92.id] / 0.92)) },
    })
  }
  if (costoManoObraPorObra[obraExcedida.id]) {
    await db.obra.update({
      where: { id: obraExcedida.id },
      data: { presupuestoManoObra: plata(redondearMiles(costoManoObraPorObra[obraExcedida.id] / 1.07)) },
    })
  }
  paso('Presupuestos de mano de obra ajustados: una obra al 92% y otra excedida')

  // ---------------------------- novedades ----------------------------
  const obrasInterior = [nucleo.obras.cordoba, nucleo.obras.neuquen]
  let novedades = 0

  for (const e of varios(empleados, 28)) {
    const tipo = uno([
      TipoNovedad.ADELANTO,
      TipoNovedad.ADELANTO,
      TipoNovedad.VIATICO,
      TipoNovedad.PREMIO,
      TipoNovedad.REINTEGRO_GASTO,
      TipoNovedad.DESCUENTO,
    ])

    const esViatico = tipo === TipoNovedad.VIATICO
    const monto =
      tipo === TipoNovedad.ADELANTO
        ? redondearMiles(entero(80_000, 320_000), 10_000)
        : esViatico
          ? redondearMiles(entero(45_000, 140_000), 5_000)
          : redondearMiles(entero(15_000, 90_000), 5_000)

    await db.novedadPersonal.create({
      data: {
        empleadoId: e.id,
        tipo,
        fecha: fechaEntre(diasAtras(45), diasAtras(1)),
        monto: plata(monto),
        // Los viáticos son de las obras del interior: es donde de verdad pesan.
        obraId: esViatico ? uno(obrasInterior).id : null,
        descripcion: esViatico
          ? 'Viático por obra fuera de AMBA'
          : tipo === TipoNovedad.ADELANTO
            ? 'Adelanto de quincena'
            : tipo === TipoNovedad.PREMIO
              ? 'Premio por asistencia'
              : tipo === TipoNovedad.DESCUENTO
                ? 'Descuento por rotura de herramienta'
                : 'Reintegro de gasto de obra',
      },
    })
    novedades += 1
  }
  paso(`${novedades} novedades de personal`)

  return {
    empleados,
    capatazPrincipal,
    choferPrincipal,
    choferes,
    subcontratistas,
    asignacionPorObra,
    costoManoObraPorObra,
    fechaAumento,
  }
}

/* =====================================================================
   Quincenas. Van aparte porque necesitan los partes ya cargados.
   ===================================================================== */

export async function sembrarQuincenas(
  db: PrismaClient,
  nucleo: ContextoNucleo,
  personal: ContextoPersonal,
): Promise<void> {
  titulo('Quincenas')

  const actual = quincenaDe(hoy())
  const anterior = quincenaAnterior(actual)
  const anteAnterior = quincenaAnterior(anterior)

  const rangos = [
    { rango: anteAnterior, estado: EstadoQuincena.PAGADA },
    { rango: anterior, estado: EstadoQuincena.ENVIADA_AL_ESTUDIO },
    { rango: actual, estado: EstadoQuincena.ABIERTA },
  ]

  const creadas: Array<{ id: string; estado: EstadoQuincena; desde: Date; hasta: Date }> = []

  for (const { rango, estado } of rangos) {
    const cerrada = estado !== EstadoQuincena.ABIERTA
    const q = await db.quincena.create({
      data: {
        anio: rango.anio,
        mes: rango.mes,
        numero: rango.numero,
        desde: rango.desde,
        hasta: rango.hasta,
        estado,
        cerradaEn: cerrada ? new Date(rango.hasta.getTime() + 2 * 86_400_000) : null,
        cerradaPorId: cerrada ? nucleo.usuarios.admin : null,
      },
    })
    creadas.push({ id: q.id, estado, desde: rango.desde, hasta: rango.hasta })
  }
  paso(`3 quincenas · ${creadas.filter((c) => c.estado !== EstadoQuincena.ABIERTA).length} cerradas, 1 abierta`)

  // Las líneas de las quincenas cerradas salen de los partes aprobados
  // del período, agrupadas por empleado y obra.
  let lineas = 0
  for (const q of creadas.filter((c) => c.estado !== EstadoQuincena.ABIERTA)) {
    const partes = await db.parteDiario.findMany({
      where: {
        estado: EstadoParte.APROBADO,
        fecha: { gte: q.desde, lte: q.hasta },
      },
      select: {
        obraId: true,
        lineas: {
          select: {
            empleadoId: true,
            asistencia: true,
            horasNormales: true,
            horasExtra50: true,
            horasExtra100: true,
            costoCalculado: true,
          },
        },
      },
    })

    // Acumulador por empleado + obra.
    const acumulado = new Map<
      string,
      {
        empleadoId: string
        obraId: string
        dias: number
        normales: number
        extra50: number
        extra100: number
        ausencias: number
        costo: number
      }
    >()

    for (const parte of partes) {
      for (const l of parte.lineas) {
        const clave = `${l.empleadoId}|${parte.obraId}`
        const actual = acumulado.get(clave) ?? {
          empleadoId: l.empleadoId,
          obraId: parte.obraId,
          dias: 0,
          normales: 0,
          extra50: 0,
          extra100: 0,
          ausencias: 0,
          costo: 0,
        }

        const trabajo =
          l.asistencia === Asistencia.PRESENTE || l.asistencia === Asistencia.MEDIA_JORNADA
        const ausencia =
          l.asistencia === Asistencia.AUSENTE_CON_AVISO ||
          l.asistencia === Asistencia.AUSENTE_SIN_AVISO

        if (trabajo) actual.dias += 1
        if (ausencia) actual.ausencias += 1
        actual.normales += Number(l.horasNormales)
        actual.extra50 += Number(l.horasExtra50)
        actual.extra100 += Number(l.horasExtra100)
        actual.costo += Number(l.costoCalculado ?? 0)

        acumulado.set(clave, actual)
      }
    }

    for (const a of acumulado.values()) {
      await db.quincenaLinea.create({
        data: {
          quincenaId: q.id,
          empleadoId: a.empleadoId,
          obraId: a.obraId,
          diasTrabajados: a.dias,
          horasNormales: plata(a.normales),
          horasExtra50: plata(a.extra50),
          horasExtra100: plata(a.extra100),
          ausencias: a.ausencias,
          costo: plata(a.costo),
        },
      })
      lineas += 1
    }
  }
  paso(`${lineas} líneas de quincena congeladas`)

  // ------------------------------ pagos ------------------------------
  const quincenaPagada = creadas.find((c) => c.estado === EstadoQuincena.PAGADA)
  let pagos = 0

  if (quincenaPagada) {
    const lineasPagadas = await db.quincenaLinea.groupBy({
      by: ['empleadoId'],
      where: { quincenaId: quincenaPagada.id },
      _sum: { costo: true },
    })

    for (const l of lineasPagadas) {
      await db.pagoPersonal.create({
        data: {
          empleadoId: l.empleadoId,
          quincenaId: quincenaPagada.id,
          fecha: new Date(quincenaPagada.hasta.getTime() + 3 * 86_400_000),
          monto: plata(Number(l._sum.costo ?? 0)),
          medio: chance(0.7) ? MedioPago.TRANSFERENCIA : MedioPago.EFECTIVO,
          concepto: 'Quincena',
        },
      })
      pagos += 1
    }
  }

  // Pagos a subcontratistas por certificación de avance.
  for (const s of personal.subcontratistas) {
    for (let i = 0; i < entero(1, 3); i++) {
      await db.pagoPersonal.create({
        data: {
          subcontratistaId: s.id,
          fecha: fechaEntre(diasAtras(60), diasAtras(3)),
          monto: plata(redondearMiles(entero(1_800_000, 9_400_000), 50_000)),
          medio: uno([MedioPago.TRANSFERENCIA, MedioPago.ECHEQ, MedioPago.CHEQUE]),
          concepto: 'Certificación de avance',
        },
      })
      pagos += 1
    }
  }
  paso(`${pagos} pagos registrados`)
}
