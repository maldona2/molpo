// Validación y tipos del módulo de soporte. Sin acceso a base: lo testeable
// vive acá, las consultas en lib/tickets-db.ts.

export const TIPOS = ["bug", "mejora", "consulta"] as const;
export const PRIORIDADES = ["baja", "media", "alta"] as const;
export const ESTADOS = ["abierto", "en_curso", "resuelto", "cerrado"] as const;

export type Tipo = (typeof TIPOS)[number];
export type Prioridad = (typeof PRIORIDADES)[number];
export type Estado = (typeof ESTADOS)[number];

export const ETIQUETAS: Record<Tipo | Prioridad | Estado, string> = {
  bug: "Bug",
  mejora: "Mejora",
  consulta: "Consulta",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  abierto: "Abierto",
  en_curso: "En curso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export type Ticket = {
  id: number;
  cliente: string;
  tipo: Tipo;
  prioridad: Prioridad;
  estado: Estado;
  titulo: string;
  detalle: string;
  url: string | null;
  reporta: string | null;
  email: string | null;
  respuesta: string | null;
  creado: Date;
  actualizado: Date;
};

export type TicketInput = {
  tipo: Tipo;
  prioridad: Prioridad;
  titulo: string;
  detalle: string;
  url?: string;
  reporta?: string;
  email?: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Mismo criterio que el form de contacto: algo@algo.tld sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITES = { titulo: 200, detalle: 5000, url: 500, reporta: 200, email: 320 } as const;

function limpiar(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}

export function validateTicket(input: unknown): Result<TicketInput> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Cuerpo inválido" };
  }
  const data = input as Record<string, unknown>;

  const tipo = TIPOS.find((t) => t === data.tipo);
  if (!tipo) return { ok: false, error: "Elegí un tipo válido" };

  const prioridad = PRIORIDADES.find((p) => p === data.prioridad);
  if (!prioridad) return { ok: false, error: "Elegí una prioridad válida" };

  const titulo = limpiar(data.titulo, LIMITES.titulo);
  if (!titulo) return { ok: false, error: "Falta el título o es demasiado largo" };

  const detalle = limpiar(data.detalle, LIMITES.detalle);
  if (!detalle) return { ok: false, error: "Falta el detalle o es demasiado largo" };

  const url = limpiar(data.url ?? "", LIMITES.url);
  if (url === null) return { ok: false, error: "La URL es demasiado larga" };

  const reporta = limpiar(data.reporta ?? "", LIMITES.reporta);
  if (reporta === null) return { ok: false, error: "El nombre es demasiado largo" };

  const email = limpiar(data.email ?? "", LIMITES.email);
  if (email === null) return { ok: false, error: "El email es demasiado largo" };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };

  return {
    ok: true,
    value: {
      tipo,
      prioridad,
      titulo,
      detalle,
      url: url || undefined,
      reporta: reporta || undefined,
      email: email || undefined,
    },
  };
}

/** Token superadmin: gestiona clientes y entra a los paneles de soporte y feedback. */
export function esAdmin(token: string): boolean {
  const esperado = process.env.SOPORTE_ADMIN_TOKEN;
  return Boolean(esperado) && token === esperado;
}

export function parseEstado(value: unknown): Estado | null {
  return ESTADOS.find((e) => e === value) ?? null;
}
