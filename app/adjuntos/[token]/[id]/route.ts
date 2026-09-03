import { esAdmin } from "@/lib/tickets";
import { clienteDeToken } from "@/lib/clientes-db";
import { getAdjunto } from "@/lib/adjuntos-db";
import { detectarTipoImagen } from "@/lib/adjuntos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string; id: string }> };

/**
 * Sirve una captura. El token del link es la credencial, igual que en el resto
 * del módulo: el admin ve todas, el cliente sólo las de sus propios tickets.
 */
export async function GET(_request: Request, { params }: Props) {
  const { token, id } = await params;

  const adjuntoId = Number(id);
  if (!Number.isInteger(adjuntoId)) return new Response("No encontrado", { status: 404 });

  const adjunto = await getAdjunto(adjuntoId);
  if (!adjunto) return new Response("No encontrado", { status: 404 });

  if (!esAdmin(token)) {
    const cliente = await clienteDeToken(token);
    // Mismo 404 para "token inválido" y "no es tuyo": no confirmamos que el
    // adjunto exista a quien no puede verlo.
    if (!cliente || cliente !== adjunto.cliente) {
      return new Response("No encontrado", { status: 404 });
    }
  }

  // Se re-detecta el tipo desde los bytes en vez de confiar en la columna:
  // aunque algo raro haya entrado a la base, de acá no sale como HTML.
  const tipo = detectarTipoImagen(adjunto.bytes);
  if (!tipo) return new Response("No encontrado", { status: 404 });

  return new Response(Buffer.from(adjunto.bytes), {
    headers: {
      "content-type": tipo,
      "content-disposition": `inline; filename="${adjunto.nombre}"`,
      "x-content-type-options": "nosniff",
      // Privado: lleva el token en la URL, no queremos que lo cachee un proxy.
      "cache-control": "private, max-age=3600",
    },
  });
}
