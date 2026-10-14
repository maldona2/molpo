import { test, expect } from "@playwright/test";
import { OTRO_CLIENTE, TITULOS } from "./sembrar.ts";

test.describe("tablero, como cliente", () => {
  test("ve sus pedidos con un buscador acotado y sin herramientas de admin", async ({ page }) => {
    await page.goto("/tablero/");
    await expect(page.getByRole("heading", { level: 1, name: "Tus pedidos" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar pedidos" })).toHaveAttribute(
      "placeholder",
      "Buscar por título o #id",
    );
    await expect(page.getByRole("button", { name: /^Cliente/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Sin respuesta/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^KOMUK Hub/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sincronizar" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: TITULOS.completo })).toBeVisible();
    await expect(page.getByText(TITULOS.ajeno)).toHaveCount(0);
  });

  test("un ?cliente= ajeno en la URL no le muestra nada de otro", async ({ page }) => {
    await page.goto(`/tablero/?cliente=${encodeURIComponent(OTRO_CLIENTE)}`);
    await expect(page.getByText(TITULOS.ajeno)).toHaveCount(0);
    await expect(page.getByRole("link", { name: TITULOS.completo })).toBeVisible();
  });
});
