"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendMail } from "@/lib/mail";
import { identidad } from "@/lib/auth";
import { validateFeedback, TRABAJO_ETIQUETAS, PUNTAJE_ETIQUETAS } from "@/lib/feedback";
import { createFeedback } from "@/lib/feedback-db";

// ponytail: rate limit in-memory por token, mismo criterio que /soporte.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(token: string): boolean {
  const now = Date.now();
  const recent = (hits.get(token) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(token, recent);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  return false;
}

export async function crearFeedback(formData: FormData) {
  const quien = await identidad();
  if (quien?.rol !== "cliente") redirect("/entrar/");
  const cliente = quien.nombre;

  // Honeypot: oculto para humanos, los bots lo completan.
  if (formData.get("web")) redirect("/opinar/?ok=1");

  if (rateLimited(String(quien.clienteId))) {
    redirect(`/opinar/?error=${encodeURIComponent("Demasiados envíos, probá más tarde")}`);
  }

  const result = validateFeedback(Object.fromEntries(formData.entries()));
  if (!result.ok) redirect(`/opinar/?error=${encodeURIComponent(result.error)}`);

  const fb = await createFeedback(cliente, result.value);

  await sendMail({
    subject: `[Feedback ${fb.puntaje}/5] ${cliente} · ${TRABAJO_ETIQUETAS[fb.trabajo]}`,
    body: [
      `Cliente: ${cliente}`,
      `Trabajo: ${TRABAJO_ETIQUETAS[fb.trabajo]}`,
      `Puntaje: ${fb.puntaje}/5 (${PUNTAJE_ETIQUETAS[fb.puntaje]}) · Recomendaría: ${fb.recomienda}/5`,
      fb.nombre ? `Firma: ${fb.nombre}` : null,
      fb.email ? `Email: ${fb.email}` : null,
      `Publicable como testimonio: ${fb.publicar ? "sí" : "no"}`,
      "",
      fb.comentario,
      fb.destacado ? `\nLo que más sirvió: ${fb.destacado}` : null,
      fb.mejorar ? `\nA mejorar: ${fb.mejorar}` : null,
    ],
    replyTo: fb.email ?? undefined,
  });

  revalidatePath("/opinar");
  redirect("/opinar/?ok=1");
}
