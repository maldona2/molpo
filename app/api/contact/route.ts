import { NextResponse } from "next/server";
import { validateContact } from "@/lib/contact";
import { sendMail } from "@/lib/mail";

// ponytail: rate limit in-memory, alcanza para single-instance en Railway;
// pasar a store compartido si algún día hay más de una instancia.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  // Último hop: lo agrega el proxy de Railway, no lo controla el cliente.
  const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Demasiados envíos, probá más tarde" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  // Honeypot: si el campo oculto viene con contenido, fingir éxito.
  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).web) {
    return NextResponse.json({ ok: true });
  }

  const result = validateContact(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { nombre, email, empresa, mensaje } = result.value;
  const sent = await sendMail({
    subject: `Contacto web: ${nombre}`,
    replyTo: `${nombre} <${email}>`,
    body: [
      `Nombre: ${nombre}`,
      `Email: ${email}`,
      empresa ? `Empresa: ${empresa}` : null,
      "",
      mensaje,
    ],
  });

  if (!sent.ok) {
    return sent.reason === "unconfigured"
      ? NextResponse.json({ error: "El envío de mail no está configurado" }, { status: 503 })
      : NextResponse.json({ error: "No se pudo enviar el mail" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
