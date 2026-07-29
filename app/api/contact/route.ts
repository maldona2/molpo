import { NextResponse } from "next/server";
import { validateContact } from "@/lib/contact";

const RESEND_API_URL = "https://api.resend.com/emails";
const CONTACT_FROM = "molpo web <info@molpo.ar>";

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
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "El envío de mail no está configurado" },
      { status: 503 },
    );
  }

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
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [process.env.CONTACT_TO ?? "info@molpo.ar"],
        reply_to: `${nombre} <${email}>`,
        subject: `Contacto web: ${nombre}`,
        text: [
          `Nombre: ${nombre}`,
          `Email: ${email}`,
          empresa ? `Empresa: ${empresa}` : null,
          "",
          mensaje,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Resend rechazó el envío", {
        status: response.status,
        response: await response.text(),
      });
      return NextResponse.json({ error: "No se pudo enviar el mail" }, { status: 502 });
    }
  } catch (error) {
    console.error("No se pudo conectar con Resend", error);
    return NextResponse.json({ error: "No se pudo enviar el mail" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
