# SIGNA · sistema a medida

App móvil interna de Signa Constructora. Registra lo que el sistema base
de la empresa (Lebane o Sorby) no cubre —herramientas, personal,
vehículos y alertas— y junta los dos para mostrarle al dueño el costo
real de cada obra.

---

## Instalación

Hace falta **Node 20 o superior** y una base **PostgreSQL**.

```bash
npm install
cp .env.example .env     # y completar los valores, ver abajo
npm run db:migrate       # crea las tablas
npm run db:seed          # carga los datos de ejemplo
npm run dev              # arranca en http://localhost:3000
```

Con los datos de ejemplo se entra con cualquier usuario `@signa.demo` y
la contraseña `signa2026`. La lista completa está en el login, en
**Usuarios de demostración**.

---

## Variables de entorno

| Variable | Para qué | Obligatoria |
|---|---|---|
| `DATABASE_URL` | La base PostgreSQL | Sí |
| `AUTH_SECRET` | Firma el JWT de sesión. `openssl rand -base64 48` | Sí |
| `APP_URL` | URL pública. Se usa en los QR y en los enlaces de las alertas | Sí |
| `SISTEMA_BASE` | `mock`, `sorby` o `lebane` | Sí |
| `CRON_SECRET` | Protege `/api/sync` y `/api/alertas/evaluar`. `openssl rand -hex 32` | Sí en producción |
| `MODO_DEMO` | `true` muestra la franja de demostración, la lista de usuarios en el login y habilita el reinicio de datos | No |
| `SORBY_SHEET_ID` | La planilla de Google que sincroniza Sorby | Solo con `sorby` |
| `SORBY_SERVICE_ACCOUNT_EMAIL` | Cuenta de servicio de Google con lectura sobre la planilla | Solo con `sorby` |
| `SORBY_SERVICE_ACCOUNT_KEY` | Su clave privada | Solo con `sorby` |
| `LEBANE_API_URL` / `LEBANE_API_TOKEN` | API de Lebane | Solo con `lebane` |

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin compilar |
| `npm test` | Pruebas unitarias de la capa de cálculo |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:seed` | Carga los datos de ejemplo |
| `npm run db:reset` | Borra todo y vuelve a cargar |
| `npm run db:studio` | Prisma Studio, para mirar la base |

Además, en `prisma/verificacion/` hay scripts que comprueban el estado
del sistema. Se corren con `npx tsx`:

| Script | Qué verifica |
|---|---|
| `probar-sync.ts` | Que la sincronización no pise los campos nuestros |
| `probar-obras.ts` | Que los campos del sistema base no se puedan editar |
| `probar-herramientas.ts` | Las reglas de ubicación y movimientos |
| `probar-partes.ts` | Las reglas del parte diario y las quincenas |
| `probar-vehiculos.ts` | Las validaciones de asignación de viajes |
| `probar-alertas.ts` | Que el motor encuentre los problemas y no duplique |
| `probar-tablero.ts` | Que los totales del tablero cierren contra la base |
| `auditar-seguridad.ts` | Que toda pantalla y acción verifiquen permisos |
| `probar-roles.ts` | Que cada rol vea lo que le corresponde (necesita el server andando) |

---

## Arquitectura en una página

```
src/
  app/
    (auth)/login/        entrada, sin header ni barra
    (app)/               todo lo demás: header negro + barra inferior
      inicio/            distinto según el rol
      obras/ herramientas/ personal/ vehiculos/ alertas/ tablero/ mas/
    api/                 sync, alertas, exportaciones
  components/
    ui/                  botones, campos, hojas, listas, estados
    <modulo>/            componentes de cada módulo
  lib/
    auth/                sesión (JWT con jose), permisos, alcance por obra
    integracion/         adaptadores del sistema base
    alertas/             motor de reglas
    calculos/            costos de mano de obra, vehículos, herramientas, tablero
  server/<modulo>/       queries (lectura) y acciones (escritura)
prisma/
  schema.prisma          40 modelos, 38 enums
  seed/                  datos de ejemplo, una función por módulo
```

**Tres decisiones que explican casi todo el código:**

1. **Cada dato vive en un solo sistema.** La app nunca duplica cajas,
   compras, stock de materiales ni facturación. Los lee del sistema base
   y los guarda en tablas espejo de solo lectura (`MovimientoExterno`,
   `PedidoCompraExterno`) que solo escribe la sincronización.

2. **Las reglas de negocio están separadas de las acciones.** Archivos
   como `server/herramientas/movimientos.ts`, `server/personal/reglas.ts`
   y `server/vehiculos/reglas.ts` son funciones puras: no tocan la base,
   no saben de HTTP y se pueden probar solas. Las Server Actions se
   encargan de los permisos, la transacción y la auditoría.

3. **Los permisos se verifican en el servidor, siempre.** Ocultar un
   botón no protege nada. Cada Server Action llama a `exigirSesion` y
   `exigirPermiso`, y las consultas de obra filtran por
   `obrasDeLaSesion`. Hay un script que lo audita.

---

## Cómo conectar el sistema base real

Hoy corre con `SISTEMA_BASE=mock`, que devuelve datos coherentes con el
seed e inventa movimientos nuevos en cada corrida para que en la demo se
vea que entra información.

Cuando la empresa decida:

**Sorby** sincroniza contra una planilla de Google Sheets. El adaptador
ya está escrito: lee la planilla con una cuenta de servicio. Lo único que
falta es ajustar el mapeo contra la planilla real en
`src/lib/integracion/sorby/mapeo.ts`, que tiene las instrucciones
adentro. Después:

```
SISTEMA_BASE="sorby"
SORBY_SHEET_ID="..."
SORBY_SERVICE_ACCOUNT_EMAIL="..."
SORBY_SERVICE_ACCOUNT_KEY="..."
```

Y compartir la planilla con el email de la cuenta de servicio, con
permiso de lectura.

**Lebane** tiene la estructura armada en
`src/lib/integracion/lebane.ts`, con los puntos a completar marcados.
Hace falta su documentación de API.

En los dos casos, **no hay que tocar ninguna pantalla**: la interfaz
`SistemaBase` tiene tres métodos y todo lo demás de la app trabaja contra
ella.

---

## Documentación

- `docs/demo.md` — guion de 10 minutos para la presentación
- `docs/pendientes.md` — qué falta para pasar de demo a producción
- `CLAUDE.md` — el contexto permanente del proyecto
