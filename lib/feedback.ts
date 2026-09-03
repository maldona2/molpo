// Validación y tipos del módulo de feedback. Sin acceso a base: lo testeable
// vive acá, las consultas en lib/feedback-db.ts. El cliente entra con el mismo
// token que usa para soporte (tabla `clientes`), así no hay un segundo padrón
// que mantener.

export const TRABAJOS = ["auditoria", "desarrollo", "soporte"] as const;
export const PUNTAJES = [1, 2, 3, 4, 5] as const;

export type Trabajo = (typeof TRABAJOS)[number];
export type Puntaje = (typeof PUNTAJES)[number];

export const TRABAJO_ETIQUETAS: Record<Trabajo, string> = {
  auditoria: "Auditoría",
  desarrollo: "Desarrollo",
  soporte: "Soporte",
};

export const PUNTAJE_ETIQUETAS: Record<Puntaje, string> = {
  1: "Malo",
  2: "Flojo",
  3: "Correcto",
  4: "Muy bueno",
  5: "Excelente",
};

export type Feedback = {
  id: number;
  cliente: string;
  trabajo: Trabajo;
  puntaje: Puntaje;
  recomienda: Puntaje;
  destacado: string | null;
  mejorar: string | null;
  comentario: string;
  nombre: string | null;
  email: string | null;
  publicar: boolean;
  creado: Date;
};

export type FeedbackInput = {
  trabajo: Trabajo;
  puntaje: Puntaje;
  recomienda: Puntaje;
  destacado?: string;
  mejorar?: string;
  comentario: string;
  nombre?: string;
  email?: string;
  publicar: boolean;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Mismo criterio que el form de contacto: algo@algo.tld sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITES = { comentario: 3000, destacado: 1000, mejorar: 1000, nombre: 200, email: 320 } as const;

function limpiar(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}

function parsePuntaje(value: unknown): Puntaje | null {
  const n = Number(value);
  return PUNTAJES.find((p) => p === n) ?? null;
}

export function validateFeedback(input: unknown): Result<FeedbackInput> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Cuerpo inválido" };
  }
  const data = input as Record<string, unknown>;

  const trabajo = TRABAJOS.find((t) => t === data.trabajo);
  if (!trabajo) return { ok: false, error: "Elegí qué trabajo estás calificando" };

  const puntaje = parsePuntaje(data.puntaje);
  if (!puntaje) return { ok: false, error: "Elegí un puntaje del 1 al 5" };

  const recomienda = parsePuntaje(data.recomienda);
  if (!recomienda) return { ok: false, error: "Elegí del 1 al 5 qué tanto nos recomendarías" };

  const comentario = limpiar(data.comentario, LIMITES.comentario);
  if (!comentario) return { ok: false, error: "Falta el comentario o es demasiado largo" };

  const destacado = limpiar(data.destacado ?? "", LIMITES.destacado);
  if (destacado === null) return { ok: false, error: "El texto es demasiado largo" };

  const mejorar = limpiar(data.mejorar ?? "", LIMITES.mejorar);
  if (mejorar === null) return { ok: false, error: "El texto es demasiado largo" };

  const nombre = limpiar(data.nombre ?? "", LIMITES.nombre);
  if (nombre === null) return { ok: false, error: "El nombre es demasiado largo" };

  const email = limpiar(data.email ?? "", LIMITES.email);
  if (email === null) return { ok: false, error: "El email es demasiado largo" };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };

  return {
    ok: true,
    value: {
      trabajo,
      puntaje,
      recomienda,
      comentario,
      destacado: destacado || undefined,
      mejorar: mejorar || undefined,
      nombre: nombre || undefined,
      email: email || undefined,
      publicar: Boolean(data.publicar),
    },
  };
}

/** Promedio con un decimal, o null si todavía no hay respuestas. */
export function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}
