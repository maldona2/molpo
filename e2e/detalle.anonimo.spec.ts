import { test, expect } from "@playwright/test";
import { tickets } from "./tickets.ts";
import { TITULOS } from "./sembrar.ts";

test("sin sesión, el detalle manda a pedir el link de acceso", async ({ page }) => {
  await page.goto(`/tablero/${tickets.completo}/`);

  await expect(page).toHaveURL(/\/entrar\/?$/);
  await expect(page.getByText(TITULOS.completo)).toHaveCount(0);
});
