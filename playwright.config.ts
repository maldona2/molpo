import { defineConfig, devices } from "@playwright/test";

// Next lee .env.local solo; playwright no, y la siembra necesita DATABASE_URL.
// `loadEnvFile` no pisa lo que ya esté en el entorno, así que CI puede mandar
// la suya por variable sin tocar esto.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local la siembra falla con un mensaje mucho más claro que este.
}

/**
 * El área privada sólo se sirve en app.molpo.ar, y en local `app.localhost` hace
 * de ese host sin tocar /etc/hosts (ver middleware.ts). El navegador resuelve
 * cualquier *.localhost al loopback; node no, así que el chequeo de arranque del
 * servidor apunta a 127.0.0.1 y los tests navegan al host de verdad.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: "http://app.localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "cliente",
      testMatch: /.*\.cliente\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.estado/cliente.json" },
    },
    {
      name: "admin",
      testMatch: /.*\.admin\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.estado/admin.json" },
    },
    {
      name: "anonimo",
      testMatch: /.*\.anonimo\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000/",
    // Sin clave, sendMail corta antes de tocar la red. Los tickets sembrados
    // tienen email, y "Guardar y avisar" manda de verdad: una corrida no puede
    // depender de que quien la ejecuta no tenga la clave de producción exportada.
    env: { RESEND_API_KEY: "" },
    // Por lo mismo no se reusa un `pnpm dev` de al lado: ese ya arrancó con el
    // entorno de desarrollo, clave y base de desarrollo incluidas.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
