import { test, expect } from "@playwright/test";
import { tickets } from "./tickets.ts";
import { CLIENTE, EMAIL_CLIENTE, TITULOS, altaTicket } from "./sembrar.ts";

/** Sólo para leer: los tests que escriben se siembran su propio ticket. */
const compartido = tickets;

test.describe("detalle del pedido, como admin", () => {
  test("ve el pedido de cualquier cliente, con su nombre", async ({ page }) => {
    await page.goto(`/tablero/${compartido.ajeno}/`);

    await expect(page.getByRole("heading", { level: 1, name: TITULOS.ajeno })).toBeVisible();
    await expect(page.getByText("Otra SRL")).toBeVisible();
  });

  test("ve el formulario de gestión con el estado actual", async ({ page }) => {
    await page.goto(`/tablero/${compartido.completo}/`);

    await expect(page.getByText("Respuesta para el cliente")).toBeVisible();
    await expect(page.locator("select[name=estado]")).toHaveValue("abierto");
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Lo estamos mirando.");
    await expect(page.getByRole("button", { name: "Guardar y avisar" })).toBeVisible();
  });

  test("guardar sólo una respuesta la persiste sin tocar el estado", async ({ page }) => {
    const id = await altaTicket({ titulo: "Contestar sin mover" });
    await page.goto(`/tablero/${id}/`);

    await page.locator("textarea[name=respuesta]").fill("Lo miro esta semana.");
    await page.getByRole("button", { name: "Guardar y avisar" }).click();
    // La acción siempre vuelve al tablero.
    await expect(page).toHaveURL(/\/tablero\/?$/);

    await page.goto(`/tablero/${id}/`);
    await expect(page.getByRole("heading", { name: "Respuesta" })).toBeVisible();
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Lo miro esta semana.");
    await expect(page.locator("select[name=estado]")).toHaveValue("abierto");
  });

  test("cambiar el estado desde el detalle conserva la respuesta escrita", async ({ page }) => {
    const id = await altaTicket({ titulo: "Mover con respuesta", respuesta: "Ya lo vimos." });
    await page.goto(`/tablero/${id}/`);

    await page.locator("select[name=estado]").selectOption("en_curso");
    await page.getByRole("button", { name: "Guardar y avisar" }).click();
    await expect(page).toHaveURL(/\/tablero\/?$/);

    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("select[name=estado]")).toHaveValue("en_curso");
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Ya lo vimos.");
  });

  test("mover la tarjeta desde el tablero no borra la respuesta", async ({ page }) => {
    // El select de la tarjeta no manda el campo `respuesta`: si alguna vez lo
    // mandara vacío, este pedido perdería lo que el admin ya había escrito.
    const titulo = "Mover desde la tarjeta";
    const id = await altaTicket({ titulo, respuesta: "Escrita desde el detalle." });
    await page.goto("/tablero/");

    const tarjeta = page.locator("li", { has: page.getByRole("link", { name: titulo }) }).first();
    await tarjeta.locator("select[name=estado]").selectOption("resuelto");
    await tarjeta.getByRole("button", { name: "Mover" }).click();
    await expect(page).toHaveURL(/\/tablero\/?$/);
    // Esperar a que la tarjeta aparezca en su columna nueva: sin esto, el
    // `goto` de abajo compite con el redirect de la acción y sale ERR_ABORTED.
    await expect(
      page.getByRole("region", { name: "Resuelto" }).getByRole("link", { name: titulo }),
    ).toBeVisible();

    await page.goto(`/tablero/${id}/`);
    await expect(page.locator("select[name=estado]")).toHaveValue("resuelto");
    await expect(page.locator("textarea[name=respuesta]")).toHaveValue("Escrita desde el detalle.");
  });

  test("no pisa una respuesta que cambió en otra pestaña", async ({ page, context }) => {
    // Dos pestañas sobre el mismo pedido: la segunda guarda, la primera no
    // tiene que borrar eso con lo que tenía en pantalla desde antes.
    const id = await altaTicket({ titulo: "Dos pestañas" });

    const vieja = page;
    await vieja.goto(`/tablero/${id}/`);

    const nueva = await context.newPage();
    await nueva.goto(`/tablero/${id}/`);
    await nueva.locator("textarea[name=respuesta]").fill("La escribió la otra pestaña.");
    await nueva.getByRole("button", { name: "Guardar y avisar" }).click();
    await expect(nueva).toHaveURL(/\/tablero\/?$/);
    await nueva.close();

    // La vieja se pintó con la respuesta vacía y ahora intenta mover el estado.
    await vieja.locator("select[name=estado]").selectOption("en_curso");
    await vieja.getByRole("button", { name: "Guardar y avisar" }).click();

    await expect(vieja).toHaveURL(new RegExp(`/tablero/${id}/\\?conflicto=1$`));
    await expect(vieja.getByText(/Alguien más cambió la respuesta/)).toBeVisible();
    // Y sobre todo: lo escrito sigue ahí.
    await expect(vieja.locator("textarea[name=respuesta]")).toHaveValue(
      "La escribió la otra pestaña.",
    );
  });

  test("guardar sin cambiar nada no toca la última novedad ni avisa al cliente", async ({ page }) => {
    // Es lo único que evita que cada click en Guardar mande un mail al cliente
    // diciendo que hay algo nuevo cuando no hay nada nuevo.
    const id = await altaTicket({
      titulo: "Guardar sin cambios",
      respuesta: "Sin novedad.",
      email: EMAIL_CLIENTE,
      cliente: CLIENTE,
    });
    await page.goto(`/tablero/${id}/`);

    const ultimaNovedad = page
      .locator("dl div", { has: page.locator("dt", { hasText: "Última novedad" }) })
      .locator("dd");
    const antes = await ultimaNovedad.innerText();

    await page.getByRole("button", { name: "Guardar y avisar" }).click();
    await expect(page).toHaveURL(/\/tablero\/?$/);

    await page.goto(`/tablero/${id}/`);
    await expect(ultimaNovedad).toHaveText(antes);
  });
});
