// Cliente HTTP del Hub de KOMUK. Sólo lectura: el único verbo es GET.
// Sin acceso a base: lo testeable vive acá. El token nunca va a un mensaje de
// error ni a un log: los mensajes se arman con status y ruta, jamás con lo que
// devolvió el servidor ni con el error original de fetch (puede traer headers).

export type Requerimiento = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  url: string;
};

export type Pagina = { data: Requerimiento[]; next_cursor: string | null };
export type HubConfig = { baseUrl: string; token: string };

export class HubError extends Error {
  status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "HubError";
    this.status = status;
  }
}

const RUTA = "/api/external/v1/requerimientos";

export function configDesdeEnv(env: Record<string, string | undefined> = process.env): HubConfig {
  const baseUrl = env.KOMUK_HUB_BASE_URL?.trim();
  const token = env.KOMUK_HUB_TOKEN?.trim();
  if (!baseUrl) throw new Error("Falta KOMUK_HUB_BASE_URL");
  if (!token) throw new Error("Falta KOMUK_HUB_TOKEN");
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

function esTexto(v: unknown): v is string {
  return typeof v === "string";
}

function validarPagina(body: unknown): Pagina {
  const b = body as { data?: unknown; next_cursor?: unknown } | null;
  if (!b || !Array.isArray(b.data) || !(b.next_cursor === null || esTexto(b.next_cursor))) {
    throw new HubError("El Hub devolvió una respuesta con forma inesperada", null);
  }
  const campos = ["id", "title", "status", "priority", "updated_at", "url"] as const;
  for (const item of b.data) {
    const r = item as Record<string, unknown>;
    if (!r || campos.some((c) => !esTexto(r[c])) || Number.isNaN(Date.parse(r.updated_at as string))) {
      throw new HubError("El Hub devolvió un requerimiento con forma inesperada", null);
    }
  }
  return {
    data: b.data.map((item) => {
      const r = item as Record<string, unknown>;
      return {
        id: r.id as string,
        title: r.title as string,
        description: esTexto(r.description) ? r.description : "",
        status: r.status as string,
        priority: r.priority as string,
        created_at: esTexto(r.created_at) ? r.created_at : (r.updated_at as string),
        updated_at: r.updated_at as string,
        url: r.url as string,
      };
    }),
    next_cursor: b.next_cursor as string | null,
  };
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchPagina(
  cfg: HubConfig,
  params: { updatedSince: string; cursor?: string | null; limit?: number },
  opts: { fetch?: typeof fetch; esperar?: (ms: number) => Promise<void>; timeoutMs?: number; reintentos?: number } = {},
): Promise<Pagina> {
  const f = opts.fetch ?? fetch;
  const esperar = opts.esperar ?? dormir;
  const reintentos = opts.reintentos ?? 3;
  const url = new URL(cfg.baseUrl.replace(/\/+$/, "") + RUTA);
  url.searchParams.set("updated_since", params.updatedSince);
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  url.searchParams.set("limit", String(params.limit ?? 50));

  for (let intento = 0; ; intento++) {
    let res: Response;
    try {
      res = await f(url, {
        method: "GET",
        headers: { authorization: `Bearer ${cfg.token}`, accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
        cache: "no-store",
      });
    } catch {
      if (intento < reintentos) { await esperar(500 * 2 ** intento); continue; }
      throw new HubError("No se pudo conectar con el Hub (red o timeout)", null);
    }
    if (res.ok) {
      let body: unknown;
      try { body = await res.json(); } catch { throw new HubError("El Hub devolvió JSON inválido", res.status); }
      return validarPagina(body);
    }
    const reintentable = res.status === 429 || res.status >= 500;
    if (reintentable && intento < reintentos) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const ms = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 500 * 2 ** intento;
      await esperar(ms);
      continue;
    }
    throw new HubError(`El Hub respondió ${res.status} en ${RUTA}`, res.status);
  }
}
