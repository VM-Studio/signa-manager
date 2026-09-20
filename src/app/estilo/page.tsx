'use client'

/* =====================================================================
   Página temporal de revisión del sistema de diseño.
   Existe solo para mirar los componentes en el celular durante el armado.
   Se borra en el prompt 10.
   ===================================================================== */

import { useState } from 'react'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Hammer,
  Plus,
  QrCode,
  Truck,
} from 'lucide-react'
import {
  AvisoFijo,
  BarraProgreso,
  Boton,
  Buscador,
  BarraFiltros,
  ChipsFiltro,
  BotonFlotante,
  CampoCheck,
  CampoFecha,
  CampoNumero,
  CampoSelect,
  CampoTexto,
  CampoTextoLargo,
  Dato,
  EncabezadoPantalla,
  EstadoError,
  EstadoVacio,
  EsqueletoLista,
  EsqueletoTarjeta,
  FilaLista,
  GrillaResumen,
  HojaConfirmacion,
  HojaInferior,
  Insignia,
  Interruptor,
  Lista,
  ListaDatos,
  NumeroResumen,
  PanelPestana,
  Pestanas,
  ProveedorAvisos,
  PuntoEstado,
  Tarjeta,
  TituloSeccion,
  useAvisos,
} from '@/components/ui'
import {
  fechaCorta,
  haceCuanto,
  horas,
  kilometros,
  moneda,
  monedaCorta,
  patente,
  peso,
  porcentaje,
  textoVencimiento,
} from '@/lib/formato'

export default function PaginaEstilo() {
  return (
    <ProveedorAvisos>
      <Contenido />
    </ProveedorAvisos>
  )
}

function Contenido() {
  const avisos = useAvisos()
  const [hoja, setHoja] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<string[]>([])
  const [pestana, setPestana] = useState('resumen')
  const [numeroActivo, setNumeroActivo] = useState<string | null>('en-obra')

  return (
    <div className="min-h-dvh bg-hueso pb-32">
      {/* Header negro, igual al de la app */}
      <header className="pad-arriba-seguro sobre-negro sticky top-0 z-20 bg-negro">
        <div className="mx-auto flex h-[var(--alto-header)] max-w-[var(--ancho-operativo)] items-center justify-between px-4">
          <span className="text-titulo font-bold tracking-tight text-blanco">
            SIGNA
          </span>
          <span className="text-menor text-acero">Sistema de diseño</span>
        </div>
      </header>

      <main className="mx-auto max-w-[var(--ancho-operativo)]">
        <EncabezadoPantalla
          titulo="Sistema de diseño"
          subtitulo="Pantalla temporal · se borra antes de publicar"
          sinVolver
          accion={
            <Boton tamano="chico" variante="fantasma" onClick={() => avisos.mostrar('Acción de prueba')}>
              Probar
            </Boton>
          }
        />

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Colores</TituloSeccion>
        <div className="px-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              ['negro', '#000000'],
              ['carbón', '#1A1A1A'],
              ['grafito', '#4A4A4A'],
              ['acero', '#8C8C8C'],
              ['niebla', '#E6E6E6'],
              ['hueso', '#F5F5F5'],
              ['blanco', '#FFFFFF'],
            ].map(([nombre, hex]) => (
              <div key={nombre} className="flex flex-col gap-1">
                <div
                  className="h-12 rounded-[var(--radius-control)] border border-niebla"
                  style={{ background: hex }}
                />
                <span className="text-micro text-grafito">{nombre}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ['correcto', '#1F7A4D'],
              ['aviso', '#B7791F'],
              ['crítico', '#B42318'],
            ].map(([nombre, hex]) => (
              <div key={nombre} className="flex flex-col gap-1">
                <div
                  className="h-12 rounded-[var(--radius-control)]"
                  style={{ background: hex }}
                />
                <span className="text-micro text-grafito">{nombre}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Tipografía · Archivo</TituloSeccion>
        <Tarjeta className="mx-4 space-y-2">
          <p className="cifras text-cifra-xl font-bold">$ 12.480.500</p>
          <p className="cifras text-cifra font-medium">1.250 h</p>
          <p className="text-grande font-medium">Título grande</p>
          <p className="text-titulo font-medium">Título de pantalla</p>
          <p className="text-base">Texto de interfaz, 15px, el que más se usa.</p>
          <p className="text-chico text-grafito">Subtítulo de lista, 13px.</p>
          <p className="text-menor text-acero">Metadato, 12px.</p>
          <p className="text-micro text-acero">INSIGNIA, 11px.</p>
        </Tarjeta>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Botones</TituloSeccion>
        <div className="space-y-2 px-4">
          <Boton ancho onClick={() => avisos.correcto('Herramienta entregada')}>
            Primario · acción principal
          </Boton>
          <Boton ancho variante="secundario">
            Secundario
          </Boton>
          <Boton ancho variante="peligro" onClick={() => setConfirmar(true)}>
            Peligro · dar de baja
          </Boton>
          <Boton ancho variante="fantasma">
            Fantasma · cancelar
          </Boton>
          <div className="flex gap-2">
            <Boton tamano="chico" variante="secundario">
              Chico
            </Boton>
            <Boton tamano="normal" variante="secundario">
              Normal
            </Boton>
            <Boton tamano="grande" variante="secundario">
              Grande
            </Boton>
          </div>
          <div className="flex gap-2">
            <Boton ancho cargando>
              Cargando
            </Boton>
            <Boton ancho disabled>
              Deshabilitado
            </Boton>
          </div>
          <Boton ancho tamano="grande" iconoIzquierda={<QrCode className="size-5" />}>
            Escanear herramienta
          </Boton>
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Insignias de estado</TituloSeccion>
        <div className="flex flex-wrap gap-2 px-4">
          <Insignia tono="neutro">Disponible</Insignia>
          <Insignia tono="correcto" icono={<CheckCircle2 className="size-3" />}>
            Al día
          </Insignia>
          <Insignia tono="aviso">Vence en 5 días</Insignia>
          <Insignia tono="critico" icono={<AlertTriangle className="size-3" />}>
            Devolución vencida
          </Insignia>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 px-4">
          <PuntoEstado tono="correcto">En depósito</PuntoEstado>
          <PuntoEstado tono="aviso">En reparación</PuntoEstado>
          <PuntoEstado tono="critico">Extraviada</PuntoEstado>
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Números de resumen</TituloSeccion>
        <GrillaResumen columnas={3}>
          <NumeroResumen
            etiqueta="Total"
            valor="128"
            activo={numeroActivo === 'total'}
            alTocar={() => setNumeroActivo('total')}
          />
          <NumeroResumen
            etiqueta="En obra"
            valor="64"
            activo={numeroActivo === 'en-obra'}
            alTocar={() => setNumeroActivo('en-obra')}
          />
          <NumeroResumen
            etiqueta="Vencidas"
            valor="2"
            tono="critico"
            activo={numeroActivo === 'vencidas'}
            alTocar={() => setNumeroActivo('vencidas')}
          />
        </GrillaResumen>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Buscador y filtros</TituloSeccion>
        <BarraFiltros>
          <div className="px-4 pt-3">
            <Buscador
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              alLimpiar={() => setBusqueda('')}
              placeholder="Buscar por nombre, código o marca…"
            />
          </div>
          <ChipsFiltro
            chips={[
              { valor: 'electricas', texto: 'Eléctricas', cantidad: 24 },
              { valor: 'medicion', texto: 'Medición', cantidad: 8 },
              { valor: 'andamios', texto: 'Andamios', cantidad: 31 },
              { valor: 'hormigon', texto: 'Hormigón', cantidad: 12 },
            ]}
            activos={filtros}
            alCambiar={setFiltros}
            multiple
          />
        </BarraFiltros>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Filas de lista</TituloSeccion>
        <Lista>
          <FilaLista
            titulo="Amoladora angular 4½"
            subtitulo="SIG-H-0042 · Bosch GWS 850"
            detalle="Obra Los Robles · Martín Quiroga"
            debajoDerecha={<Insignia tono="critico">Vencida hace 9 d</Insignia>}
            tono="critico"
            href="#"
          />
          <FilaLista
            titulo="Nivel láser autonivelante"
            subtitulo="SIG-H-0007 · Stanley Cubix"
            detalle="Depósito Central"
            debajoDerecha={<Insignia tono="correcto">Disponible</Insignia>}
            href="#"
          />
          <FilaLista
            titulo="Hormigonera 130 L"
            subtitulo="SIG-H-0019 · Balancín"
            detalle="Obrador Pilar"
            debajoDerecha={<Insignia tono="aviso">Mantenimiento vencido</Insignia>}
            tono="aviso"
            href="#"
          />
          <FilaLista
            titulo="Quiroga, Martín"
            subtitulo="Legajo 0142 · Oficial"
            derecha={horas(8.5)}
            debajoDerecha={<Insignia tono="correcto">Presente</Insignia>}
            izquierda={
              <span className="flex size-9 items-center justify-center rounded-full bg-niebla text-menor font-medium text-grafito">
                MQ
              </span>
            }
          />
        </Lista>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Pestañas</TituloSeccion>
        <Pestanas
          pestanas={[
            { id: 'resumen', texto: 'Resumen' },
            { id: 'personal', texto: 'Personal', cantidad: 12 },
            { id: 'herramientas', texto: 'Herramientas', cantidad: 8 },
            { id: 'vehiculos', texto: 'Vehículos' },
            { id: 'compras', texto: 'Compras', cantidad: 3 },
          ]}
          activa={pestana}
          alCambiar={setPestana}
        />
        <div className="bg-blanco">
          <PanelPestana activo={pestana === 'resumen'}>
            <ListaDatos>
              <Dato etiqueta="Código">SIG-2026-014</Dato>
              <Dato etiqueta="Jefe de obra">Diego Sarmiento</Dato>
              <Dato etiqueta="Inicio">{fechaCorta(new Date(2026, 2, 3))}</Dato>
              <Dato etiqueta="Presupuesto mano de obra">{moneda(48500000)}</Dato>
              <Dato etiqueta="Gastado">{moneda(44620000)}</Dato>
            </ListaDatos>
            <div className="px-4 pt-1 pb-4">
              <BarraProgreso
                fraccion={0.92}
                etiqueta={`${porcentaje(0.92)} del presupuesto de mano de obra`}
              />
            </div>
          </PanelPestana>
          <PanelPestana activo={pestana !== 'resumen'}>
            <div className="px-4 py-8 text-center text-chico text-grafito">
              Contenido de “{pestana}”.
            </div>
          </PanelPestana>
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Campos de formulario</TituloSeccion>
        <div className="space-y-4 px-4">
          <CampoTexto
            name="nombre"
            etiqueta="Nombre de la herramienta"
            placeholder="Amoladora angular"
            required
          />
          <CampoTexto
            name="serie"
            etiqueta="Número de serie"
            defaultValue="X"
            error="Tiene que tener al menos 4 caracteres."
          />
          <CampoNumero
            name="valor"
            etiqueta="Valor de compra"
            prefijo="$"
            placeholder="0"
            ayuda="Se usa para calcular las compras evitadas."
          />
          <CampoNumero name="horas" etiqueta="Horas trabajadas" sufijo="h" defaultValue={8} />
          <CampoFecha name="devolucion" etiqueta="Devolución prevista" required />
          <CampoSelect
            name="obra"
            etiqueta="Obra de destino"
            vacio="Elegí una obra…"
            required
            opciones={[
              { valor: '1', texto: 'SIG-2026-014 · Edificio Los Robles' },
              { valor: '2', texto: 'SIG-2026-021 · Barrio Santa Rita' },
              { valor: '3', texto: 'SIG-2026-008 · Hormigón Córdoba' },
            ]}
          />
          <CampoTextoLargo
            name="observaciones"
            etiqueta="Observaciones"
            placeholder="Cómo vuelve, qué le falta…"
          />
          <CampoCheck
            name="urgente"
            etiqueta="Es urgente"
            descripcion="Se muestra primero en la bandeja del pañolero."
          />
          <Interruptor
            name="interior"
            etiqueta="Obra del interior"
            descripcion="Habilita viáticos y logística de larga distancia."
            defaultChecked
          />
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Avisos</TituloSeccion>
        <div className="space-y-2 px-4">
          <AvisoFijo tono="critico" titulo="Documentación vencida">
            El seguro de la camioneta AB 123 CD venció ayer. No se puede asignar a
            un viaje.
          </AvisoFijo>
          <AvisoFijo tono="aviso">
            La última sincronización con el sistema base fue {haceCuanto(new Date(Date.now() - 8 * 3600_000))}.
          </AvisoFijo>
          <AvisoFijo tono="correcto" titulo="Resuelto con stock propio">
            Se evitó una compra de {moneda(340000)}.
          </AvisoFijo>
          <div className="flex gap-2 pt-1">
            <Boton ancho variante="secundario" tamano="chico" onClick={() => avisos.correcto('Parte enviado')}>
              Aviso correcto
            </Boton>
            <Boton ancho variante="secundario" tamano="chico" onClick={() => avisos.error('No se pudo guardar')}>
              Aviso de error
            </Boton>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Hoja inferior</TituloSeccion>
        <div className="space-y-2 px-4">
          <Boton ancho variante="secundario" onClick={() => setHoja(true)}>
            Abrir formulario en hoja
          </Boton>
          <Boton ancho variante="secundario" onClick={() => setConfirmar(true)}>
            Abrir confirmación
          </Boton>
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Estados de carga, vacío y error</TituloSeccion>
        <div className="px-4">
          <div className="grid grid-cols-2 gap-2">
            <EsqueletoTarjeta />
            <EsqueletoTarjeta />
          </div>
        </div>
        <div className="mt-3">
          <EsqueletoLista filas={3} />
        </div>
        <div className="mt-3 bg-blanco">
          <EstadoVacio
            titulo="Todavía no hay herramientas cargadas"
            mensaje="Cargá la primera y aparece acá."
            icono={<Hammer className="size-8" strokeWidth={1.5} />}
            accion={{ texto: 'Nueva herramienta', alTocar: () => avisos.mostrar('Alta') }}
          />
        </div>
        <div className="mt-3 bg-blanco">
          <EstadoError
            mensaje="No pudimos traer la lista. Revisá la conexión y probá de nuevo."
            alReintentar={() => avisos.mostrar('Reintentando…')}
          />
        </div>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Formato es-AR</TituloSeccion>
        <Tarjeta className="mx-4">
          <ListaDatos className="px-0">
            <Dato etiqueta="Moneda">{moneda(1250000)}</Dato>
            <Dato etiqueta="Moneda corta">{monedaCorta(12480500)}</Dato>
            <Dato etiqueta="Porcentaje">{porcentaje(0.847)}</Dato>
            <Dato etiqueta="Horas">{horas(8.5)}</Dato>
            <Dato etiqueta="Kilómetros">{kilometros(128430)}</Dato>
            <Dato etiqueta="Peso">{peso(15000)}</Dato>
            <Dato etiqueta="Patente">{patente('ab123cd')}</Dato>
            <Dato etiqueta="Fecha">{fechaCorta(new Date())}</Dato>
            <Dato etiqueta="Hace cuánto">{haceCuanto(new Date(Date.now() - 3 * 86400_000))}</Dato>
            <Dato etiqueta="Vencimiento">
              {textoVencimiento(new Date(Date.now() + 5 * 86400_000))}
            </Dato>
          </ListaDatos>
        </Tarjeta>

        {/* ---------------------------------------------------------- */}
        <TituloSeccion>Prueba de desborde a 380px</TituloSeccion>
        <Lista>
          <FilaLista
            titulo="Retiro de escombros y traslado de encofrado a la obra del barrio cerrado Santa Rita"
            subtitulo="Camión volcador Iveco Tector 170E22 · capacidad 8.500 kg · chofer habitual Roberto Ledesma"
            derecha={moneda(184500)}
            debajoDerecha={<Insignia tono="aviso">Programado</Insignia>}
            izquierda={<Truck aria-hidden className="size-5 text-grafito" />}
            href="#"
          />
        </Lista>
      </main>

      {/* Barra inferior negra, igual a la de la app */}
      <nav className="pad-abajo-seguro sobre-negro fixed inset-x-0 bottom-0 z-20 bg-negro">
        <div className="mx-auto flex h-[var(--alto-barra-inferior)] max-w-[var(--ancho-operativo)] items-stretch">
          {['Inicio', 'Herramientas', 'Personal', 'Vehículos', 'Más'].map((t, i) => (
            <span
              key={t}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-micro ${
                i === 1 ? 'text-blanco' : 'text-acero'
              }`}
            >
              <Hammer aria-hidden className="size-5" strokeWidth={1.5} />
              {t}
            </span>
          ))}
        </div>
      </nav>

      <BotonFlotante
        icono={<Plus aria-hidden className="size-5" />}
        etiqueta="Nueva herramienta"
        alTocar={() => setHoja(true)}
      >
        Nueva
      </BotonFlotante>

      <HojaInferior
        abierta={hoja}
        alCerrar={() => setHoja(false)}
        titulo="Entregar herramienta"
        descripcion="Amoladora angular 4½ · SIG-H-0042"
        pie={
          <div className="flex gap-2">
            <Boton variante="secundario" ancho onClick={() => setHoja(false)}>
              Cancelar
            </Boton>
            <Boton
              ancho
              onClick={() => {
                setHoja(false)
                avisos.correcto('Herramienta entregada')
              }}
            >
              Entregar
            </Boton>
          </div>
        }
      >
        <div className="space-y-4">
          <CampoSelect
            name="obra-destino"
            etiqueta="Obra"
            vacio="Elegí una obra…"
            required
            opciones={[
              { valor: '1', texto: 'SIG-2026-014 · Edificio Los Robles' },
              { valor: '2', texto: 'SIG-2026-021 · Barrio Santa Rita' },
            ]}
          />
          <CampoSelect
            name="responsable"
            etiqueta="Quién la recibe"
            vacio="Elegí una persona…"
            required
            opciones={[
              { valor: '1', texto: 'Quiroga, Martín · Oficial' },
              { valor: '2', texto: 'Ledesma, Roberto · Chofer' },
            ]}
          />
          <CampoFecha name="fecha-devolucion" etiqueta="Devolución prevista" required />
          <CampoTextoLargo name="obs" etiqueta="Observaciones" rows={2} />
          <Boton ancho variante="secundario" iconoIzquierda={<Camera className="size-4" />}>
            Sacar foto
          </Boton>
        </div>
      </HojaInferior>

      <HojaConfirmacion
        abierta={confirmar}
        alCerrar={() => setConfirmar(false)}
        alConfirmar={() => {
          setConfirmar(false)
          avisos.mostrar('Herramienta dada de baja', 'critico')
        }}
        titulo="¿Dar de baja la herramienta?"
        mensaje="La amoladora SIG-H-0042 deja de figurar en el inventario. Esta acción queda registrada y no se puede deshacer."
        textoConfirmar="Dar de baja"
        peligrosa
      />
    </div>
  )
}
