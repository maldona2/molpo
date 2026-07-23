import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { validateContact } from "@/lib/contact";

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
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;
  if (!user || !pass) {
    return NextResponse.json(
      { error: "El envío de mail no está configurado" },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
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
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"molpo web" <${user}>`,
      to: process.env.CONTACT_TO ?? "info@molpo.ar",
      replyTo: `"${nombre}" <${email}>`,
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
    });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el mail" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
