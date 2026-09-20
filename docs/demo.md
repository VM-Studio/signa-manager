# Recorrido de presentación · 10 minutos

Guion para mostrarle la app al dueño. Está ordenado según los problemas
que él mismo contó, no según los módulos del sistema: la idea es que
cada pantalla conteste algo que hoy le duele.

## Antes de empezar

1. Reiniciar los datos: `npm run db:reset`, o desde la app con el usuario
   dueño en **Más → Sincronización** y después
   `POST /api/demo/reiniciar?confirmar=si`.
2. Correr el motor de alertas una vez para que estén todas al día:
   entrar a **Alertas** y tocar **Revisar ahora**.
3. Tener el teléfono con la app instalada en la pantalla de inicio.
   Si no, abrir Chrome o Safari en el celular, no la computadora.
4. Cerrar sesión, para arrancar mostrando el splash.

Todos los usuarios entran con la contraseña **signa2026**.

---

## 0 · El arranque · 30 segundos

**Entrar con:** nadie todavía.

Abrir la app desde el ícono del teléfono. Se ve el splash negro con el
logo y la barra de carga.

> "Esto es una app instalada, no una página. Funciona como cualquier otra
> del teléfono."

En el login, abrir **Usuarios de demostración** y tocar **Eduardo
Bianchi**. Se completa solo.

---

## 1 · La herramienta que iban a comprar y ya tenían · 2 minutos

**Entrar con:** Rubén Ferreyra (pañolero) — `ruben@signa.demo`

Del inicio del pañolero, tocar **Solicitudes pendientes**.

Abrir la solicitud de la **placa compactadora** que pidió Los Robles.

> "Antes, esto terminaba en una compra. El jefe de obra pedía, y nadie
> sabía si la empresa ya la tenía."

Señalar la sección **Lo que ya tenemos**: el sistema muestra las
herramientas de esa categoría que están libres en un depósito, las que
quedaron en obras terminadas y las que llevan más de 45 días sin moverse
en otra obra.

Tocar una o dos para elegirlas. Aparece el aviso verde:

> **Compra evitada: $X.XXX.XXX**

Tocar **Resolver con stock propio** y confirmar.

Volver a **Solicitudes**. Arriba está el contador del mes:

> "Este número es el que te importa a vos. Es la plata que la empresa
> dejó de gastar este mes porque el sistema sabe qué tiene y dónde está."

---

## 2 · El camión que nadie sabe dónde está · 1 minuto y medio

**Entrar con:** Nicolás Bustos (logística) — `nicolas@signa.demo`

Del inicio, tocar **Vehículos → En este momento**.

> "Esto es la flota ahora mismo. Cuál está en viaje, hacia dónde, para
> qué obra, desde qué hora y con qué chofer."

Volver a **Solicitudes de viaje** y abrir la **urgente sin asignar** de
Santa Rita (hierro para las vigas, 4.200 kg).

Mostrar la lista de vehículos propuestos:

> "El sistema ordena los que sirven del más chico al más grande. No te
> manda el camión de 15 toneladas a llevar 4: ese queda libre para otra
> cosa."

Bajar hasta **Los que no se pueden usar** y señalar la Toyota Hilux:

> **"Tiene el seguro vencido desde ayer. No puede salir a la calle."**

> "Eso antes se descubría cuando lo paraba la policía."

---

## 3 · Cuánta mano de obra se lleva cada obra · 2 minutos

**Entrar con:** Martín Quiroga (capataz) — `martin@signa.demo`

En el inicio está su obra del día y el botón grande **Cargar parte de
hoy**. Tocarlo.

> "Esto lo llena un capataz parado en la obra, con el celular en la mano.
> Ya vienen todos los asignados, todos presentes con 8 horas. Solo corrige
> las excepciones."

Tocar la **A** de una persona (ausente). Desplegar otra con la flecha y
poner 2 horas extra al 50%.

Señalar el resumen que se actualiza arriba: presentes, ausentes, horas,
extra.

Tocar **Enviar parte**.

**Cambiar a:** Diego Sarmiento (jefe de obra) — `diego@signa.demo`

En **Personal → Partes diarios** está el parte esperando. Tocar
**Aprobar**.

> "Al aprobar se congela el valor hora y el costo de cada línea. Un
> aumento de paritaria el mes que viene no te reescribe el costo de esta
> obra."

Ir a **Obras → Edificio Los Robles**. Mostrar la barra:

> **92% del presupuesto de mano de obra**

> "Esto antes lo sabías cuando cerrabas la obra."

---

## 4 · El pedido de compra frenado que para una obra · 1 minuto y medio

**Entrar con:** Eduardo Bianchi (dueño) — `eduardo@signa.demo`

Ir a **Alertas**. Filtrar por **Compras**.

Abrir **"Material que no llegó a SIG-2026-014"**.

> "Hormigón para la platea del subsuelo, $24.800.000, aprobado hace once
> días. Tenía que estar en obra hace tres. La cuadrilla está esperando."

Tocar **Ir a resolverla**: lleva directo a la pestaña Compras de la obra.

> "Los pedidos se cargan y se aprueban en el sistema base. La app no los
> duplica: los lee y te avisa cuando se traban."

Volver a Alertas y mostrar el resto:

> "Veintitrés reglas corriendo cada hora. Herramientas sin devolver,
> documentación vencida, partes que faltan, licencias por vencer,
> vehículos que necesitan service."

Si hay tiempo, mostrar que se resuelven solas: desde el pañolero,
devolver la amoladora vencida y volver a Alertas — la alerta ya no está.

---

## 5 · El cierre: el tablero · 2 minutos

**Seguir con:** Eduardo Bianchi (dueño)

Del inicio, tocar **Tablero**.

**Bloque 1 — la empresa.** Ingresos, costos, resultado y margen del mes,
comparados con el mes anterior.

> "Esto es lo que ninguna planilla te daba: el costo real. El sistema
> base te da los materiales y los subcontratos. La app le suma la mano de
> obra, los viajes y las herramientas. Recién ahí sabés cuánto te costó
> de verdad."

Tocar el ícono de información al lado de **Ingresos**:

> "Cada número te dice de dónde sale. Cuántos movimientos, cuántos partes,
> cuántos viajes, y cuándo fue la última sincronización."

**Bloque 2 — por unidad de negocio.** Las cinco áreas en barras.

> "Acá ves qué área te deja plata y cuál no."

Tocar una unidad: filtra todo lo de abajo.

**Bloque 3 — por obra.** En la computadora se ve la tabla con la barra de
composición del costo de cada obra.

> "La colectora está en rojo. Y se pasó del presupuesto de mano de obra."

Tocar esa obra para abrir el detalle: evolución mensual, de qué está hecho
el costo, horas por semana y los pedidos demorados.

**Bloque 4 — estructura.**

> "Los gastos fijos no se reparten entre las obras. Acá ves cuánto se
> llevan: el X% de todo lo que facturás."

**Bloque 5 — la operación hoy.** Personas trabajando, ausentismo,
vehículos en viaje, herramientas en obra, compras evitadas y alertas
críticas.

Cerrar con el resultado neto:

> "Las obras dejaron esto. La estructura se llevó esto. Te queda esto."

---

## Si preguntan

**"¿Esto reemplaza a Lebane / Sorby?"**
No. El sistema base sigue manejando la plata, las compras y el stock de
materiales. Esta app registra lo que ese sistema no cubre y junta los dos
para mostrar el costo real. Cada dato vive en un solo lugar.

**"¿Y si cambiamos de sistema base?"**
Se escribe un adaptador nuevo y no se toca ninguna pantalla. Está
preparado para los dos: hoy corre con datos de ejemplo, y hay un
adaptador para Sorby (lee la planilla de Google) y la estructura para
Lebane.

**"¿Funciona sin señal?"**
El parte diario sí: se guarda en el teléfono y se manda solo cuando
vuelve la señal. El resto necesita conexión, porque mostrar datos viejos
sería peor.

**"¿Cuánto falta para producción?"**
Está en `docs/pendientes.md`: almacenamiento de archivos, los canales de
email y WhatsApp, el adaptador real del sistema base, copias de seguridad
y la carga inicial de datos reales.
