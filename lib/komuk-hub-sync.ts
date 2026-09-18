import { fetchPagina as fetchPaginaReal, HubError, type HubConfig, type Requerimiento } from "./komuk-hub.ts";
import type { Estado, Prioridad } from "./tickets.ts";

export const FUENTE = "komuk_hub";
export const CLIENTE_KOMUK = "KOMUK";
export const SOLAPAMIENTO_MS = 5 * 60 * 1000;

// Acá se ajusta el mapeo de status/priority del Hub a los valores de molpo.
export const MAPEO: {
  estado: Record<string, Estado>;
  prioridad: Record<string, Prioridad>;
  estadoPorDefecto: Estado;
  prioridadPorDefecto: Prioridad;
} = {
  estado: {
    open: "abierto",
    new: "abierto",
    pending: "abierto",
    in_progress: "en_curso",
    review: "en_curso",
    blocked: "en_curso",
    accepted: "en_curso",
    done: "resuelto",
    resolved: "resuelto",
    shipped: "resuelto",
    closed: "cerrado",
    cancelled: "cerrado",
    canceled: "cerrado",
  },
  prioridad: {
    low: "baja",
    medium: "media",
    normal: "media",
    high: "alta",
    urgent: "alta",
    critical: "alta",
    blocking: "alta",
  },
  estadoPorDefecto: "abierto",
  prioridadPorDefecto: "media",
};

export function mapear(
  req: Requerimiento,
  avisar: (msg: string) => void,
  mapeo: typeof MAPEO = MAPEO,
): { estado: Estado; prioridad: Prioridad } {
  const status = req.status.trim().toLowerCase();
  const priority = req.priority.trim().toLowerCase();
  const estado = mapeo.estado[status];
  const prioridad = mapeo.prioridad[priority];
  if (!estado) {
    avisar(`[komuk-hub] status desconocido "${req.status}" en ${req.id}; uso "${mapeo.estadoPorDefecto}"`);
  }
  if (!prioridad) {
    avisar(`[komuk-hub] priority desconocido "${req.priority}" en ${req.id}; uso "${mapeo.prioridadPorDefecto}"`);
  }
  return {
    estado: estado ?? mapeo.estadoPorDefecto,
    prioridad: prioridad ?? mapeo.prioridadPorDefecto,
  };
}

export function desde(ultimo: Date | null): string {
  if (!ultimo) return "1970-01-01T00:00:00.000Z";
  return new Date(ultimo.getTime() - SOLAPAMIENTO_MS).toISOString();
}

/** El Hub manda la URL: sólo http(s) entra al href. El resto queda en "#". */
export function hrefSeguro(u: string): string {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? u : "#";
  } catch {
    return "#";
  }
}

export type TicketEspejo = {
  externalId: string;
  externalUrl: string;
  externalUpdatedAt: Date;
  externalStatus: string;
  titulo: string;
  detalle: string;
  estado: Estado;
  prioridad: Prioridad;
};

export type RepoSync = {
  ultimoSync(fuente: string): Promise<Date | null>;
  clienteExiste(nombre: string): Promise<string | null>;
  upsert(fuente: string, cliente: string, t: TicketEspejo): Promise<"creado" | "actualizado" | "sin_cambios">;
  marcarOk(fuente: string, at: Date): Promise<void>;
  marcarError(fuente: string, mensaje: string): Promise<void>;
};

export type ResultadoSync =
  | { ok: true; creados: number; actualizados: number; sinCambios: number; paginas: number }
  | { ok: false; error: string };

const TOPE_PAGINAS = 1000;

export async function sincronizar(deps: {
  repo: RepoSync;
  cfg: HubConfig;
  fetchPagina?: typeof fetchPaginaReal;
  ahora?: () => Date;
  avisar?: (msg: string) => void;
}): Promise<ResultadoSync> {
  const fetchPagina = deps.fetchPagina ?? fetchPaginaReal;
  const ahora = deps.ahora ?? (() => new Date());
  const avisar = deps.avisar ?? console.warn;
  const { repo, cfg } = deps;
  const inicio = ahora();

  try {
    const cliente = await repo.clienteExiste(CLIENTE_KOMUK);
    if (!cliente) {
      const error = 'No existe el cliente "KOMUK": crealo en /clientes/ antes de sincronizar';
      await repo.marcarError(FUENTE, error);
      return { ok: false, error };
    }

    const updatedSince = desde(await repo.ultimoSync(FUENTE));
    let cursor: string | null | undefined;
    const vistos = new Set<string>();
    let creados = 0;
    let actualizados = 0;
    let sinCambios = 0;
    let paginas = 0;

    while (true) {
      if (paginas >= TOPE_PAGINAS) {
        throw new HubError("demasiadas páginas", null);
      }
      const pagina = await fetchPagina(cfg, { updatedSince, cursor });
      paginas++;

      for (const item of pagina.data) {
        const { estado, prioridad } = mapear(item, avisar);
        const resultado = await repo.upsert(FUENTE, cliente, {
          externalId: item.id,
          externalUrl: item.url,
          externalUpdatedAt: new Date(item.updated_at),
          externalStatus: item.status,
          titulo: item.title.trim().slice(0, 200) || "(sin título)",
          detalle: item.description.slice(0, 5000),
          estado,
          prioridad,
        });
        if (resultado === "creado") creados++;
        else if (resultado === "actualizado") actualizados++;
        else sinCambios++;
      }

      if (!pagina.next_cursor) break;
      if (vistos.has(pagina.next_cursor)) {
        throw new HubError("el Hub devolvió un cursor repetido", null);
      }
      vistos.add(pagina.next_cursor);
      cursor = pagina.next_cursor;
    }

    await repo.marcarOk(FUENTE, inicio);
    return { ok: true, creados, actualizados, sinCambios, paginas };
  } catch (e) {
    const error = e instanceof HubError ? e.message : "Error inesperado del sync";
    await repo.marcarError(FUENTE, error);
    return { ok: false, error };
  }
}
