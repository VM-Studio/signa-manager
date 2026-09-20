# Lo que falta para pasar de demo a producción

Esto está armado para mostrárselo al dueño. Funciona de punta a punta con
datos de ejemplo, pero hay cosas que hacen falta antes de que la empresa
lo use todos los días.

Está ordenado por lo que más frena.

---

## 1 · Almacenamiento de archivos

**Qué falta:** hoy los campos `fotoUrl`, `archivoUrl` y `comprobanteUrl`
están en el schema y en los formularios, pero no hay dónde guardar el
archivo. La foto de una herramienta, el apto médico de un empleado o el
ticket de combustible no se pueden subir.

**Qué hay que hacer:** contratar un servicio de almacenamiento (Vercel
Blob es lo más directo si se publica en Vercel; también sirve S3 o
Cloudflare R2) y escribir un helper en `src/lib/archivos.ts` con dos
funciones: subir y borrar. Los formularios ya tienen el lugar donde
engancharlo.

**Cuánto pesa:** medio día. Es lo primero que van a pedir.

---

## 2 · Canales de email y WhatsApp

**Qué falta:** las alertas ya generan los registros de envío y el canal
de la app funciona. Email y WhatsApp tienen la interfaz escrita pero no
el proveedor conectado: las notificaciones quedan en estado PENDIENTE.

**Qué hay que hacer:** en `src/lib/alertas/notificaciones.ts` están las
dos clases con los puntos marcados con `COMPLETAR`.

- **Email:** elegir proveedor (Resend es el más simple), cargar
  `EMAIL_API_KEY` y `EMAIL_DESDE`, y completar la llamada.
- **WhatsApp:** hace falta una cuenta de WhatsApp Business aprobada y
  plantillas aprobadas por Meta. Ojo con esto: WhatsApp no deja mandar
  texto libre para iniciar una conversación, hay que usar plantillas, así
  que el mensaje de la alerta va a tener que partirse en parámetros. El
  trámite de aprobación tarda.

También está listo el **resumen diario por usuario**
(`armarResumenDiario`): falta agendar un cron que lo mande a la mañana.

**Cuánto pesa:** email, medio día. WhatsApp, una semana contando el
trámite con Meta.

---

## 3 · El adaptador real del sistema base

**Qué falta:** todavía no está decidido si va a ser Lebane o Sorby.

**Si es Sorby:** el adaptador está escrito y lee la planilla de Google
Sheets con una cuenta de servicio. Lo que falta es ajustar el mapeo en
`src/lib/integracion/sorby/mapeo.ts` contra la planilla real: los nombres
de las hojas, los títulos de las columnas y los valores que usa Sorby
para los estados y las categorías. El archivo tiene instrucciones de cómo
hacerlo. Después, cargar `SORBY_SHEET_ID`,
`SORBY_SERVICE_ACCOUNT_EMAIL` y `SORBY_SERVICE_ACCOUNT_KEY`, y compartir
la planilla con el email de la cuenta de servicio.

**Si es Lebane:** hay que conseguir la documentación de su API y
completar `src/lib/integracion/lebane.ts`, que tiene la estructura y el
manejo de errores hechos y los puntos marcados con `COMPLETAR`.

En los dos casos se cambia `SISTEMA_BASE` y no se toca ninguna pantalla.

**Cuánto pesa:** Sorby, uno o dos días una vez que se vea la planilla.
Lebane, depende de su API.

---

## 4 · Copias de seguridad

**Qué falta:** no hay backups configurados.

**Qué hay que hacer:**
- Si la base queda en **Neon**, activar el point-in-time recovery (viene
  en el plan pago) y quedarse tranquilo.
- Si queda en **Railway**, configurar los backups automáticos diarios.
- En los dos casos: probar una restauración antes de confiar. Un backup
  que nunca se restauró no es un backup.

Además conviene un export semanal a un lugar distinto del proveedor, por
si se pierde la cuenta.

**Cuánto pesa:** dos horas. No lo dejes para después.

---

## 5 · Carga inicial de datos reales

**Qué falta:** todo lo que hoy es de ejemplo.

**Por dónde arrancar, en orden:**

1. **Usuarios.** Diez personas, con su rol y vinculando al capataz y a los
   choferes con su legajo. Se cargan desde **Más → Usuarios**.
2. **Unidades de negocio y depósitos.** Ya están las cinco unidades; hay
   que confirmar los depósitos reales.
3. **Empleados.** Son unos 60. Hay alta masiva por CSV con vista previa:
   **Personal → Empleados → + → ícono de subir**. Las columnas
   obligatorias son legajo, nombre, apellido, dni, categoría, valor hora
   y fecha de ingreso. Verifica el dígito del CUIL y avisa fila por fila
   antes de cargar nada.
4. **Herramientas.** Acá sí hay carga masiva por CSV con vista previa:
   **Herramientas → Nueva → Cargar desde un archivo**. Van a ser
   cientos, así que conviene armar la planilla primero.
5. **Imprimir las etiquetas QR** y pegarlas. Desde
   **Herramientas → Etiquetas**, 24 por hoja A4.
6. **Vehículos** con su documentación y vencimientos.
7. **Obras**: si el sistema base ya las tiene, las trae la
   sincronización. Si no, se cargan a mano.

**Cuánto pesa:** una semana de trabajo de alguien de la empresa, sobre
todo pegar las etiquetas.

---

## 6 · Cosas más chicas que van a pedir

- **Reabrir una quincena cerrada.** Hoy no se puede. Si cierran una por
  error, hay que tocar la base.
- **Cambiar la propia contraseña.** Hoy la restablece administración.
- **Firmar el parte diario.** Mencionaron que les gustaría que el capataz
  firme en el teléfono. Es un canvas y un `archivoUrl`, pero necesita el
  punto 1.
- **Posición por GPS de los vehículos.** La pantalla "En este momento"
  está preparada con el punto de extensión documentado; falta contratar
  el servicio de rastreo.

---

## 7 · Cosas técnicas para mirar

- **`npm audit` marca vulnerabilidades** en dependencias de build:
  `deepmerge-ts` (viene con el CLI de Prisma) y `postcss` (viene con
  Next). Arreglarlas pide Prisma 7 y Next 16, que CLAUDE.md descarta.
  Son de build, no de runtime, así que el riesgo es bajo, pero conviene
  revisar cuando haya que actualizar versiones.
- **El límite de intentos de login** está en memoria del proceso. Para
  diez usuarios alcanza. Si algún día hace falta que sea compartido entre
  instancias, hay que pasarlo a Redis: la interfaz ya está aislada en
  `src/lib/auth/limite-intentos.ts`.
- **Los empleados no están filtrados por obra.** Un capataz puede ver la
  ficha de cualquier empleado, incluido su valor hora. Hoy lo necesita
  para sumar gente al parte, pero si molesta se puede acotar.
- **`personal.crear` y `personal.editar` los tiene también el capataz.**
  La matriz de CLAUDE.md se los da porque los necesita para el parte
  diario, pero de paso le habilitan el alta de empleados y el cambio de
  valor hora. Si molesta, la solución limpia es partir el permiso en
  `personal.parte` y `personal.legajo` en `src/lib/auth/permisos.ts`; son
  dos líneas en la matriz y los `exigirPermiso` de
  `src/server/personal/empleados.ts`. En vehículos ya está resuelto así:
  la gestión de flota usa `vehiculos.aprobar` (dueño, administración y
  logística) porque ahí `vehiculos.crear` significa "puede pedir un
  viaje".
- **El PDF del tablero** sale del "Guardar como PDF" del navegador, no de
  una librería. Funciona bien y no agrega 40 MB de dependencias, pero si
  quieren mandarlo por email automático va a hacer falta generarlo en el
  servidor.
