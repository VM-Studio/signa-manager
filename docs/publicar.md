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

Antes de dar Deploy, en **Environment Variables** cargar estas siete.
Marcalas para **Production, Preview y Development**:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La del paso 1 |
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

Dale **Deploy**. El build corre `prisma migrate deploy`, que crea las
tablas en la base vacía.

Si falla con *"Can't reach database server"*, revisá que la
`DATABASE_URL` sea la pooled y que la base acepte conexiones desde
afuera.

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

## 7 · El cron

Ya está configurado en `vercel.json`: la sincronización corre a la hora
en punto y las alertas diez minutos después.

**Los cron de Vercel necesitan el plan Pro.** En el plan gratuito no
corren. Mientras tanto se pueden disparar a mano desde la app
(**Más → Sincronización → Sincronizar ahora**) o con curl:

```bash
curl -X POST https://<tu-proyecto>.vercel.app/api/sync \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Vercel manda ese header solo; no hay que hacer nada más.

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

**El build falla con "prisma: command not found".**
Falta `prisma` en dependencies. Ya está en devDependencies y Vercel las
instala en el build, así que no debería pasar.

**Las páginas tardan la primera vez.**
Es el cold start de las funciones. Con Fluid Compute (activado por
defecto) se nota poco.

**El service worker sirve una versión vieja después de un deploy.**
Está configurado con `skipWaiting`, así que se actualiza solo al segundo
ingreso. Si alguien queda pegado, que cierre la app y la vuelva a abrir.

**La cámara del escáner no abre.**
Solo funciona en HTTPS. En producción no hay problema; en local solo
anda en `localhost`.
