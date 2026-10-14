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
});
