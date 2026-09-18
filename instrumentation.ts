// Tareas de fondo del server. Next llama a register() una vez por proceso.
// ponytail: setInterval en el proceso web. Alcanza con un servicio en Railway;
// el advisory lock evita dos syncs a la vez si hay réplicas. Si un día hace
// falta scheduling fuera del proceso, pasar a un Railway Cron que llame a una ruta.
const TICK_MS = 15 * 60 * 1000; // miramos el reloj; el sync es 1×/día
const HORA_SYNC_ART = 7; // 07:00 America/Argentina/Tucuman
const TZ_ART = "America/Argentina/Tucuman";

function diaYHoraArt(ahora = new Date()): { dia: string; hora: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_ART,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hour12: false,
  }).formatToParts(ahora);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const raw = get("hour");
  const hora = Number(raw === "24" ? "0" : raw);
  return { dia: `${get("year")}-${get("month")}-${get("day")}`, hora };
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Sin configuración el sync no arranca solo (dev, e2e, previews).
  if (!process.env.KOMUK_HUB_BASE_URL || !process.env.KOMUK_HUB_TOKEN || !process.env.DATABASE_URL) return;
  const g = globalThis as unknown as { komukTimer?: NodeJS.Timeout; komukUltimoDia?: string };
  if (g.komukTimer) return; // hot reload
  try {
    const { correrSyncKomuk } = await import("./lib/komuk-hub-db");
    const correrSiToca = () => {
      const { dia, hora } = diaYHoraArt();
      if (hora !== HORA_SYNC_ART || g.komukUltimoDia === dia) return;
      g.komukUltimoDia = dia;
      correrSyncKomuk().catch((e) =>
        console.error("[komuk-hub] sync programado falló:", (e as Error).message),
      );
    };
    g.komukTimer = setInterval(correrSiToca, TICK_MS);
    g.komukTimer.unref?.();
    // Sin sync al boot: 1×/día a las 07:00 ART + botón admin "Sincronizar ahora".
  } catch (e) {
    console.error("[komuk-hub] no se pudo programar el sync:", (e as Error).message);
  }
}
