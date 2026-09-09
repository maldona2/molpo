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

/** Tope de la respuesta del admin. Lo comparten el textarea y el server. */
export const LIMITE_RESPUESTA = LIMITES.detalle;

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

/**
 * Quién puede mirar un ticket. El admin ve todo; el cliente, sólo lo suyo.
 * Misma regla que sirve las capturas en app/adjuntos/[id]/route.ts.
 */
export function puedeVerTicket(
  quien: { rol: "admin" } | { rol: "cliente"; nombre: string },
  clienteDelTicket: string,
): boolean {
  return quien.rol === "admin" || quien.nombre === clienteDelTicket;
}

/**
 * Si nada cambió, no hay que guardar ni avisarle al cliente. Vacío y ausente
 * son la misma respuesta: el textarea manda "" cuando el admin no escribe nada.
 */
export function hayNovedad(
  previo: { estado: Estado; respuesta: string | null },
  estado: Estado,
  respuesta: string | null,
): boolean {
  return previo.estado !== estado || (previo.respuesta ?? "") !== (respuesta ?? "");
}

/**
 * La respuesta que manda el form del detalle. El select de la tarjeta no manda
 * el campo, y ahí `null` significa "no la toques", no "borrala": mover una
 * tarjeta nunca tiene que perder lo que el admin ya había escrito.
 */
export function normalizarRespuesta(crudo: unknown, previa: string | null): string | null {
  // Un campo ausente dice "no la toques". Cualquier otra cosa que no sea texto
  // (un File, por ejemplo) tampoco es una respuesta: `String(archivo)` guardaría
  // "[object File]" y se lo mandaría por mail al cliente.
  if (typeof crudo !== "string") return previa;
  return crudo.trim().slice(0, LIMITE_RESPUESTA) || null;
}

/**
 * ¿Hay algo que contarle al cliente? Cambiar el estado sí. Escribir una
 * respuesta también. Borrar una respuesta sin tocar el estado, no: se guarda,
 * pero no se le manda un mail diciendo que hay algo nuevo que no existe.
 */
export function hayQueAvisar(cambioEstado: boolean, respuesta: string | null): boolean {
  return cambioEstado || respuesta !== null;
}

/**
 * El aviso que le llega al cliente. Vive acá y no dentro de la acción porque
 * el texto tiene que ser cierto: mover la tarjeta y contestar sin mover son
 * dos cosas distintas, y decir "pasó a Abierto" cuando ya estaba abierto es
 * mentirle a alguien que confía en el mail.
 */
export function avisoDeTicket(
  ticket: { id: number; titulo: string; reporta: string | null; respuesta: string | null },
  estado: Estado,
  cambioEstado: boolean,
): { subject: string; body: (string | null)[] } {
  return {
    subject: cambioEstado
      ? `Tu pedido #${ticket.id} está ${ETIQUETAS[estado].toLowerCase()}: ${ticket.titulo}`
      : `Novedad en tu pedido #${ticket.id}: ${ticket.titulo}`,
    body: [
      `Hola${ticket.reporta ? ` ${ticket.reporta}` : ""},`,
      "",
      cambioEstado
        ? `El pedido #${ticket.id} "${ticket.titulo}" pasó a ${ETIQUETAS[estado]}.`
        : `Hay una respuesta nueva en el pedido #${ticket.id} "${ticket.titulo}".`,
      ticket.respuesta ? `\n${ticket.respuesta}` : null,
    ],
  };
}

/**
 * El id que llega por la URL, o null si no puede ser el de un ticket. `id` es
 * `serial`, o sea int4: un número más grande no es "no encontrado", es un error
 * de postgres, y un 500 le dice al que prueba más que un 404.
 */
export type AvisoTablero = "resuelto";

/**
 * El toast del tablero sólo tiene sentido si el pedido acaba de pasar a
 * resuelto y el mail al cliente salió. Mover sin mail, o re-guardar ya
 * resuelto, no es una novedad que merezca un aviso en pantalla.
 */
export function avisoTrasMover(previo: Estado, estado: Estado, mailEnviado: boolean): AvisoTablero | null {
  if (estado === "resuelto" && previo !== "resuelto" && mailEnviado) return "resuelto";
  return null;
}

export function urlTrasMover(aviso: AvisoTablero | null): string {
  return aviso ? `/tablero/?aviso=${aviso}` : "/tablero/";
}

export function parseAviso(value: unknown): AvisoTablero | null {
  return value === "resuelto" ? "resuelto" : null;
}

export function idDeTicket(crudo: string): number | null {
  // Sólo dígitos: `Number` también acepta "0x10", "1e3" y " 12 ", y cada forma
  // sería otra URL para el mismo ticket.
  if (!/^\d+$/.test(crudo)) return null;
  const id = Number(crudo);
  if (id < 1 || id > 2_147_483_647) return null;
  return id;
}
