import { identidad } from "@/lib/auth";
import { idDeTicket, puedeVerTicket } from "@/lib/tickets";
import { getAdjunto } from "@/lib/adjuntos-db";
import { detectarTipoImagen } from "@/lib/adjuntos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * Sirve una captura. Autoriza por la sesión, igual que el resto del app: el
 * admin ve todas, el cliente sólo las de sus propios tickets.
 */
export async function GET(_request: Request, { params }: Props) {
  const quien = await identidad();
  if (!quien) return new Response("No encontrado", { status: 404 });

  const { id } = await params;
  // Mismo rango que un id de ticket: los dos son `serial`, y un número más
  // grande hace explotar la consulta en vez de devolver 404.
  const adjuntoId = idDeTicket(id);
  if (adjuntoId === null) return new Response("No encontrado", { status: 404 });

  const adjunto = await getAdjunto(adjuntoId);
  if (!adjunto) return new Response("No encontrado", { status: 404 });

  // Mismo 404 para "no existe" y "no es tuyo": no confirmamos la existencia de
  // un adjunto a quien no puede verlo. Una sola regla, compartida con el detalle.
  if (!puedeVerTicket(quien, adjunto.cliente)) {
    return new Response("No encontrado", { status: 404 });
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
      "cache-control": "private, max-age=3600",
    },
  });
}
