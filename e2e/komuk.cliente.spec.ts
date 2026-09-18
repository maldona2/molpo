import { test, expect } from "@playwright/test";
import { tickets } from "./tickets.ts";

test.describe("tickets espejo de KOMUK Hub, como cliente", () => {
  test("un cliente no ve tickets de KOMUK ni el botón de sync", async ({ page }) => {
    await page.goto("/tablero/");
    await expect(page.getByText("peligroso")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sincronizar ahora" })).toHaveCount(0);
    const res = await page.goto(`/tablero/${tickets.komuk}/`);
    expect(res?.status()).toBe(404);
  });
});
