import { test, expect, type Page } from "@playwright/test";
import { OTRO_CLIENTE, TITULOS, altaTicket } from "./sembrar.ts";

const buscador = (page: Page) => page.getByRole("searchbox", { name: "Buscar pedidos" });
const tarjeta = (page: Page, titulo: string) => page.getByRole("link", { name: titulo, exact: true });

test.describe("tablero, como admin", () => {
  test("buscar por título deja sólo lo que coincide y sobrevive a recargar", async ({ page }) => {
    await altaTicket({ titulo: "Búsqueda uno: impresora" });
    await altaTicket({ titulo: "Búsqueda dos: escáner" });
    await page.goto("/tablero/");

    await buscador(page).fill("impresora");
    await expect(tarjeta(page, "Búsqueda uno: impresora")).toBeVisible();
    await expect(tarjeta(page, "Búsqueda dos: escáner")).toHaveCount(0);
    await expect(page).toHaveURL(/\?q=impresora$/);

    await page.reload();
    await expect(buscador(page)).toHaveValue("impresora");
    await expect(tarjeta(page, "Búsqueda dos: escáner")).toHaveCount(0);
  });

  test("buscar ignora tildes", async ({ page }) => {
    await altaTicket({ titulo: "Se rompió la cañería" });
    await page.goto("/tablero/");
    await buscador(page).fill("caneria");
    await expect(tarjeta(page, "Se rompió la cañería")).toBeVisible();
  });

  test("buscar por #id", async ({ page }) => {
    const id = await altaTicket({ titulo: "Buscable por número" });
    await page.goto("/tablero/");
    await buscador(page).fill(`#${id}`);
    await expect(tarjeta(page, "Buscable por número")).toBeVisible();
  });

  test("la tecla / enfoca el buscador", async ({ page }) => {
    await page.goto("/tablero/");
    await page.keyboard.press("/");
    await expect(buscador(page)).toBeFocused();
  });

  test("filtrar por tipo, cerrar el menú con click afuera y limpiar", async ({ page }) => {
    await altaTicket({ titulo: "Tipo filtro bug", tipo: "bug" });
    await altaTicket({ titulo: "Tipo filtro mejora", tipo: "mejora" });
    await page.goto("/tablero/?q=Tipo%20filtro");

    await page.getByRole("button", { name: /^Tipo/ }).click();
    await page.getByRole("checkbox", { name: /^Bug/ }).check();
    await expect(tarjeta(page, "Tipo filtro bug")).toBeVisible();
    await expect(tarjeta(page, "Tipo filtro mejora")).toHaveCount(0);
    await expect(page).toHaveURL(/tipo=bug/);
    await expect(page.getByRole("button", { name: /^Tipo/ })).toHaveAttribute("data-activo", "true");

    await page.getByRole("heading", { level: 1 }).click();
    await expect(page.getByRole("checkbox", { name: /^Bug/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(tarjeta(page, "Tipo filtro mejora")).toBeVisible();
  });

  test("el atajo Sin movimiento muestra los estancados con su aviso", async ({ page }) => {
    const viejo = new Date(Date.now() - 10 * 86_400_000);
    await altaTicket({ titulo: "Estancado hace diez", creado: viejo, actualizado: viejo });
    await altaTicket({ titulo: "Fresco de hoy" });
    await page.goto("/tablero/");

    await page.getByRole("button", { name: /^Sin movimiento \+7 d/ }).click();
    await expect(tarjeta(page, "Estancado hace diez")).toBeVisible();
    await expect(tarjeta(page, "Fresco de hoy")).toHaveCount(0);
    await expect(page.locator("li", { has: tarjeta(page, "Estancado hace diez") })).toContainText(
      "Sin movimiento hace 10 d",
    );
  });

  test("la alerta de prioridad alta filtra por alta", async ({ page }) => {
    await altaTicket({ titulo: "Alerta alta viva", prioridad: "alta" });
    await page.goto("/tablero/");
    await page.getByRole("button", { name: /de prioridad alta$/ }).click();
    await expect(page).toHaveURL(/prio=alta/);
    await expect(page.getByRole("button", { name: /^Prioridad/ })).toHaveAttribute("data-activo", "true");
  });

  test("filtros inválidos en la URL no rompen y el ?cliente= viejo sigue filtrando", async ({ page }) => {
    await page.goto(`/tablero/?tipo=nada&orden=x&vista=y&cliente=${encodeURIComponent(OTRO_CLIENTE)}`);
    await expect(tarjeta(page, TITULOS.ajeno)).toBeVisible();
    await expect(tarjeta(page, TITULOS.completo)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Cliente/ })).toHaveAttribute("data-activo", "true");
  });

  test("vista lista ordenada por más viejos", async ({ page }) => {
    await altaTicket({ titulo: "Orden lista nuevo", creado: new Date() });
    await altaTicket({ titulo: "Orden lista viejo", creado: new Date(Date.now() - 5 * 86_400_000) });
    await page.goto("/tablero/?q=Orden%20lista");

    await page.getByRole("button", { name: "Lista", exact: true }).click();
    await page.getByRole("combobox", { name: "Orden" }).selectOption("viejos");
    const filas = page.getByRole("row");
    await expect(filas.nth(1)).toContainText("Orden lista viejo");
    await expect(filas.nth(2)).toContainText("Orden lista nuevo");
    await expect(page).toHaveURL(/orden=viejos/);
    await expect(page).toHaveURL(/vista=lista/);
  });

  test("Cerrado arranca colapsada y lo que elijo queda para la próxima", async ({ page }) => {
    await page.goto("/tablero/");
    await expect(page.getByRole("button", { name: "Expandir Cerrado" })).toBeVisible();
    await page.getByRole("button", { name: "Colapsar Resuelto" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expandir Resuelto" })).toBeVisible();
  });

  test("click en la tarjeta abre el panel sin salir del tablero", async ({ page }) => {
    const titulo = "Panel sin salir";
    const id = await altaTicket({ titulo, detalle: "Detalle visible en el panel." });
    await page.goto("/tablero/");

    await tarjeta(page, titulo).click();
    const panel = page.getByRole("dialog", { name: titulo });
    await expect(panel.getByText("Detalle visible en el panel.")).toBeVisible();
    await expect(page).toHaveURL(/\/tablero\/?$/);
    await expect(panel.getByRole("link", { name: "Abrir página completa" })).toHaveAttribute(
      "href",
      `/tablero/${id}/`,
    );

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });

  test("cambiar el estado desde el panel mueve la tarjeta, avisa y persiste", async ({ page }) => {
    const titulo = "Mover desde el panel";
    const id = await altaTicket({ titulo, respuesta: "Escrita antes." });
    await page.goto("/tablero/");

    await tarjeta(page, titulo).click();
    const panel = page.getByRole("dialog", { name: titulo });
    await panel.getByRole("button", { name: "En curso", exact: true }).click();

    await expect(page.getByRole("status")).toContainText(`#${id} pasó a En curso.`);
    await expect(page.getByRole("region", { name: "En curso" }).getByRole("link", { name: titulo })).toBeVisible();
    await expect(panel.getByRole("button", { name: "En curso", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Mover no toca la respuesta: el panel no manda el campo.
    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("select[name=estado]")).toHaveValue("en_curso");
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Escrita antes.");
  });

  test("guardar la respuesta desde el panel", async ({ page }) => {
    const titulo = "Responder desde el panel";
    const id = await altaTicket({ titulo });
    await page.goto("/tablero/");

    await tarjeta(page, titulo).click();
    const panel = page.getByRole("dialog", { name: titulo });
    await expect(panel.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await panel.getByRole("textbox", { name: "Respuesta para el cliente" }).fill("Lo vemos mañana.");
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Respuesta guardada.");

    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Lo vemos mañana.");
  });

  test("el panel no pisa una respuesta que cambió en otra pestaña", async ({ page, context }) => {
    const titulo = "Conflicto en el panel";
    const id = await altaTicket({ titulo });
    await page.goto("/tablero/");
    await tarjeta(page, titulo).click();

    const otra = await context.newPage();
    await otra.goto(`/tablero/${id}/`);
    await otra.locator("textarea[name=respuesta]").fill("La escribió la otra pestaña.");
    await otra.getByRole("button", { name: "Guardar y avisar" }).click();
    await expect(otra.getByRole("status")).toHaveText("Cambios guardados.");
    await otra.close();

    const panel = page.getByRole("dialog", { name: titulo });
    await panel.getByRole("textbox", { name: "Respuesta para el cliente" }).fill("La mía.");
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Alguien más cambió la respuesta");

    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("La escribió la otra pestaña.");
  });

  test("con el panel abierto, j y k recorren los pedidos visibles", async ({ page }) => {
    await altaTicket({ titulo: "Recorrer uno", prioridad: "alta" });
    await altaTicket({ titulo: "Recorrer dos", prioridad: "baja" });
    await page.goto("/tablero/?q=Recorrer");

    await tarjeta(page, "Recorrer uno").click();
    await expect(page.getByRole("dialog", { name: "Recorrer uno" })).toContainText("1 de 2");
    await page.keyboard.press("j");
    await expect(page.getByRole("dialog", { name: "Recorrer dos" })).toContainText("2 de 2");
    await page.keyboard.press("k");
    await expect(page.getByRole("dialog", { name: "Recorrer uno" })).toBeVisible();
  });

  test("arrastrar una tarjeta la mueve, y Deshacer la devuelve de verdad", async ({ page }) => {
    const titulo = "Arrastrar y deshacer";
    const id = await altaTicket({ titulo });
    await page.goto(`/tablero/?q=${encodeURIComponent(titulo)}`);

    const resuelto = page.getByRole("region", { name: "Resuelto" });
    await page.locator("li", { has: tarjeta(page, titulo) }).dragTo(resuelto);
    await expect(resuelto.getByRole("link", { name: titulo })).toBeVisible();
    await expect(page.getByRole("status")).toContainText(`#${id} pasó a Resuelto.`);

    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByRole("status")).toContainText(`#${id} volvió a Abierto.`);
    await expect(page.getByRole("region", { name: "Abierto" }).getByRole("link", { name: titulo })).toBeVisible();

    // Persistido, no sólo en pantalla.
    await page.reload();
    await expect(page.getByRole("region", { name: "Abierto" }).getByRole("link", { name: titulo })).toBeVisible();
  });

  test("soltar en la misma columna no hace nada", async ({ page }) => {
    const titulo = "Soltar en el lugar";
    await altaTicket({ titulo });
    await page.goto(`/tablero/?q=${encodeURIComponent(titulo)}`);

    await page.locator("li", { has: tarjeta(page, titulo) }).dragTo(page.getByRole("region", { name: "Abierto" }));
    // mover() sale antes de llamar al server: si hubiera toast, aparecería enseguida.
    await page.waitForTimeout(500);
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("si el server falla al mover, avisa y la tarjeta vuelve a su columna", async ({ page }) => {
    const titulo = "Mover con falla";
    const id = await altaTicket({ titulo });
    await page.goto("/tablero/");
    await tarjeta(page, titulo).click();
    const panel = page.getByRole("dialog", { name: titulo });

    await page.route("**/tablero/**", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
    await panel.getByRole("button", { name: "En curso", exact: true }).click();

    await expect(page.getByRole("status")).toContainText(`No pudimos mover #${id}. Probá de nuevo.`);
    await expect(page.getByRole("region", { name: "En curso" }).getByRole("link", { name: titulo })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "En curso", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await page.unroute("**/tablero/**");
    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("select[name=estado]")).not.toHaveValue("en_curso");
  });
});
