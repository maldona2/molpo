import type { Metadata } from "next";
import { exigirIdentidad } from "@/lib/auth";
import { listTickets } from "@/lib/tickets-db";
import { listAdjuntos } from "@/lib/adjuntos-db";
import { hrefSeguro } from "@/lib/komuk-hub-sync";
import { leerEstadoSync } from "@/lib/komuk-hub-db";
import { filtrosDesdeQuery, type TarjetaTablero } from "@/lib/tablero";
import Tablero from "@/components/Tablero";
import Toast from "@/components/Toast";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tablero" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TableroPage({ searchParams }: Props) {
  const quien = await exigirIdentidad();
  const esAdmin = quien.rol === "admin";

  const query = await searchParams;
  const estadoSync = esAdmin ? await leerEstadoSync() : undefined;
  // El rol filtra acá, en el server: lo que no es del cliente nunca llega al navegador.
  const tickets = await listTickets(esAdmin ? undefined : quien.nombre);
  const adjuntos = await listAdjuntos(tickets.map((t) => t.id));

  // ponytail: viaja el detalle completo de hasta 500 pedidos para abrir el
  // panel sin otra consulta. Si la página pesa, pedir el detalle al abrirlo.
  const tarjetas: TarjetaTablero[] = tickets.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    tipo: t.tipo,
    prioridad: t.prioridad,
    estado: t.estado,
    cliente: t.cliente,
    reporta: t.reporta,
    email: t.email,
    url: t.url,
    detalle: t.detalle,
    respuesta: t.respuesta,
    creado: t.creado.getTime(),
    actividad: t.actualizado.getTime(),
    adjuntos: adjuntos
      .filter((a) => a.ticket_id === t.id)
      .map((a) => ({ id: a.id, nombre: a.nombre })),
    externa: t.external_source === "komuk_hub" ? hrefSeguro(t.external_url ?? "") : null,
  }));

  return (
    <>
      <Tablero
        tickets={tarjetas}
        esAdmin={esAdmin}
        ahora={Date.now()}
        filtrosIniciales={filtrosDesdeQuery(query)}
        sync={
          esAdmin
            ? {
                ultima: estadoSync?.last_synced_at?.getTime() ?? null,
                error: estadoSync?.last_status === "error" ? estadoSync.last_error : null,
              }
            : null
        }
      />
      {query.sync === "ok" ? <Toast>Sincronización con KOMUK Hub terminada.</Toast> : null}
      {query.sync === "error" ? (
        <Toast>La sincronización con KOMUK Hub falló. Mirá el último error.</Toast>
      ) : null}
    </>
  );
}
