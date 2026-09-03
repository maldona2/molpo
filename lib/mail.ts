// Envío de mail vía Resend. Único punto de salida: lo usan el formulario de
// contacto, soporte y feedback. Cada caller pasa las líneas del cuerpo y acá
// se derivan las dos versiones que espera Resend: texto plano y HTML de marca.

// La extensión explícita la exige node al correr los tests con type stripping.
import { site } from "./site.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "molpo web <info@molpo.ar>";
const LOGO_URL = `${site.url}/assets/molpo-blanco.png`;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type MailResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" }
  | { ok: false; reason: "failed" };

// null = línea que el caller decidió omitir; "" = separación de párrafo.
export type MailLine = string | null;
export type MailButton = { label: string; href: string };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

// Las líneas ya vienen escapadas: los links sueltos del texto plano tienen que
// seguir siendo clickeables en el HTML.
function linkify(escaped: string): string {
  return escaped.replace(
    /https?:\/\/[^\s<]+/g,
    (url) => `<a href="${url}" style="color:#18365d">${url}</a>`,
  );
}

function lines(body: MailLine[]): string[] {
  return body
    .filter((line): line is string => line !== null)
    .flatMap((line) => line.split("\n"));
}

export function renderMailText(body: MailLine[], button?: MailButton): string {
  const all = lines(body);
  if (button) all.push("", `${button.label}: ${button.href}`);
  return all.join("\n");
}

export function renderMailHtml(body: MailLine[], button?: MailButton): string {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of lines(body)) {
    if (line.trim() === "") {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) groups.push(current);

  const paragraphs = groups
    .map(
      (group) =>
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#09172b">` +
        `${group.map((line) => linkify(escapeHtml(line))).join("<br>")}</p>`,
    )
    .join("");

  // Sólo http(s): un href raro no debería salir clickeable de acá.
  const cta =
    button && /^https?:\/\//.test(button.href)
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px">` +
        `<tr><td style="background-color:#18365d;border-radius:6px">` +
        `<a href="${escapeHtml(button.href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">` +
        `${escapeHtml(button.label)}</a></td></tr></table>`
      : "";

  return (
    `<!doctype html><html lang="${site.lang}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width"><title>${escapeHtml(site.name)}</title></head>` +
    `<body style="margin:0;padding:0;background-color:#d7e8f8">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#d7e8f8">` +
    `<tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px">` +
    `<tr><td style="background-color:#18365d;padding:20px 24px;border-radius:8px 8px 0 0">` +
    `<img src="${LOGO_URL}" width="73" height="26" alt="${escapeHtml(site.name)}" style="display:block;border:0"></td></tr>` +
    `<tr><td style="padding:24px">${paragraphs}${cta}</td></tr>` +
    `<tr><td style="background-color:#09172b;padding:16px 24px;border-radius:0 0 8px 8px">` +
    `<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:#8cb3de">` +
    `${escapeHtml(site.tagline)}<br>` +
    `<a href="${site.url}" style="color:#8cb3de">${escapeHtml(site.contact.webDisplay)}</a></p>` +
    `</td></tr></table></td></tr></table></body></html>`
  );
}

export async function sendMail(mail: {
  subject: string;
  body: MailLine[];
  button?: MailButton;
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
        text: renderMailText(mail.body, mail.button),
        html: renderMailHtml(mail.body, mail.button),
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
