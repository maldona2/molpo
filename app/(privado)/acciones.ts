"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { validateEmailCliente } from "@/lib/clientes";
import { clientePorEmail } from "@/lib/clientes-db";
import { COOKIE_SESION, esAdminEmail } from "@/lib/sesiones";
import { crearAcceso, cerrarSesion, limpiarVencidos } from "@/lib/sesiones-db";

const APP_URL = process.env.APP_URL ?? "https://app.molpo.ar";

// Rate limit por dirección: sin freno, este formulario sirve para probar mails
// de a miles y averiguar quiénes son clientes.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(clave: string): boolean {
  const now = Date.now();
  const recent = (hits.get(clave) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(clave, recent);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  return false;
}

export async function pedirAcceso(formData: FormData) {
  // Honeypot: oculto para humanos, los bots lo completan.
  if (formData.get("web")) redirect("/entrar/?enviado=1");

  const email = validateEmailCliente(formData.get("email"));
  if (!email.ok || !email.value) {
    redirect(`/entrar/?error=${encodeURIComponent("Escribí un email válido")}`);
  }

  if (rateLimited(email.value)) redirect("/entrar/?enviado=1");

  await limpiarVencidos();

  const admin = esAdminEmail(email.value, process.env.ADMIN_EMAILS);
  const cliente = admin ? null : await clientePorEmail(email.value);

  if (admin || cliente) {
    const token = await crearAcceso(
      email.value,
      admin ? "admin" : "cliente",
      cliente?.id ?? null,
    );
    const link = `${APP_URL}/entrar/${token}/`;
    await sendMail({
      to: email.value,
      subject: "Tu acceso a molpo",
      body: [
        "Hola,",
        "",
        "Este link te deja entrar. Vence en 15 minutos y sirve una sola vez:",
        "",
        link,
        "",
        "Si no lo pediste vos, ignoralo: sin abrirlo no pasa nada.",
        "",
        "molpo",
      ],
      button: { label: "Entrar", href: link },
    });
  }

  // Misma respuesta exista o no el email: si no, el formulario dice quién es
  // cliente y quién no.
  redirect("/entrar/?enviado=1");
}

export async function salir() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value;
  if (token) await cerrarSesion(token);
  jar.delete(COOKIE_SESION);
  redirect("/entrar/");
}
