# SIGNA · Sistema a medida

Este archivo es el contexto permanente del proyecto. Leelo completo antes de cada tarea.

## Qué es

App móvil (PWA) interna de Signa Constructora. La empresa tiene cinco unidades de negocio: construcción (propia y para terceros), desarrollos inmobiliarios, prestación de servicios (hormigón, albañilería, también en el interior del país), obra civil y alquiler temporario de departamentos.

La empresa va a usar un **sistema base comprado** (Lebane o Sorby, todavía no está decidido) que registra la plata y los materiales de cada obra: cajas, compras, stock de materiales, presupuesto, certificados, facturación.

**Esta app registra todo lo que el sistema base no cubre:**

1. **Herramientas (pañol)**: qué hay, dónde está, quién la tiene, en qué estado.
2. **Personal**: ~60 obreros propios + subcontratistas, asignación a obras, parte diario, horas y costo por obra, quincenas.
3. **Vehículos**: camiones y vehículos, choferes, viajes por obra, combustible, mantenimiento, vencimientos.
4. **Alertas**: todo lo que está frenado, vencido o fuera de lugar.
5. **Tablero del dueño**: costo real por obra y resultado por unidad de negocio, juntando los datos del sistema base con los de esta app.

Regla de oro: **cada dato vive en un solo sistema**. Esta app nunca duplica cajas, compras, stock de materiales ni facturación. Los lee del sistema base por la capa de integración y los guarda en tablas espejo de solo lectura (`MovimientoExterno`, `PedidoCompraExterno`). La clave compartida entre los dos sistemas es `Obra.codigo` / `Obra.idExterno`.

Nunca construir: contabilidad, liquidación de sueldos, facturación ARCA. Eso es del sistema base y del estudio contable.

## Usuarios reales

Gente de obra con el celular en la mano, muchas veces al sol, con guantes o apurada. Pantallas simples, botones grandes (mínimo 48px de alto), poco texto, pocos campos por pantalla, todo lo posible con un toque. Español rioplatense, claro y directo ("Guardar parte", "Entregar herramienta"). Nada de jerga de sistemas.

## Stack (fijo, no cambiar sin avisar)

- Next.js 15 (App Router) + React 19 + TypeScript estricto
- Tailwind CSS v4 (tokens en `globals.css` con `@theme`)
- PostgreSQL + Prisma **6** (`prisma@6`, `@prisma/client@6`). No usar Prisma 7+: cambia la configuración del datasource.
- Validación con Zod. Mutaciones con Server Actions. Lecturas en Server Components.
- Auth propia: JWT firmado con `jose` en cookie httpOnly + `bcryptjs`. Middleware protege todo salvo `/login`.
- Íconos `lucide-react`. Gráficos `recharts`. Fechas `date-fns` con locale `es`.
- QR: generar con `qrcode`, leer con la cámara usando una librería mantenida y compatible con React 19.
- Deploy: Vercel + Postgres administrado (Railway o Neon).

## Estructura de carpetas

```
src/
  app/
    (auth)/login/
    (app)/                 layout con header + barra inferior
      inicio/              home distinta según rol
      herramientas/
      personal/
      vehiculos/
      alertas/
      tablero/
      obras/
      mas/                 configuración, usuarios, depósitos, sync
    api/                   solo lo que no puede ser Server Action (sync, cron, export)
  components/ui/           botones, inputs, sheets, badges, listas, estados vacíos
  components/<modulo>/
  lib/
    db.ts                  cliente Prisma singleton
    auth/                  sesión, permisos, middleware helpers
    integracion/           adaptadores del sistema base
    alertas/               motor de reglas
    calculos/              costos de mano de obra, viajes, tablero
    formato.ts             moneda, fechas, números (es-AR)
  server/<modulo>/         queries y actions por módulo
prisma/
  schema.prisma            YA ESTÁ DISEÑADO. No rediseñarlo.
  seed.ts
```

## Base de datos

`prisma/schema.prisma` ya está diseñado y validado (40 modelos, 38 enums). **No renombrar ni eliminar modelos o campos.** Si una tarea necesita algo que no está, proponelo primero y esperá confirmación.

Reglas que el schema no puede expresar y hay que cumplir en código:

- **Ubicación de herramienta**: una `Herramienta` UNITARIA está en un depósito **o** en una obra, nunca en los dos ni en ninguno (salvo estado EXTRAVIADA o BAJA). La ubicación solo cambia creando un `MovimientoHerramienta`, dentro de una transacción que actualiza estado, ubicación y responsable. Nunca editar la ubicación a mano.
- **Herramientas por CANTIDAD**: el stock vive en `ExistenciaHerramienta`. Como Postgres no considera iguales dos NULL en un índice único, buscar siempre la fila existente antes de crear una nueva.
- **Parte diario**: uno por obra por día. Solo se edita en BORRADOR. Al pasar a APROBADO se congelan `valorHoraAplicado` y `costoCalculado` de cada línea.
- **Costo de una línea** = normales × valorHora + extra50 × valorHora × 1,5 + extra100 × valorHora × 2. `MEDIA_JORNADA` carga 4 horas por defecto, las ausencias 0.
- **Un empleado no puede figurar PRESENTE en dos obras el mismo día** con más de 12 horas sumadas. Avisar, no bloquear, si está en dos obras con horas parciales.
- **Cambio de valor hora**: siempre crea un `HistorialValorHora`. Los partes ya aprobados no cambian.
- **Quincena**: 1 = días 1 a 15, 2 = día 16 a fin de mes. Al cerrarla se generan las `QuincenaLinea` (foto por empleado y obra) y ya no se pueden aprobar ni editar partes de ese período.
- **Viaje**: el peso de la carga no puede superar `capacidadCargaKg` del vehículo. Un vehículo o un chofer no pueden tener dos viajes superpuestos. No se asigna un chofer con licencia de conducir vencida ni un vehículo con seguro o VTV vencidos (bloqueante, con mensaje claro).
- **Al finalizar un viaje**: `kmLlegada` ≥ `kmSalida`, se actualiza `Vehiculo.kmActual` y se calcula `costoCalculado` = km recorridos × `costoKmEstimado` + peajes.
- **Tablas espejo** (`MovimientoExterno`, `PedidoCompraExterno`): solo las escribe la sincronización. Ninguna pantalla las edita.
- **Alertas**: `claveUnica` = código de regla + tipo y id de entidad. El motor hace upsert: si el problema sigue, no duplica; si se resolvió solo, la pasa a RESUELTA.
- **Bajas lógicas**: personas, vehículos, herramientas y obras no se borran, se desactivan o cambian de estado. Todo cambio importante deja un `RegistroAuditoria`.
- Plata siempre en `Decimal`, nunca `float`. Mostrar con formato es-AR (`$ 1.250.000`).

## Roles y permisos

| Rol | Ve | Puede hacer |
|---|---|---|
| DUENO | Todo | Todo, más tablero y configuración |
| ADMINISTRACION | Todo salvo configuración sensible | Personal, quincenas, pagos, documentos, usuarios |
| ARQUITECTA | Sus obras, herramientas, vehículos | Pedir herramientas y viajes, ver costos de sus obras |
| JEFE_OBRA | Sus obras | Aprobar partes, pedir herramientas y viajes, asignar personal |
| CAPATAZ | Su obra | Cargar parte diario, recibir y devolver herramientas |
| PANOLERO | Herramientas y depósitos | Altas, entregas, devoluciones, mantenimiento, resolver solicitudes |
| LOGISTICA | Vehículos | Asignar viajes, cargar combustible, mantenimiento, documentos |
| CHOFER | Sus viajes y su vehículo | Iniciar y finalizar viajes, cargar combustible |
| RRHH | Personal | Fichas, documentos, EPP, novedades |

Los permisos se definen en un solo lugar (`lib/auth/permisos.ts`) y se verifican **en el servidor** en cada action y cada query, no solo ocultando botones.

## Diseño

Identidad: negro, blanco y gris. Sobria, de estudio de arquitectura, no de startup.

- Tokens: negro `#000000`, carbón `#1A1A1A`, grafito `#4A4A4A`, acero `#8C8C8C`, niebla `#E6E6E6`, hueso `#F5F5F5`, blanco `#FFFFFF`.
- Header y barra inferior en negro con texto blanco. **El contenido va sobre fondo claro** (hueso y blanco): se usa en obra a pleno sol y el texto oscuro sobre claro es lo que mejor se lee.
- Color solo para estados, nunca decorativo: correcto `#1F7A4D`, aviso `#B7791F`, crítico `#B42318`. Siempre acompañado de texto o ícono, nunca color solo.
- Tipografía: **Archivo** (Google Fonts, vía `next/font`) para todo. Pesos 400, 500 y 700. Números con `tabular-nums` en listas y montos.
- Sin gradientes, sin sombras difusas, sin tarjetas redondeadas idénticas para todo. Listas con divisores finos para datos; tarjetas solo para resúmenes. Radio de 6px en controles, 0 en listas.
- Nada de etiquetas en mayúsculas espaciadas, nada de flechas en los botones, nada de animaciones de entrada en cada sección. La única animación protagonista es el splash de inicio. El resto del movimiento responde a acciones del usuario (abrir un panel, confirmar).
- **Móvil primero, pero no solo móvil.** Se diseña para 380px y se escala hasta escritorio. En la obra se usa el celular; en la oficina, administración y el dueño lo usan en una pantalla grande y ahí tiene que verse como un sistema de gestión, no como una app de celular estirada.

### Los cuatro anchos

Un solo componente por pantalla, que se adapta con los breakpoints de Tailwind. **Nunca** duplicar pantallas ni lógica para escritorio y celular, y nunca detectar el dispositivo por user agent.

| | Ancho | Navegación | Contenido |
|---|---|---|---|
| Celular | < 768px | Header negro arriba + barra inferior negra | Una columna |
| Tablet | 768–1023px | La de celular | Dos columnas donde tenga sentido; listados como tabla reducida |
| Escritorio | ≥ 1024px | Barra lateral negra + barra superior clara | Todo el ancho, 32px de margen |
| Grande | ≥ 1680px | Igual | Se limita el ancho y se centra |

Entre 1024 y 1279px la barra lateral queda en 72px, solo íconos. Desde 1280px, 256px con íconos y texto. Se puede contraer a mano y la preferencia se recuerda.

### Reglas de presentación

- **Listados:** en celular, filas táctiles. En escritorio, tabla de verdad: encabezados que ordenan al hacer clic, fila entera cliqueable con realce al pasar el mouse, números a la derecha con `tabular-nums`, insignias de estado en su columna. El ancho se aprovecha mostrando más columnas, no estirando las mismas.
- **Filtros:** chips desplazables en celular, barra en una línea con el buscador a la izquierda en escritorio.
- **Resúmenes en números:** grilla de 2 columnas en celular, fila de 4 o 5 arriba de la tabla en escritorio.
- **Fichas de detalle:** en escritorio, dos columnas — la principal con las pestañas y a la derecha un panel fijo de 360px con lo clave y las acciones, que queda visible al desplazarse. En celular, una columna con ese panel arriba.
- **Formularios y acciones:** el mismo componente es hoja inferior por debajo de 1024px y panel lateral derecho de 480px en escritorio. Los formularios largos van en dos columnas de campos en escritorio. Cierran con Escape y con clic afuera, y atrapan el foco.
- **El botón flotante solo existe en celular.** En escritorio esa misma acción es un botón primario en la barra superior.
- **Los submenús de cada módulo** son pestañas horizontales debajo de la barra superior en escritorio.
- Nunca puede haber desplazamiento horizontal de la página. Una tabla ancha se desplaza dentro de su propio contenedor.
- Todo lo que se toca, 48px de alto como mínimo, también en escritorio.
- Estados al pasar el mouse en todo lo cliqueable, cursor correcto y foco visible con teclado.

La barra lateral negra es el elemento de marca. El resto, sobrio y ordenado, con aire entre bloques y alineación consistente.
- Respetar `env(safe-area-inset-*)`, `prefers-reduced-motion` y foco visible.
- Estados vacíos con una frase que diga qué hacer ("Todavía no hay herramientas cargadas. Cargá la primera."). Errores que digan qué pasó y cómo seguir.

## Forma de trabajar

- Una tarea por vez. No adelantar módulos que todavía no se pidieron.
- Al terminar cada tarea: correr `npm run lint` y `npm run build`, corregir lo que falle, y cerrar con un resumen corto de qué se hizo y una lista de qué probar en el navegador en vista móvil.
- Código y nombres de dominio en español (igual que el schema). Nombres técnicos genéricos en inglés está bien.
- No instalar dependencias que no hagan falta. No dejar datos de ejemplo hardcodeados en componentes: todo sale de la base.
