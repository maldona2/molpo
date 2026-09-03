// Envío de mail vía Resend. Único punto de salida: lo usan el formulario de
// contacto y el módulo de soporte.

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "molpo web <info@molpo.ar>";

export type MailResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" }
  | { ok: false; reason: "failed" };

export async function sendMail(mail: {
  subject: string;
  text: string;
  replyTo?: string;
  to?: string;
}): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "unconfigured" };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to ?? process.env.CONTACT_TO ?? "info@molpo.ar"],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Resend rechazó el envío", {
        status: response.status,
        response: await response.text(),
      });
      return { ok: false, reason: "failed" };
    }
  } catch (error) {
    console.error("No se pudo conectar con Resend", error);
    return { ok: false, reason: "failed" };
  }

  return { ok: true };
}
