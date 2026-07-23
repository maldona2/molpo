export type ContactInput = {
  nombre: string;
  email: string;
  empresa?: string;
  mensaje: string;
};

type ValidationResult = { ok: true; value: ContactInput } | { ok: false; error: string };

const LIMITS = { nombre: 200, email: 320, empresa: 200, mensaje: 5000 } as const;
// Suficiente para un form de contacto: algo@algo.tld sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}

export function validateContact(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Cuerpo inválido" };
  }
  const data = input as Record<string, unknown>;
  const nombre = cleanField(data.nombre, LIMITS.nombre);
  const email = cleanField(data.email, LIMITS.email);
  const empresa = cleanField(data.empresa ?? "", LIMITS.empresa);
  const mensaje = cleanField(data.mensaje, LIMITS.mensaje);

  if (!nombre) return { ok: false, error: "Falta el nombre o es demasiado largo" };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };
  if (empresa === null) return { ok: false, error: "Empresa demasiado larga" };
  if (!mensaje) return { ok: false, error: "Falta el mensaje o es demasiado largo" };

  return {
    ok: true,
    value: { nombre, email, empresa: empresa || undefined, mensaje },
  };
}
