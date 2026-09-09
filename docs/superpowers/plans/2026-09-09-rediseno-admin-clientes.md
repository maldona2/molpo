# Rediseño admin + clientes (app.molpo.ar) Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **auto-build host:** Claude plans+reviews; Grok implements via headless CLI.
> <!-- auto-build plan · 2026-09-09 · source: claude+writing-plans -->

**Goal:** Aplicar el rediseño de la capa de presentación del área `(privado)` (sidebar fija,
tablero con métricas, detalle en dos columnas, clientes en tabla con buscador, feedback con
resumen, formularios agrupados) copiando los archivos del handoff, **sin** reintroducir el
drag & drop del tablero.

**Architecture:** Sólo cambia presentación: JSX + CSS Modules. No se toca `lib/*.ts`, ni los
server actions (`app/(privado)/acciones.ts`, `app/(privado)/tablero/acciones.ts`), ni
`admin/propuestas/*`. Se agregan dos client components nuevos: `components/NavLinks.tsx`
(estado activo del sidebar via `usePathname`) y `app/(privado)/clientes/ClientesTable.tsx`
(tabla + buscador en memoria). `components/Tablero.tsx` **queda como está** (server component,
mover con `<select>` de `MoverEstado`).

**Tech Stack:** Next.js App Router (React server components), TypeScript, CSS Modules,
pnpm, Playwright (e2e), `node --test` (unit).

**Spec:** `/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes/README.md`
(el handoff completo con los archivos fuente vive en ese directorio).

## Global Constraints

- **HANDOFF** = `/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes`. Los archivos
  a copiar salen de ahí. Es un directorio de trabajo permitido, se puede leer.
- **NO reintroducir drag & drop.** El repo lo sacó a propósito en el commit `44a1d7a`
  ("sacar el drag y mover con botones"). Por eso este plan **excluye**
  `components/Tablero.tsx` y `components/MoverEstado.tsx` del handoff.
- No abrir PRs, no pushear, no commitear salvo que el usuario lo haya pedido en este run.
- No agregar dependencias nuevas. El handoff no las necesita.
- No tocar `lib/*.ts`, ni ningún server action, ni `app/(privado)/admin/propuestas/*`.
- **Preservar los comentarios existentes del repo** que explican el *por qué* cuando la línea
  que comentan sobrevive al rediseño. El handoff los borró por descuido. Los tres a
  restaurar están listados explícitamente en las tareas 3 y 4.
- Después de cada tarea correr `pnpm typecheck` y `pnpm lint`. Ambos deben pasar limpio.
- Comandos se corren desde la raíz del repo: `/Users/matiasagustinmaldonado/Coding/molpo`.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `components/NavLinks.tsx` | Crear | Links del sidebar con `aria-current` según `usePathname()` |
| `app/(privado)/layout.tsx` | Reemplazar | Shell con sidebar en vez de barra superior |
| `app/(privado)/App.module.css` | Reemplazar | Estilos del shell + sidebar |
| `app/(privado)/Panel.module.css` | Reemplazar | h1/bajada/stats/filtros compartidos entre páginas |
| `app/(privado)/tablero/page.tsx` | Reemplazar | Dashboard: fila de métricas + filtros + tablero |
| `app/(privado)/tablero/Tablero.module.css` | Reemplazar | Wrapper de la página del tablero |
| `components/Tablero.module.css` | Reemplazar (editado) | Columnas y tarjetas, **sin** reglas de drag |
| `components/Tablero.tsx` | **Sin cambios** | Sigue siendo server component con `<select>` |
| `components/MoverEstado.tsx` | **Sin cambios** | La prop `formRef` del handoff sólo servía al drag |
| `app/(privado)/tablero/[id]/page.tsx` | Reemplazar (editado) | Detalle en dos columnas |
| `app/(privado)/tablero/[id]/Detalle.module.css` | Reemplazar | Grid de dos columnas del detalle |
| `app/(privado)/clientes/page.tsx` | Reemplazar | Server component que pasa datos a la tabla |
| `app/(privado)/clientes/ClientesTable.tsx` | Crear | Tabla + buscador (client) |
| `app/(privado)/clientes/Clientes.module.css` | Reemplazar | Estilos de la tabla |
| `app/(privado)/opiniones/page.tsx` | Reemplazar | Resumen de métricas + lista |
| `app/(privado)/opiniones/Opiniones.module.css` | Reemplazar | Estilos del feedback |
| `app/(privado)/pedidos/page.tsx` | Reemplazar | Form agrupado en fieldsets |
| `app/(privado)/pedidos/Pedidos.module.css` | Reemplazar | Estilos del form |
| `app/(privado)/opinar/page.tsx` | Reemplazar | Form + escala en pastillas |
| `app/(privado)/opinar/Opinar.module.css` | Reemplazar | Autocontenido, ya no importa Pedidos |
| `app/(privado)/entrar/page.tsx` | Reemplazar | Tarjeta centrada con logo |
| `app/(privado)/entrar/Entrar.module.css` | Reemplazar | Estilos del login |

---

### Task 1: Sidebar del área privada

**Files:**
- Create: `components/NavLinks.tsx`
- Replace: `app/(privado)/layout.tsx`
- Replace: `app/(privado)/App.module.css`

**Interfaces:**
- Produces: `NavLinks` — `export default function NavLinks({ items }: { items: { href: string; label: string }[] })`.
  Client component (`"use client"`), marca `aria-current="page"` en el link cuyo `href`
  coincide con `usePathname()`.
- Consumes: nada de tareas previas.

- [ ] **Step 1: Copiar los tres archivos**

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
H=/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes
cp "$H/components/NavLinks.tsx" components/NavLinks.tsx
cp "$H/app/(privado)/layout.tsx" "app/(privado)/layout.tsx"
cp "$H/app/(privado)/App.module.css" "app/(privado)/App.module.css"
```

- [ ] **Step 2: Restaurar el comentario del `robots` en el layout**

El handoff borró este comentario. Volvé a ponerlo justo arriba de la línea
`robots: { index: false, follow: false, nocache: true },` en
`app/(privado)/layout.tsx`:

```tsx
  // El área privada no se indexa nunca, ni siquiera si el dominio se filtra.
  robots: { index: false, follow: false, nocache: true },
```

- [ ] **Step 3: Verificar tipos y lint**

Run:

```bash
pnpm typecheck && pnpm lint
```

Expected: `tsc --noEmit` sin salida y `next lint` con "No ESLint warnings or errors".
Si `NavLinks.tsx` falta el `"use client"` o importa algo inexistente, va a fallar acá.

---

### Task 2: Tablero con fila de métricas (sin drag)

**Files:**
- Replace: `app/(privado)/tablero/page.tsx`
- Replace: `app/(privado)/Panel.module.css`
- Replace: `app/(privado)/tablero/Tablero.module.css`
- Replace (editado): `components/Tablero.module.css`
- **NO tocar:** `components/Tablero.tsx`, `components/MoverEstado.tsx`

**Interfaces:**
- Consumes: `components/Tablero.tsx` sigue exportando
  `export default function Tablero({ columnas, esAdmin }: { columnas: ColumnaData[]; esAdmin: boolean })`
  y `MoverEstado` sigue con la firma actual (sin `formRef`). El `page.tsx` del handoff ya
  llama a `Tablero` con esa misma forma, así que encaja sin cambios.
- Produces: clases de `Panel.module.css` (`h1`, `bajada`, `stats`, `stat`, `statValor`,
  `statEtiqueta`, `filtros`, `activo`) que reusan las tareas 4, 5 y 6.

- [ ] **Step 1: Copiar los CSS y la página**

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
H=/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes
cp "$H/app/(privado)/Panel.module.css" "app/(privado)/Panel.module.css"
cp "$H/app/(privado)/tablero/page.tsx" "app/(privado)/tablero/page.tsx"
cp "$H/app/(privado)/tablero/Tablero.module.css" "app/(privado)/tablero/Tablero.module.css"
cp "$H/components/Tablero.module.css" components/Tablero.module.css
```

- [ ] **Step 2: Sacar del CSS las reglas que sólo servían al drag**

En `components/Tablero.module.css` borrá los dos bloques que quedaron muertos porque
`Tablero.tsx` no setea esos atributos: el selector `.columna[data-sobre="true"]` (cerca de la
línea 15) y `.tarjeta[data-arrastrando="true"]` (cerca de la línea 60). Borrá la regla entera,
llaves incluidas, y cualquier comentario que hable de arrastrar. Verificá que no quede
ninguna otra referencia:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
grep -n "arrastr\|data-sobre\|drag" components/Tablero.module.css
```

Expected: sin resultados (exit code 1).

- [ ] **Step 3: Corregir la bajada del tablero**

El handoff cambió el texto de la bajada a "Arrastrá una tarjeta a otra columna para moverla."
Como no hay drag, en `app/(privado)/tablero/page.tsx` dejá el texto original del repo:

```tsx
        {esAdmin
          ? "Tocá un estado en la tarjeta para moverla. Al cliente le llega el aviso."
          : "Acá ves en qué anda cada pedido. El título abre el detalle."}
```

- [ ] **Step 4: Confirmar que `Tablero.tsx` y `MoverEstado.tsx` no cambiaron**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
git diff --name-only -- components/Tablero.tsx components/MoverEstado.tsx
```

Expected: sin salida. Si aparece alguno de los dos, revertilo con
`git checkout -- components/Tablero.tsx components/MoverEstado.tsx`.

- [ ] **Step 5: Verificar tipos y lint**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm typecheck && pnpm lint
```

Expected: ambos limpios. El riesgo real acá es que `page.tsx` referencie una clase de
`Panel.module.css` que no exista; eso no lo agarra `tsc`, se chequea visualmente en la Task 7.

---

### Task 3: Detalle del pedido en dos columnas

**Files:**
- Replace (editado): `app/(privado)/tablero/[id]/page.tsx`
- Replace: `app/(privado)/tablero/[id]/Detalle.module.css`

**Interfaces:**
- Consumes: `ResolverConGrok` y `Toast` con las mismas props que ya usa el repo. El handoff
  ya los incluye, no hay que cambiar nada de eso.
- Produces: la estructura `<dl className={styles.datos}><div><dt>…</dt><dd>…</dd></div></dl>`,
  de la que dependen los tests e2e (`e2e/detalle.cliente.spec.ts` busca
  `dl div` con `dt` "Última novedad").

- [ ] **Step 1: Copiar los dos archivos**

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
H=/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes
cp "$H/app/(privado)/tablero/[id]/page.tsx" "app/(privado)/tablero/[id]/page.tsx"
cp "$H/app/(privado)/tablero/[id]/Detalle.module.css" "app/(privado)/tablero/[id]/Detalle.module.css"
```

- [ ] **Step 2: Restaurar los tres comentarios que el handoff borró**

En `app/(privado)/tablero/[id]/page.tsx`:

Arriba de `if (!ticket || !puedeVerTicket(quien, ticket.cliente)) notFound();`:

```tsx
  // Mismo 404 para "no existe" y "no es tuyo": no confirmamos la existencia de
  // un pedido a quien no puede verlo.
```

Arriba de `<p className={styles.detalle}>{ticket.detalle}</p>`:

```tsx
        {/* El detalle lo escribió una persona en un textarea: los saltos de
            línea son parte de lo que quiso decir. */}
```

Adentro del `<li key={captura.id}>` de la lista de capturas, antes del `<a>`:

```tsx
                {/* ponytail: la miniatura baja la captura entera (hasta 3 MB x 3
                    por ticket, ver MAX_BYTES). Redimensionar en /adjuntos/<id>
                    cuando alguien se queje de que el detalle tarda. */}
```

- [ ] **Step 3: Verificar que la estructura `<dl>` sobrevivió**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
grep -c "<dt>" "app/(privado)/tablero/[id]/page.tsx"
```

Expected: `4` (Pantalla o URL, Reporta, Creado, Última novedad).

- [ ] **Step 4: Verificar tipos y lint**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm typecheck && pnpm lint
```

Expected: ambos limpios.

---

### Task 4: Clientes en tabla con buscador

**Files:**
- Replace: `app/(privado)/clientes/page.tsx`
- Create: `app/(privado)/clientes/ClientesTable.tsx`
- Replace: `app/(privado)/clientes/Clientes.module.css`

**Interfaces:**
- Produces: `ClientesTable` — client component (`"use client"`) que recibe la lista de
  clientes ya serializada desde el server component y filtra en memoria por nombre/email.
  La firma exacta la define el archivo del handoff; copialo tal cual y no la inventes.
- Consumes: los server actions de clientes que ya existen en el repo. No los toques.

- [ ] **Step 1: Copiar los tres archivos**

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
H=/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes
cp "$H/app/(privado)/clientes/page.tsx" "app/(privado)/clientes/page.tsx"
cp "$H/app/(privado)/clientes/ClientesTable.tsx" "app/(privado)/clientes/ClientesTable.tsx"
cp "$H/app/(privado)/clientes/Clientes.module.css" "app/(privado)/clientes/Clientes.module.css"
```

- [ ] **Step 2: Comparar los imports de server actions contra el repo**

El handoff se armó sobre una copia del repo; si algún import de action cambió de nombre,
`tsc` lo va a marcar. Revisá a mano que los `import` del tope de
`app/(privado)/clientes/page.tsx` apunten a rutas que existen:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
head -15 "app/(privado)/clientes/page.tsx"
ls "app/(privado)/clientes/"
```

Si un import no resuelve, corregí el import para que apunte al action real del repo —
**no** crees ni renombres actions.

- [ ] **Step 3: Verificar tipos y lint**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm typecheck && pnpm lint
```

Expected: ambos limpios.

---

### Task 5: Feedback (opiniones) con resumen arriba

**Files:**
- Replace: `app/(privado)/opiniones/page.tsx`
- Replace: `app/(privado)/opiniones/Opiniones.module.css`

**Interfaces:**
- Consumes: las clases de `Panel.module.css` de la Task 2 para las tarjetas de métricas.

- [ ] **Step 1: Copiar los dos archivos**

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
H=/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes
cp "$H/app/(privado)/opiniones/page.tsx" "app/(privado)/opiniones/page.tsx"
cp "$H/app/(privado)/opiniones/Opiniones.module.css" "app/(privado)/opiniones/Opiniones.module.css"
```

- [ ] **Step 2: Chequear la división por cero del promedio**

El resumen calcula puntaje promedio y recomendación promedio. Si no hay respuestas, un
promedio ingenuo da `NaN` y se renderiza como "NaN" en pantalla. Abrí
`app/(privado)/opiniones/page.tsx` y verificá que el cálculo esté guardado con el caso de
lista vacía (por ejemplo `respuestas.length > 0 ? suma / respuestas.length : 0`, o que la
sección entera se renderice sólo cuando hay respuestas). Si no lo está, agregá esa guarda.

- [ ] **Step 3: Verificar tipos y lint**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm typecheck && pnpm lint
```

Expected: ambos limpios.

---

### Task 6: Formularios agrupados — pedidos, opinar, entrar

**Files:**
- Replace: `app/(privado)/pedidos/page.tsx`
- Replace: `app/(privado)/pedidos/Pedidos.module.css`
- Replace: `app/(privado)/opinar/page.tsx`
- Replace: `app/(privado)/opinar/Opinar.module.css`
- Replace: `app/(privado)/entrar/page.tsx`
- Replace: `app/(privado)/entrar/Entrar.module.css`

**Interfaces:**
- Consumes: los server actions de pedidos, opinar y entrar tal como están hoy. Los `name` de
  cada input **no cambian** — el action los lee del `FormData`.

- [ ] **Step 1: Copiar los seis archivos**

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
H=/Users/matiasagustinmaldonado/Downloads/handoff_admin_clientes
cp "$H/app/(privado)/pedidos/page.tsx" "app/(privado)/pedidos/page.tsx"
cp "$H/app/(privado)/pedidos/Pedidos.module.css" "app/(privado)/pedidos/Pedidos.module.css"
cp "$H/app/(privado)/opinar/page.tsx" "app/(privado)/opinar/page.tsx"
cp "$H/app/(privado)/opinar/Opinar.module.css" "app/(privado)/opinar/Opinar.module.css"
cp "$H/app/(privado)/entrar/page.tsx" "app/(privado)/entrar/page.tsx"
cp "$H/app/(privado)/entrar/Entrar.module.css" "app/(privado)/entrar/Entrar.module.css"
```

- [ ] **Step 2: Verificar que ningún `name=` de input cambió**

Compará los atributos `name` de los tres formularios contra la versión anterior. Si alguno
cambió, el server action deja de recibir ese campo.

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
for f in "app/(privado)/pedidos/page.tsx" "app/(privado)/opinar/page.tsx" "app/(privado)/entrar/page.tsx"; do
  echo "== $f"
  diff <(git show HEAD:"$f" | grep -o 'name="[^"]*"' | sort -u) \
       <(grep -o 'name="[^"]*"' "$f" | sort -u)
done
```

Expected: sin diferencias en las tres. Si aparece una, ajustá el JSX nuevo para usar el
`name` viejo — el action manda, no el rediseño.

- [ ] **Step 3: Confirmar que Opinar ya no importa Pedidos.module.css**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo
grep -rn "Pedidos.module.css" "app/(privado)/opinar/"
```

Expected: sin resultados (exit code 1).

- [ ] **Step 4: Verificar tipos y lint**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm typecheck && pnpm lint
```

Expected: ambos limpios.

---

### Task 7: Verificación completa

**Files:** ninguno nuevo. Sólo se corren las suites y se arregla lo que rompa.

- [ ] **Step 1: Build de producción**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm build
```

Expected: build exitoso. El error más probable acá es un client component que usa un hook
en un archivo sin `"use client"`, o un server component importando algo de cliente.

- [ ] **Step 2: Tests unitarios**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm test
```

Expected: todos pasan. No debería haber cambios acá — no se tocó ninguna lib.

- [ ] **Step 3: Tests e2e**

Run:

```bash
cd /Users/matiasagustinmaldonado/Coding/molpo && pnpm test:e2e
```

Expected: los 3 specs de `e2e/` pasan. Los selectores en riesgo son
`page.locator("dl div", …)` del detalle (cubierto en la Task 3) y
`tarjeta.getByRole("combobox", { name: 'Mover #<id>' })` del tablero (intacto porque no
tocamos `Tablero.tsx` ni `MoverEstado.tsx`). Si algún spec falla por un cambio de layout,
**arreglá el markup para que el selector siga valiendo**, no relajes el test.

- [ ] **Step 4: Reporte final**

Escribí en `.context/implement-notes.md` un resumen de: archivos cambiados, resultado de
typecheck / lint / build / test / test:e2e, y cualquier decisión que hayas tomado
(imports corregidos, guardas agregadas, selectores que hubo que preservar).

---

## Self-Review

**Cobertura del spec:** los 21 archivos del handoff que van al repo están asignados a una
tarea. Los dos excluidos (`components/Tablero.tsx`, `components/MoverEstado.tsx`) están
excluidos a propósito y dicho explícitamente en Global Constraints y en la Task 2.

**Placeholders:** ninguno. Cada paso tiene el comando exacto o el bloque de código exacto.

**Consistencia de tipos:** `Tablero` mantiene la firma `{ columnas: ColumnaData[]; esAdmin: boolean }`
y el `page.tsx` del handoff la respeta. `MoverEstado` queda sin la prop `formRef`, que sólo
usaba la versión con drag.
