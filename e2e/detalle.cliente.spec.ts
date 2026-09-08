import { test, expect } from "@playwright/test";
import { tickets } from "./tickets.ts";
import { TITULOS } from "./sembrar.ts";

test.describe("detalle del pedido, como cliente", () => {
  test("muestra todo lo que el cliente escribió al reportar", async ({ page }) => {
    await page.goto(`/tablero/${tickets.completo}/`);

    await expect(page.getByRole("heading", { level: 1, name: TITULOS.completo })).toBeVisible();
    // El detalle largo es el punto de la pantalla: la tarjeta sólo tenía el título.
    await expect(page.getByText("Cargo el descuento y al guardar salta un error.")).toBeVisible();
    await expect(page.getByText("Segunda línea del detalle.")).toBeVisible();
    // Por dt/dd y no por texto suelto: "Ana" también matchea "Panadería Sol"
    // de la barra de sesión, y ese falso positivo no prueba nada.
    const dato = (etiqueta: string) =>
      page.locator("dl div", { has: page.locator("dt", { hasText: etiqueta }) }).locator("dd");
    await expect(dato("Pantalla o URL")).toHaveText("Facturación → Nueva");
    await expect(dato("Reporta")).toHaveText("Ana");
    await expect(dato("Creado")).not.toBeEmpty();
    await expect(dato("Última novedad")).not.toBeEmpty();

    await expect(page.getByText("Alta", { exact: true })).toBeVisible();
    await expect(page.getByText("Lo estamos mirando.")).toBeVisible();
  });

  test("los saltos de línea del detalle se respetan", async ({ page }) => {
    await page.goto(`/tablero/${tickets.completo}/`);
    const detalle = page.locator("p", { hasText: "Cargo el descuento" }).first();
    await expect(detalle).toHaveCSS("white-space", "pre-wrap");
  });

  test("la captura se muestra y se puede abrir", async ({ page }) => {
    await page.goto(`/tablero/${tickets.completo}/`);

    await expect(page.getByRole("heading", { name: "Capturas (1)" })).toBeVisible();
    const miniatura = page.getByRole("img", { name: "pantalla.png" });
    await expect(miniatura).toBeVisible();
    // La miniatura carga de verdad: si /adjuntos/<id> devolviera 404 sería 0.
    await expect
      .poll(() => miniatura.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("un pedido sin extras no dibuja secciones vacías", async ({ page }) => {
    await page.goto(`/tablero/${tickets.pelado}/`);

    await expect(page.getByRole("heading", { level: 1, name: TITULOS.pelado })).toBeVisible();
    await expect(page.getByText("Pantalla o URL")).toHaveCount(0);
    await expect(page.getByText("Reporta")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Capturas/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Respuesta" })).toHaveCount(0);
  });

  test("el pedido de otro cliente da 404, no 403", async ({ page }) => {
    const respuesta = await page.goto(`/tablero/${tickets.ajeno}/`);
    expect(respuesta?.status()).toBe(404);
    // Ni siquiera se filtra el título por el que se preguntó.
    await expect(page.getByText(TITULOS.ajeno)).toHaveCount(0);
  });

  test("un id que no es número da 404", async ({ page }) => {
    const respuesta = await page.goto("/tablero/abc/");
    expect(respuesta?.status()).toBe(404);
  });

  test("un pedido inexistente da 404", async ({ page }) => {
    const respuesta = await page.goto("/tablero/999999/");
    expect(respuesta?.status()).toBe(404);
  });

  test("un id fuera del rango de un serial da 404, no un error de postgres", async ({ page }) => {
    const respuesta = await page.goto("/tablero/2147483648/");
    expect(respuesta?.status()).toBe(404);
  });

  test("el cliente no ve el formulario de gestión", async ({ page }) => {
    await page.goto(`/tablero/${tickets.completo}/`);

    await expect(page.getByRole("button", { name: "Guardar y avisar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resolver con Grok" })).toHaveCount(0);
    await expect(page.getByText("Respuesta para el cliente")).toHaveCount(0);
  });

  test("desde el tablero, un click en el título abre el detalle", async ({ page }) => {
    await page.goto("/tablero/");

    const titulo = page.getByRole("link", { name: TITULOS.completo });
    await expect(titulo).toBeVisible();
    await titulo.click();

    await expect(page).toHaveURL(new RegExp(`/tablero/${tickets.completo}/?$`));
    await expect(page.getByText("Cargo el descuento y al guardar salta un error.")).toBeVisible();
  });

  test("con el teclado, Enter sobre el título también abre el detalle", async ({ page }) => {
    // dnd-kit escucha Enter para arrancar un drag de teclado. Si el listener
    // del KeyboardSensor está en la tarjeta entera, se come el Enter del link y
    // el detalle queda inalcanzable sin mouse.
    await page.goto("/tablero/");

    const titulo = page.getByRole("link", { name: TITULOS.completo });
    await titulo.focus();
    await expect(titulo).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(new RegExp(`/tablero/${tickets.completo}/?$`));
  });

  test("arrastrar la tarjeta reordena, se guarda y no navega al detalle", async ({ page }) => {
    await page.goto("/tablero/");

    const abiertos = page.getByRole("region", { name: "Abierto" });
    const titulos = () => abiertos.getByRole("link").allInnerTexts();

    const primera = abiertos.getByRole("link", { name: TITULOS.completo });
    const segunda = abiertos.getByRole("link", { name: TITULOS.pelado });
    await expect(primera).toBeVisible();
    await expect(segunda).toBeVisible();
    const antes = await titulos();

    const origen = await primera.boundingBox();
    const destino = await segunda.boundingBox();
    if (!origen || !destino) throw new Error("No se pudieron ubicar las tarjetas");

    // Más de los 6px del PointerSensor: esto tiene que ser drag, no click.
    await page.mouse.move(origen.x + origen.width / 2, origen.y + origen.height / 2);
    await page.mouse.down();
    await page.mouse.move(destino.x + destino.width / 2, destino.y + destino.height / 2, { steps: 12 });
    await page.mouse.up();

    // Que no navegue no alcanza: si el drag no arrancó, esto pasaría igual.
    await expect(page).toHaveURL(/\/tablero\/?(\?.*)?$/);
    await expect.poll(titulos).not.toEqual(antes);

    // El cliente ordenando su columna de abiertos es justo lo que se persiste.
    await page.reload();
    await expect.poll(titulos).not.toEqual(antes);
  });
});
