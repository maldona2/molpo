# Detalle de ticket en el tablero — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **auto-build host:** Claude plans+reviews; Grok implements via headless CLI.
> <!-- auto-build plan · 2026-09-08 · source: claude+writing-plans -->

**Goal:** Que al clickear una tarjeta del tablero se abra una página con el detalle completo del ticket (descripción, URL, quién reporta, fechas, todas las capturas, respuesta), y que el admin pueda responder desde ahí.

**Architecture:** Página server-rendered nueva en `app/(privado)/tablero/[id]/page.tsx`. El título de la tarjeta pasa a ser un `<a href="/tablero/<id>/">` — sin modal, sin estado de cliente, sin tocar dnd-kit (el `PointerSensor` ya usa `activationConstraint: { distance: 6 }`, así que un click sin movimiento sigue siendo click; el link de "capturas" dentro de la tarjeta ya funciona así hoy). La autorización va con la misma regla que `app/adjuntos/[id]/route.ts`: admin ve todo, cliente sólo lo suyo, y "no existe" y "no es tuyo" devuelven el mismo 404. La lógica pura (autorización y detección de cambios) vive en `lib/tickets.ts` con tests en `lib/tickets.test.mjs`; las consultas en `lib/tickets-db.ts`.

**Tech Stack:** Next.js 15 App Router, React 19 Server Components, TypeScript 5, CSS Modules, postgres (porsager), tests con `node --experimental-strip-types --test`.

**Spec:** Este documento. Pedido original del usuario: "me falta el detalle del bug, al clickearlo en el tablero, así lo veo con más detalle" sobre https://app.molpo.ar/tablero/.

## Global Constraints

- **No hagas `git commit`, `git push`, ni abras PRs.** El usuario no lo pidió en esta corrida.
- Diff mínimo. Nada de refactors de paso ni de renombrar cosas existentes.
- Los comentarios de código en este repo están **en español**, explican el *porqué* (no el qué), y son escasos. Seguí ese tono.
- El texto de UI va en **español rioplatense** (voseo: "Arrastrá", "Contame"), igual que el resto del app.
- Nada de librerías nuevas. `package.json` no se toca.
- Imports internos con alias `@/` (ej. `@/lib/tickets`). Los imports dentro de `lib/*.ts` que consumen los tests `.mjs` usan extensión explícita `.ts` (ver `lib/tablero.ts`, que importa `"./tickets.ts"`), porque node corre los tests con type stripping.
- Los archivos de test son `lib/<modulo>.test.mjs` con `node:test` + `node:assert/strict`, y corren con `pnpm test`.
- No agregues `"use client"` a nada nuevo: la página de detalle es un Server Component.
- Verificación final obligatoria: `pnpm test` y `pnpm typecheck` en verde.

---

### Task 1: Autorización pura + lectura de un ticket

**Files:**
- Modify: `lib/tickets.ts` (agregar `puedeVerTicket` al final del archivo)
- Modify: `lib/tickets-db.ts` (agregar `getTicket` después de `listTickets`)
- Test: `lib/tickets.test.mjs` (agregar tests al final)

**Interfaces:**
- Consumes: el tipo `Ticket` y `Identidad` ya existentes.
- Produces:
  - `puedeVerTicket(quien: { rol: "admin" } | { rol: "cliente"; nombre: string }, clienteDelTicket: string): boolean`
  - `getTicket(id: number): Promise<Ticket | undefined>`

- [x] **Step 1: Escribir el test que falla**

Agregar al final de `lib/tickets.test.mjs` (el archivo ya importa de `./tickets.ts`; sumá `puedeVerTicket` a esa lista de imports existente):

```js
test("el admin ve el ticket de cualquier cliente", () => {
  assert.equal(puedeVerTicket({ rol: "admin" }, "Panadería Sol"), true);
});

test("el cliente ve sólo sus propios tickets", () => {
  assert.equal(puedeVerTicket({ rol: "cliente", nombre: "Panadería Sol" }, "Panadería Sol"), true);
  assert.equal(puedeVerTicket({ rol: "cliente", nombre: "Panadería Sol" }, "Otra SRL"), false);
});
```

- [x] **Step 2: Correr el test y verificar que falla**

Run: `pnpm test`
Expected: FAIL — `puedeVerTicket is not a function` (o error de import).

- [x] **Step 3: Implementar `puedeVerTicket`**

Al final de `lib/tickets.ts`:

```ts
/**
 * Quién puede mirar un ticket. El admin ve todo; el cliente, sólo lo suyo.
 * Misma regla que sirve las capturas en app/adjuntos/[id]/route.ts.
 */
export function puedeVerTicket(
  quien: { rol: "admin" } | { rol: "cliente"; nombre: string },
  clienteDelTicket: string,
): boolean {
  return quien.rol === "admin" || quien.nombre === clienteDelTicket;
}
```

- [x] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm test`
Expected: PASS.

- [x] **Step 5: Agregar `getTicket` en `lib/tickets-db.ts`**

Justo después de la función `listTickets`:

```ts
/** Un ticket por id, sin filtrar por cliente: quién puede verlo lo decide la página. */
export async function getTicket(id: number): Promise<Ticket | undefined> {
  const client = await db();
  const [ticket] = await client<Ticket[]>`select * from tickets where id = ${id}`;
  return ticket;
}
```

- [x] **Step 6: Verificar que compila**

Run: `pnpm typecheck`
Expected: sin errores.

---

### Task 2: Página de detalle `/tablero/[id]/`

**Files:**
- Create: `app/(privado)/tablero/[id]/page.tsx`
- Create: `app/(privado)/tablero/[id]/Detalle.module.css`

**Interfaces:**
- Consumes: `puedeVerTicket` y `getTicket` (Task 1), `exigirIdentidad` de `@/lib/auth`, `ETIQUETAS` de `@/lib/tickets`, `listAdjuntos` de `@/lib/adjuntos-db`.
- Produces: la ruta `/tablero/<id>/`, a la que Task 3 linkea desde la tarjeta.

- [x] **Step 1: Crear la página**

Crear `app/(privado)/tablero/[id]/page.tsx` con exactamente esto:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirIdentidad } from "@/lib/auth";
import { ETIQUETAS, puedeVerTicket } from "@/lib/tickets";
import { getTicket } from "@/lib/tickets-db";
import { listAdjuntos } from "@/lib/adjuntos-db";
import styles from "./Detalle.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Detalle del pedido" };

type Props = { params: Promise<{ id: string }> };

const fecha = (valor: Date) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(valor),
  );

export default async function DetallePage({ params }: Props) {
  const quien = await exigirIdentidad();

  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  const ticket = await getTicket(ticketId);
  // Mismo 404 para "no existe" y "no es tuyo": no confirmamos la existencia de
  // un pedido a quien no puede verlo.
  if (!ticket || !puedeVerTicket(quien, ticket.cliente)) notFound();

  const capturas = await listAdjuntos([ticket.id]);

  return (
    <div className={`container ${styles.wrap}`}>
      <a href="/tablero/" className={styles.volver}>
        ← Volver al tablero
      </a>

      <div className={styles.meta}>
        <span className={`${styles.prioridad} ${styles[ticket.prioridad]}`}>
          {ETIQUETAS[ticket.prioridad]}
        </span>
        <span className={styles.estado}>{ETIQUETAS[ticket.estado]}</span>
        <span>
          #{ticket.id} · {ETIQUETAS[ticket.tipo]}
          {quien.rol === "admin" ? ` · ${ticket.cliente}` : ""}
        </span>
      </div>

      <h1 className={styles.h1}>{ticket.titulo}</h1>

      <dl className={styles.datos}>
        {ticket.url ? (
          <div>
            <dt>Pantalla o URL</dt>
            <dd>{ticket.url}</dd>
          </div>
        ) : null}
        {ticket.reporta ? (
          <div>
            <dt>Reporta</dt>
            <dd>{ticket.reporta}</dd>
          </div>
        ) : null}
        <div>
          <dt>Creado</dt>
          <dd>{fecha(ticket.creado)}</dd>
        </div>
        <div>
          <dt>Última novedad</dt>
          <dd>{fecha(ticket.actualizado)}</dd>
        </div>
      </dl>

      <section className={styles.bloque} aria-labelledby="detalle">
        <h2 id="detalle" className={styles.h2}>
          Detalle
        </h2>
        {/* El detalle lo escribió una persona en un textarea: los saltos de
            línea son parte de lo que quiso decir. */}
        <p className={styles.detalle}>{ticket.detalle}</p>
      </section>

      {capturas.length > 0 ? (
        <section className={styles.bloque} aria-labelledby="capturas">
          <h2 id="capturas" className={styles.h2}>
            Capturas ({capturas.length})
          </h2>
          <ul className={styles.capturas}>
            {capturas.map((captura) => (
              <li key={captura.id}>
                <a href={`/adjuntos/${captura.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/adjuntos/${captura.id}`} alt={captura.nombre} loading="lazy" />
                  <span>{captura.nombre}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ticket.respuesta ? (
        <section className={styles.bloque} aria-labelledby="respuesta">
          <h2 id="respuesta" className={styles.h2}>
            Respuesta
          </h2>
          <p className={styles.respuesta}>{ticket.respuesta}</p>
        </section>
      ) : null}
    </div>
  );
}
```

- [x] **Step 2: Crear el CSS**

Crear `app/(privado)/tablero/[id]/Detalle.module.css`. Usa sólo tokens que ya existen en `app/globals.css` (`--surface`, `--bg`, `--borde`, `--texto-cuerpo`, `--texto-tenue`, `--r-card`, `--r-pill`, `--r-boton`, `--azul-medio`, `--accent`):

```css
.wrap {
  padding-bottom: 40px;
  max-width: 820px;
}
.volver {
  display: inline-block;
  font-size: 14px;
  color: var(--texto-tenue);
  text-decoration: none;
  margin-bottom: 18px;
}
.volver:hover {
  color: var(--texto-cuerpo);
}
.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--texto-tenue);
  margin-bottom: 8px;
}
.prioridad,
.estado {
  font-weight: 600;
  border-radius: var(--r-pill);
  padding: 2px 10px;
}
.estado {
  color: var(--texto-cuerpo);
  background: var(--surface);
  border: 1px solid var(--borde);
}
.alta {
  color: #b4231f;
  background: rgba(180, 35, 31, 0.12);
}
.media {
  color: var(--azul-medio);
  background: rgba(78, 120, 169, 0.14);
}
.baja {
  color: var(--texto-tenue);
  background: rgba(128, 128, 128, 0.12);
}
.h1 {
  font-size: clamp(22px, 3vw, 30px);
  margin: 0 0 20px;
  line-height: 1.25;
}
.h2 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--texto-tenue);
  margin: 0 0 10px;
}
.datos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin: 0 0 24px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--borde);
  border-radius: var(--r-card);
}
.datos dt {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--texto-tenue);
  margin-bottom: 3px;
}
.datos dd {
  margin: 0;
  font-size: 14px;
  color: var(--texto-cuerpo);
  overflow-wrap: anywhere;
}
.bloque {
  margin-bottom: 24px;
}
.detalle,
.respuesta {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--texto-cuerpo);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.respuesta {
  border-left: 2px solid var(--borde);
  padding-left: 12px;
}
.capturas {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.capturas a {
  display: block;
  text-decoration: none;
  color: var(--texto-tenue);
  font-size: 12px;
}
.capturas img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  background: var(--bg);
  margin-bottom: 5px;
}
.capturas span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [x] **Step 3: Verificar que compila**

Run: `pnpm typecheck`
Expected: sin errores.

---

### Task 3: Linkear la tarjeta del tablero al detalle

**Files:**
- Modify: `components/Tablero.tsx` (dentro del componente `Contenido`, el `<p className={styles.tarjetaTitulo}>`)
- Modify: `components/Tablero.module.css` (agregar estilo del link del título)

**Interfaces:**
- Consumes: la ruta `/tablero/<id>/` de Task 2.
- Produces: nada que consuman otras tasks.

- [x] **Step 1: Convertir el título en link**

En `components/Tablero.tsx`, dentro de `Contenido`, reemplazar exactamente esta línea:

```tsx
      <p className={styles.tarjetaTitulo}>{tarjeta.titulo}</p>
```

por:

```tsx
      {/* El drag arranca recién a los 6px (ver PointerSensor), así que un click
          sin movimiento sigue abriendo el detalle. */}
      <p className={styles.tarjetaTitulo}>
        <a className={styles.enlaceTitulo} href={`/tablero/${tarjeta.id}/`}>
          {tarjeta.titulo}
        </a>
      </p>
```

- [x] **Step 2: Estilar el link**

En `components/Tablero.module.css`, agregar después del bloque `.tarjetaTitulo`:

```css
.enlaceTitulo {
  color: inherit;
  text-decoration: none;
}
.enlaceTitulo:hover {
  text-decoration: underline;
}
```

- [x] **Step 3: Verificar que compila**

Run: `pnpm typecheck`
Expected: sin errores.

---

### Task 4: El admin responde y mueve desde el detalle

**Files:**
- Modify: `lib/tickets.ts` (agregar `hayNovedad` al final)
- Modify: `lib/tickets.test.mjs` (tests de `hayNovedad`)
- Modify: `app/(privado)/tablero/acciones.ts` (`moverTicket` acepta `respuesta` opcional)
- Modify: `app/(privado)/tablero/[id]/page.tsx` (formulario de admin)
- Modify: `app/(privado)/tablero/[id]/Detalle.module.css` (estilo del formulario)

**Interfaces:**
- Consumes: `moverTicket` de `@/app/(privado)/tablero/acciones`, `ESTADOS` y `ETIQUETAS` de `@/lib/tickets`.
- Produces: `hayNovedad(previo: { estado: string; respuesta: string | null }, estado: string, respuesta: string | null): boolean`

**Por qué:** `updateTicket` ya guarda `respuesta`, pero hoy no hay ninguna pantalla que la escriba — la capacidad existe y está muerta. El detalle es el lugar natural. `moverTicket` hoy corta temprano cuando el estado no cambió (`if (previo.estado === estado) redirect("/tablero/")`), lo que descartaría una respuesta nueva; `hayNovedad` reemplaza esa comparación.

- [x] **Step 1: Escribir el test que falla**

Agregar al final de `lib/tickets.test.mjs` (y sumar `hayNovedad` a los imports de `./tickets.ts`):

```js
test("no hay novedad si no cambian ni el estado ni la respuesta", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "abierto", null), false);
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "Ya está" }, "abierto", "Ya está"), false);
});

test("hay novedad si cambia el estado", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "en_curso", null), true);
});

test("hay novedad si cambia sólo la respuesta", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "abierto", "Lo miro hoy"), true);
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "Viejo" }, "abierto", "Nuevo"), true);
});

test("una respuesta vacía y una ausente son lo mismo", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "abierto", ""), false);
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "" }, "abierto", null), false);
});
```

- [x] **Step 2: Correr el test y verificar que falla**

Run: `pnpm test`
Expected: FAIL — `hayNovedad is not a function`.

- [x] **Step 3: Implementar `hayNovedad`**

Al final de `lib/tickets.ts`:

```ts
/**
 * Si nada cambió, no hay que guardar ni avisarle al cliente. Vacío y ausente
 * son la misma respuesta: el textarea manda "" cuando el admin no escribe nada.
 */
export function hayNovedad(
  previo: { estado: string; respuesta: string | null },
  estado: string,
  respuesta: string | null,
): boolean {
  return previo.estado !== estado || (previo.respuesta ?? "") !== (respuesta ?? "");
}
```

- [x] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm test`
Expected: PASS.

- [x] **Step 5: Hacer que `moverTicket` acepte una respuesta**

En `app/(privado)/tablero/acciones.ts`:

1. Sumar `hayNovedad` al import existente de `@/lib/tickets`:

```ts
import { parseEstado, ETIQUETAS, hayNovedad } from "@/lib/tickets";
```

2. Reemplazar el bloque que va desde `const previo = ...` hasta `const ticket = await updateTicket(...)` por:

```ts
  const previo = (await listTickets()).find((t) => t.id === id);
  if (!previo) redirect("/tablero/?error=1");

  // El formulario del detalle manda `respuesta`; el select de la tarjeta no,
  // y en ese caso la respuesta que ya había se conserva.
  const crudo = formData.get("respuesta");
  const respuesta = crudo === null ? previo.respuesta : String(crudo).trim().slice(0, 5000) || null;

  if (!hayNovedad(previo, estado, respuesta)) redirect("/tablero/");

  const ticket = await updateTicket(id, estado, respuesta);
```

El resto de la función (el `sendMail`, el `revalidatePath` y el `redirect`) queda igual.

3. Agregar `revalidatePath` del detalle junto al que ya existe, para que la página del ticket muestre lo recién guardado:

```ts
  revalidatePath("/tablero");
  revalidatePath(`/tablero/${id}`);
  redirect("/tablero/");
```

- [x] **Step 6: Agregar el formulario de admin en el detalle**

En `app/(privado)/tablero/[id]/page.tsx`:

1. Sumar a los imports:

```tsx
import { ESTADOS, ETIQUETAS, puedeVerTicket } from "@/lib/tickets";
import { moverTicket } from "@/app/(privado)/tablero/acciones";
```

(reemplazando el import previo de `@/lib/tickets`).

2. Insertar, justo antes del `</div>` que cierra el `container`, después del bloque de `ticket.respuesta`:

```tsx
      {quien.rol === "admin" ? (
        <form action={moverTicket} className={styles.gestion}>
          <input type="hidden" name="id" value={ticket.id} />
          <label className={styles.campo}>
            <span>Estado</span>
            <select name="estado" defaultValue={ticket.estado}>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {ETIQUETAS[estado]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.campo}>
            <span>Respuesta para el cliente</span>
            <textarea
              name="respuesta"
              rows={4}
              maxLength={5000}
              defaultValue={ticket.respuesta ?? ""}
              placeholder="Qué le contás al cliente sobre este pedido."
            />
          </label>
          <button type="submit" className={styles.guardar}>
            Guardar y avisar
          </button>
        </form>
      ) : null}
```

- [x] **Step 7: Estilar el formulario**

Agregar al final de `app/(privado)/tablero/[id]/Detalle.module.css`:

```css
.gestion {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--borde);
  border-radius: var(--r-card);
}
.campo {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.campo span {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--texto-tenue);
}
.campo select,
.campo textarea {
  font: inherit;
  font-size: 14px;
  color: var(--texto-cuerpo);
  background: var(--bg);
  border: 1px solid var(--borde);
  border-radius: var(--r-boton);
  padding: 9px 10px;
  resize: vertical;
}
.guardar {
  align-self: flex-start;
  font: inherit;
  font-size: 14px;
  color: var(--blanco, #fff);
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--r-boton);
  padding: 9px 18px;
  cursor: pointer;
}
```

- [x] **Step 8: Verificación final**

Run: `pnpm test`
Expected: todos los tests en verde, incluidos los nuevos de `puedeVerTicket` y `hayNovedad`.

Run: `pnpm typecheck`
Expected: sin errores.

Run: `pnpm build`
Expected: build exitoso, con la ruta `/tablero/[id]` listada como dinámica.
