# Publicar en Vercel

Pasos exactos, en orden. La primera vez lleva unos 20 minutos.

---

## 1 · La base de datos

Crear una base PostgreSQL. Las dos opciones que probamos:

**Neon** (recomendado): tiene una capa gratuita generosa y point-in-time
recovery en el plan pago. En `neon.tech`, crear un proyecto y copiar la
**connection string pooled** (la que dice `-pooler`).

**Railway**: en `railway.app`, agregar un servicio PostgreSQL y copiar la
`DATABASE_URL` de la pestaña Variables.

Guardá la URL: es lo primero que vas a necesitar.

---

## 2 · Generar los secretos

En la terminal:

```bash
openssl rand -base64 48    # este va en AUTH_SECRET
openssl rand -hex 32       # este va en CRON_SECRET
```

Anotalos. Si perdés `AUTH_SECRET`, todas las sesiones abiertas se cortan
(no es grave, solo tienen que volver a entrar).

---

## 3 · Subir el proyecto

```bash
git remote add origin <la URL de tu repo>
git push -u origin main
```

En `vercel.com`, **Add New → Project**, elegir el repo. Vercel detecta
Next.js solo. **No toques el build command**: ya está en `vercel.json`.

---

## 4 · Las variables de entorno

Antes de dar Deploy, en **Environment Variables** cargarlas todas.
Marcalas para **Production, Preview y Development**: si falta alguna en
Preview, cada pull request va a fallar el build aunque producción ande.

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La del paso 1 (la **pooled**, con `-pooler`) |
| `DIRECT_URL` | La conexión **directa**, la misma sin `-pooler`. Solo se usa para migrar |
| `AUTH_SECRET` | El primero del paso 2 |
| `CRON_SECRET` | El segundo del paso 2 |
| `APP_URL` | `https://<tu-proyecto>.vercel.app` (después la cambiás por el dominio) |
| `SISTEMA_BASE` | `mock` por ahora |
| `MODO_DEMO` | `true` para la presentación, `false` cuando sea de verdad |
| `NODE_ENV` | No la cargues: Vercel la pone sola |

Si vas a usar Sorby, además: `SORBY_SHEET_ID`,
`SORBY_SERVICE_ACCOUNT_EMAIL` y `SORBY_SERVICE_ACCOUNT_KEY`.

> **Ojo con `SORBY_SERVICE_ACCOUNT_KEY`:** copiá el `private_key` del JSON
> tal cual, con los `\n` incluidos. El código los convierte solo.

---

## 5 · El primer deploy

Dale **Deploy**. El build lo maneja `scripts/build-vercel.mjs`, que hace
tres cosas en orden: genera el cliente de Prisma, aplica las migraciones
y compila la app.

Ese script revisa las variables **antes** de correr nada, así que si
falta alguna el log te dice cuál y dónde cargarla, en vez del error
críptico de Prisma.

**Por qué hacen falta dos URLs.** Neon y Supabase te dan la conexión por
un *pooler*. Sirve para consultar, pero las migraciones no pasan por ahí:
toman un lock y usan sentencias preparadas, que el pooler no sostiene. El
script migra por `DIRECT_URL` si está, y la app sigue usando la pooled.
Si tu base no tiene pooler (Railway, o un Postgres propio), poné la misma
URL en las dos y listo.

---

## 6 · Cargar los datos de ejemplo

Para la demo hace falta el seed. Desde tu máquina, apuntando a la base
de producción:

```bash
DATABASE_URL="<la URL de producción>" npm run db:seed
```

Y después correr el motor de alertas una vez, para que la demo las
muestre: entrar a la app como dueño y en **Alertas** tocar
**Revisar ahora**.

---

## 7 · Los cron

En `vercel.json` están configurados para correr **una vez por día**: la
sincronización a las 9:00 UTC y las alertas a las 9:30 UTC. Como
Argentina es UTC−3, eso son las 6:00 y las 6:30 de acá: entran antes de
que arranque la obra.

**Por qué una vez por día y no cada hora.** El plan Hobby de Vercel solo
admite cron diarios. Una expresión más frecuente no es que no corra:
**hace fallar el deployment** con este error:

```
Hobby accounts are limited to daily cron jobs.
This cron expression would run more than once per day.
```

Si el deploy te venía fallando y en el log aparece ese mensaje, era esto.

**Si pasás a Pro**, en `vercel.json` podés volver a poner:

```json
"crons": [
  { "path": "/api/sync",             "schedule": "0 * * * *"  },
  { "path": "/api/alertas/evaluar",  "schedule": "10 * * * *" }
]
```

Dos cosas más:

- Los cron **solo corren en producción**, nunca en los previews.
- En Hobby la hora es aproximada: un cron a las 9:00 dispara en algún
  momento entre las 9:00 y las 9:59.

Mientras tanto, las dos cosas se pueden disparar a mano desde la app
(**Más → Sincronización → Sincronizar ahora**, y **Alertas → Revisar
ahora**) o con curl:

```bash
curl -X POST https://<tu-proyecto>.vercel.app/api/sync \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Vercel manda ese header solo cuando dispara el cron; no hay que hacer
nada más.

Ojo: el motor de alertas igual se corre solo después de las acciones que
resuelven problemas (devolver una herramienta, aprobar un parte), así que
las alertas no quedan un día enteras desactualizadas.

---

## 8 · El dominio

En **Settings → Domains**, agregar el dominio de la empresa. Después
actualizar `APP_URL` con el dominio definitivo y volver a deployar: los
códigos QR de las herramientas llevan esa URL adentro.

> Si ya imprimiste etiquetas con la URL vieja, siguen funcionando mientras
> el dominio de Vercel siga activo. Conviene definir el dominio **antes**
> de imprimir las etiquetas.

---

## 9 · Antes de mostrárselo al dueño

- [ ] Entrar desde el celular y verificar que el splash se vea bien
- [ ] Instalar la app en la pantalla de inicio (el aviso aparece solo)
- [ ] Revisar que el ícono se vea bien sobre el fondo del teléfono
- [ ] Entrar con cada rol y ver que el inicio sea el correcto
- [ ] Probar el escáner de QR: pide permiso de cámara la primera vez
- [ ] `MODO_DEMO=true` para que se vea la lista de usuarios en el login

---

## Problemas conocidos

**El deployment falla y el log habla de cron.**
Es el plan Hobby: solo admite cron diarios. Ver el paso 7.

**El build falla con "Environment variable not found: DATABASE_URL".**
Falta cargarla en Vercel, o se cargó solo para Production y el build que
falló era un preview. Va en los tres entornos.

**El build falla al migrar, con algo sobre prepared statements o locks.**
`DATABASE_URL` apunta al pooler. Cargá `DIRECT_URL` con la conexión
directa. Ver el paso 5.

**Deploya bien pero no puedo entrar con ningún usuario.**
La base de producción está vacía: no hay usuarios todavía. Correr el
seed del paso 6. Ojo que el seed **borra y recarga todo**, así que es
para la primera vez, no para una base con datos de verdad.

**El build falla con "prisma: command not found".**
Falta `prisma` en devDependencies. Está, y Vercel las instala en el
build, así que no debería pasar.

**Las páginas tardan la primera vez.**
Es el cold start de las funciones. Con Fluid Compute (activado por
defecto) se nota poco.

**El service worker sirve una versión vieja después de un deploy.**
Está configurado con `skipWaiting`, así que se actualiza solo al segundo
ingreso. Si alguien queda pegado, que cierre la app y la vuelva a abrir.

**La cámara del escáner no abre.**
Solo funciona en HTTPS. En producción no hay problema; en local solo
anda en `localhost`.
