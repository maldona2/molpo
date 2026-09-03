"use server";

import { redirect } from "next/navigation";
import { sendMail } from "@/lib/mail";
import { site } from "@/lib/site";
import { validateEmailCliente } from "@/lib/clientes";
import { clientePorEmail } from "@/lib/clientes-db";

// Rate limit por IP: acá no hay token que limitar, y sin freno esto sirve para
// probar mails de a miles a ver cuáles son clientes.
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

export async function pedirLink(formData: FormData) {
  // Honeypot: oculto para humanos, los bots lo completan.
  if (formData.get("web")) redirect("/soporte/?enviado=1");

  const email = validateEmailCliente(formData.get("email"));
  if (!email.ok || !email.value) {
    redirect(`/soporte/?error=${encodeURIComponent("Escribí un email válido")}`);
  }

  if (rateLimited(email.value)) redirect("/soporte/?enviado=1");

  const cliente = await clientePorEmail(email.value);
  if (cliente) {
    await sendMail({
      to: cliente.email ?? email.value,
      subject: "Tu link de soporte de molpo",
      body: [
        `Hola,`,
        "",
        `Este es el acceso de ${cliente.nombre}. Guardalo en favoritos y entrás cuando quieras:`,
        "",
        `${site.url}/soporte/${cliente.token}/`,
        "",
        "Desde ahí cargás bugs, pedís mejoras y ves en qué anda cada pedido.",
        "",
        "molpo",
      ],
      button: { label: "Abrir mi soporte", href: `${site.url}/soporte/${cliente.token}/` },
    });
  }

  // Misma respuesta exista o no: si no, esto sirve para averiguar quién es
  // cliente probando mails.
  redirect("/soporte/?enviado=1");
}
