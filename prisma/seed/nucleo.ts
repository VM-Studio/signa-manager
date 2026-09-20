/* =====================================================================
   Seed · NÚCLEO
   Unidades de negocio, usuarios, depósitos y obras.
   Todo lo demás cuelga de acá.
   ===================================================================== */

import { PrismaClient, EstadoObra, Rol, TipoObra } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  diasAtras,
  direccionZonaNorte,
  mesesAdelante,
  mesesAtras,
  paso,
  plata,
  telefonoMovil,
  titulo,
} from './comun'

export const CLAVE_DEMO = 'signa2026'

export interface ContextoNucleo {
  unidades: Record<string, string>
  usuarios: Record<string, string>
  depositos: Record<string, string>
  obras: Record<string, { id: string; codigo: string }>
}

/** Los usuarios del seed, que son los que se listan en el login de demo. */
export const USUARIOS_DEMO = [
  { clave: 'dueno', nombre: 'Eduardo Bianchi', email: 'eduardo@signa.demo', rol: Rol.DUENO, descripcion: 'Dueño' },
  { clave: 'admin', nombre: 'Silvana Robles', email: 'silvana@signa.demo', rol: Rol.ADMINISTRACION, descripcion: 'Administración' },
  { clave: 'rrhh', nombre: 'Carolina Paz', email: 'carolina@signa.demo', rol: Rol.RRHH, descripcion: 'Recursos humanos' },
  { clave: 'arquitecta', nombre: 'Malena Ferrari', email: 'malena@signa.demo', rol: Rol.ARQUITECTA, descripcion: 'Arquitecta de compras' },
  { clave: 'jefe1', nombre: 'Diego Sarmiento', email: 'diego@signa.demo', rol: Rol.JEFE_OBRA, descripcion: 'Jefe de obra' },
  { clave: 'jefe2', nombre: 'Hernán Costa', email: 'hernan@signa.demo', rol: Rol.JEFE_OBRA, descripcion: 'Jefe de obra' },
  { clave: 'capataz', nombre: 'Martín Quiroga', email: 'martin@signa.demo', rol: Rol.CAPATAZ, descripcion: 'Capataz' },
  { clave: 'panolero', nombre: 'Rubén Ferreyra', email: 'ruben@signa.demo', rol: Rol.PANOLERO, descripcion: 'Pañolero' },
  { clave: 'logistica', nombre: 'Nicolás Bustos', email: 'nicolas@signa.demo', rol: Rol.LOGISTICA, descripcion: 'Logística' },
  { clave: 'chofer', nombre: 'Roberto Ledesma', email: 'roberto@signa.demo', rol: Rol.CHOFER, descripcion: 'Chofer' },
] as const

const UNIDADES = [
  { codigo: 'CONSTRUCCION', nombre: 'Construcción', orden: 1 },
  { codigo: 'DESARROLLOS', nombre: 'Desarrollos', orden: 2 },
  { codigo: 'SERVICIOS', nombre: 'Prestación de servicios', orden: 3 },
  { codigo: 'OBRA_CIVIL', nombre: 'Obra civil', orden: 4 },
  { codigo: 'ALQUILERES', nombre: 'Alquileres temporarios', orden: 5 },
] as const

export async function sembrarNucleo(db: PrismaClient): Promise<ContextoNucleo> {
  titulo('Núcleo')

  // --------------------------- unidades ---------------------------
  const unidades: Record<string, string> = {}
  for (const u of UNIDADES) {
    const creada = await db.unidadNegocio.create({ data: u })
    unidades[u.codigo] = creada.id
  }
  paso(`${UNIDADES.length} unidades de negocio`)

  // --------------------------- usuarios ---------------------------
  // Un solo hash para los diez: bcrypt es lento a propósito y en el seed
  // no tiene sentido pagarlo diez veces con la misma contraseña.
  const hash = await bcrypt.hash(CLAVE_DEMO, 10)
  const usuarios: Record<string, string> = {}

  for (const u of USUARIOS_DEMO) {
    const creado = await db.usuario.create({
      data: {
        nombre: u.nombre,
        email: u.email,
        passwordHash: hash,
        rol: u.rol,
        telefono: telefonoMovil(),
        ultimoAcceso: diasAtras(u.clave === 'dueno' ? 0 : 1),
      },
    })
    usuarios[u.clave] = creado.id
  }
  paso(`${USUARIOS_DEMO.length} usuarios (contraseña ${CLAVE_DEMO})`)

  // --------------------------- depósitos ---------------------------
  const depositos: Record<string, string> = {}

  const central = await db.deposito.create({
    data: {
      nombre: 'Depósito Central',
      direccion: 'Av. Maipú 3240, Olivos',
      responsableId: usuarios.panolero,
    },
  })
  depositos.central = central.id

  const secundario = await db.deposito.create({
    data: {
      nombre: 'Depósito Pilar',
      direccion: 'Ruta 8 km 48, Pilar',
      responsableId: usuarios.panolero,
    },
  })
  depositos.secundario = secundario.id

  const obrador = await db.deposito.create({
    data: {
      nombre: 'Obrador Santa Rita',
      direccion: 'Ruta 26 y Los Aromos, Benavídez',
      responsableId: usuarios.logistica,
    },
  })
  depositos.obrador = obrador.id
  paso('3 depósitos')

  // ----------------------------- obras -----------------------------
  const anio = new Date().getFullYear()
  const anioPasado = anio - 1

  const definiciones = [
    {
      clave: 'losRobles',
      codigo: `SIG-${anio}-014`,
      nombre: 'Edificio Los Robles',
      unidad: 'CONSTRUCCION',
      tipo: TipoObra.PROPIA,
      estado: EstadoObra.EN_CURSO,
      cliente: null,
      localidad: 'Martínez',
      jefe: 'jefe1',
      inicio: mesesAtras(7),
      finPrevista: mesesAdelante(6),
      presupuestoManoObra: 58_400_000,
      presupuestoTotal: 412_000_000,
    },
    {
      clave: 'santaRita',
      codigo: `SIG-${anio}-021`,
      nombre: 'Barrio cerrado Santa Rita · 12 viviendas',
      unidad: 'CONSTRUCCION',
      tipo: TipoObra.TERCEROS,
      estado: EstadoObra.EN_CURSO,
      cliente: 'Desarrollos Benavídez S.A.',
      localidad: 'Benavídez',
      jefe: 'jefe2',
      inicio: mesesAtras(5),
      finPrevista: mesesAdelante(8),
      presupuestoManoObra: 71_200_000,
      presupuestoTotal: 389_500_000,
    },
    {
      clave: 'torreAlvear',
      codigo: `SIG-${anioPasado}-032`,
      nombre: 'Torre Alvear · 9 pisos',
      unidad: 'DESARROLLOS',
      tipo: TipoObra.PROPIA,
      estado: EstadoObra.EN_CURSO,
      cliente: null,
      localidad: 'Vicente López',
      jefe: 'jefe1',
      inicio: mesesAtras(14),
      finPrevista: mesesAdelante(4),
      presupuestoManoObra: 96_800_000,
      presupuestoTotal: 715_000_000,
    },
    {
      clave: 'cordoba',
      codigo: `SIG-${anio}-008`,
      nombre: 'Hormigón elaborado · Planta Córdoba',
      unidad: 'SERVICIOS',
      tipo: TipoObra.TERCEROS,
      estado: EstadoObra.EN_CURSO,
      cliente: 'Constructora Mediterránea S.R.L.',
      localidad: 'Córdoba',
      provincia: 'Córdoba',
      esInterior: true,
      jefe: 'jefe1',
      inicio: mesesAtras(3),
      finPrevista: mesesAdelante(2),
      presupuestoManoObra: 18_900_000,
      presupuestoTotal: 96_400_000,
    },
    {
      clave: 'neuquen',
      codigo: `SIG-${anio}-011`,
      nombre: 'Bases de hormigón · Parque eólico Neuquén',
      unidad: 'SERVICIOS',
      tipo: TipoObra.TERCEROS,
      estado: EstadoObra.EN_CURSO,
      cliente: 'Energías del Sur S.A.',
      localidad: 'Añelo',
      provincia: 'Neuquén',
      esInterior: true,
      jefe: 'jefe2',
      inicio: mesesAtras(2),
      finPrevista: mesesAdelante(5),
      presupuestoManoObra: 31_500_000,
      presupuestoTotal: 204_000_000,
    },
    {
      clave: 'colectora',
      codigo: `SIG-${anioPasado}-027`,
      nombre: 'Colectora Panamericana km 38 · pluviales',
      unidad: 'OBRA_CIVIL',
      tipo: TipoObra.TERCEROS,
      estado: EstadoObra.EN_CURSO,
      cliente: 'Municipalidad de Escobar',
      localidad: 'Escobar',
      jefe: 'jefe1',
      inicio: mesesAtras(9),
      finPrevista: mesesAdelante(1),
      presupuestoManoObra: 42_300_000,
      presupuestoTotal: 267_000_000,
    },
    {
      clave: 'uruguay',
      codigo: `SIG-${anioPasado}-019`,
      nombre: 'Edificio Uruguay 1450',
      unidad: 'DESARROLLOS',
      tipo: TipoObra.PROPIA,
      estado: EstadoObra.FINALIZADA,
      cliente: null,
      localidad: 'Olivos',
      jefe: 'jefe2',
      inicio: mesesAtras(22),
      finPrevista: mesesAtras(3),
      finReal: mesesAtras(2),
      presupuestoManoObra: 63_700_000,
      presupuestoTotal: 458_000_000,
    },
    {
      clave: 'garin',
      codigo: `SIG-${anio}-006`,
      nombre: 'Galpón industrial Garín',
      unidad: 'CONSTRUCCION',
      tipo: TipoObra.TERCEROS,
      estado: EstadoObra.PAUSADA,
      cliente: 'Logística Norte S.A.',
      localidad: 'Garín',
      jefe: 'jefe2',
      inicio: mesesAtras(6),
      finPrevista: mesesAdelante(2),
      presupuestoManoObra: 29_800_000,
      presupuestoTotal: 176_000_000,
    },
    // Los tres departamentos de alquiler temporario entran como obras de
    // la unidad Alquileres: así el tablero los compara con el resto.
    {
      clave: 'alq1',
      codigo: 'SIG-ALQ-001',
      nombre: 'Depto. Nordelta · Portezuelo 2B',
      unidad: 'ALQUILERES',
      tipo: TipoObra.PROPIA,
      estado: EstadoObra.EN_CURSO,
      cliente: null,
      localidad: 'Nordelta',
      jefe: null,
      inicio: mesesAtras(18),
      presupuestoManoObra: 1_200_000,
      presupuestoTotal: 8_400_000,
    },
    {
      clave: 'alq2',
      codigo: 'SIG-ALQ-002',
      nombre: 'Depto. Olivos · Maipú 2870 5A',
      unidad: 'ALQUILERES',
      tipo: TipoObra.PROPIA,
      estado: EstadoObra.EN_CURSO,
      cliente: null,
      localidad: 'Olivos',
      jefe: null,
      inicio: mesesAtras(26),
      presupuestoManoObra: 900_000,
      presupuestoTotal: 6_100_000,
    },
    {
      clave: 'alq3',
      codigo: 'SIG-ALQ-003',
      nombre: 'Depto. San Isidro · Diego Palma 340 1C',
      unidad: 'ALQUILERES',
      tipo: TipoObra.PROPIA,
      estado: EstadoObra.EN_CURSO,
      cliente: null,
      localidad: 'San Isidro',
      jefe: null,
      inicio: mesesAtras(11),
      presupuestoManoObra: 750_000,
      presupuestoTotal: 5_300_000,
    },
  ] as const

  const obras: ContextoNucleo['obras'] = {}

  for (const d of definiciones) {
    const creada = await db.obra.create({
      data: {
        codigo: d.codigo,
        nombre: d.nombre,
        tipo: d.tipo,
        estado: d.estado,
        cliente: d.cliente ?? null,
        direccion: direccionZonaNorte(),
        localidad: d.localidad,
        provincia: 'provincia' in d ? d.provincia : 'Buenos Aires',
        esInterior: 'esInterior' in d ? d.esInterior : false,
        fechaInicio: d.inicio,
        fechaFinPrevista: 'finPrevista' in d ? d.finPrevista : null,
        fechaFinReal: 'finReal' in d ? d.finReal : null,
        presupuestoManoObra: plata(d.presupuestoManoObra),
        presupuestoTotal: plata(d.presupuestoTotal),
        unidadNegocioId: unidades[d.unidad],
        jefeObraId: d.jefe ? usuarios[d.jefe] : null,
        // Las obras vienen del sistema base: la clave compartida es el código.
        origen: 'SISTEMA_BASE',
        idExterno: `OB-${d.codigo}`,
        ultimaSync: new Date(),
      },
    })
    obras[d.clave] = { id: creada.id, codigo: creada.codigo }
  }
  paso(`${definiciones.length} obras`)

  return { unidades, usuarios, depositos, obras }
}
