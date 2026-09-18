import { test, expect } from "@playwright/test";
import { tickets } from "./tickets.ts";
import { TITULOS } from "./sembrar.ts";

test.describe("tickets espejo de KOMUK Hub, como admin", () => {
  test("el título y detalle del Hub se muestran como texto, no como HTML", async ({ page }) => {
    await page.goto(`/tablero/${tickets.komuk}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITULOS.komuk);
    await expect(page.getByText('<script>window.__xss=1</script>')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    await expect(page.locator("h1 img, h1 b")).toHaveCount(0);
  });

  test("badge KOMUK Hub con link y estado de origen", async ({ page }) => {
    await page.goto(`/tablero/${tickets.komuk}/`);
    await expect(page.getByRole("link", { name: "KOMUK Hub" })).toHaveAttribute("href", "https://hub.example/r/e2e-1");
    await expect(page.getByText("in_progress")).toBeVisible();
  });

  test("el tablero muestra el botón Sincronizar ahora al admin", async ({ page }) => {
    await page.goto("/tablero/");
    await expect(page.getByRole("button", { name: "Sincronizar ahora" })).toBeVisible();
  });
});
