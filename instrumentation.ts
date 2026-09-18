// Tareas de fondo del server. Next llama a register() una vez por proceso.
// ponytail: setInterval en el proceso web. Alcanza con un servicio en Railway;
// el advisory lock evita dos syncs a la vez si hay réplicas. Si un día hace
// falta scheduling fuera del proceso, pasar a un Railway Cron que llame a una ruta.
const QUINCE_MIN = 15 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Sin configuración el sync no arranca solo (dev, e2e, previews).
  if (!process.env.KOMUK_HUB_BASE_URL || !process.env.KOMUK_HUB_TOKEN || !process.env.DATABASE_URL) return;
  const g = globalThis as unknown as { komukTimer?: NodeJS.Timeout };
  if (g.komukTimer) return; // hot reload
  try {
    const { correrSyncKomuk } = await import("./lib/komuk-hub-db");
    const correr = () => correrSyncKomuk().catch((e) => console.error("[komuk-hub] sync programado falló:", (e as Error).message));
    g.komukTimer = setInterval(correr, QUINCE_MIN);
    g.komukTimer.unref?.();
    setTimeout(correr, 30_000).unref?.();
  } catch (e) {
    console.error("[komuk-hub] no se pudo programar el sync:", (e as Error).message);
  }
}
