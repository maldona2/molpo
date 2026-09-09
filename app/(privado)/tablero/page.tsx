import type { Metadata } from "next";
import { exigirIdentidad } from "@/lib/auth";
import { ETIQUETAS } from "@/lib/tickets";
import { listTickets } from "@/lib/tickets-db";
import { listAdjuntos } from "@/lib/adjuntos-db";
import { agruparPorEstado, COLUMNAS } from "@/lib/tablero";
import Tablero from "@/components/Tablero";
import styles from "./Tablero.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tablero" };

type Props = { searchParams: Promise<{ cliente?: string }> };

export default async function TableroPage({ searchParams }: Props) {
  const quien = await exigirIdentidad();
  const esAdmin = quien.rol === "admin";

  const { cliente: filtro } = await searchParams;
  const todos = await listTickets(esAdmin ? undefined : quien.nombre);
  const tickets = esAdmin && filtro ? todos.filter((t) => t.cliente === filtro) : todos;
  const adjuntos = await listAdjuntos(tickets.map((t) => t.id));

  const columnas = agruparPorEstado(tickets);
  const clientes = esAdmin ? [...new Set(todos.map((t) => t.cliente))].sort() : [];

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.encabezado}>
        <h1 className={styles.h1}>{esAdmin ? "Tablero" : "Tus pedidos"}</h1>
        <p className={styles.bajada}>
          {esAdmin
            ? "Tocá un estado en la tarjeta para moverla. Al cliente le llega el aviso."
            : "Acá ves en qué anda cada pedido. El título abre el detalle."}
        </p>
      </div>

      {esAdmin && clientes.length > 1 ? (
        <nav className={styles.filtros} aria-label="Filtrar por cliente">
          <a href="/tablero/" className={!filtro ? styles.activo : undefined}>
            Todos ({todos.length})
          </a>
          {clientes.map((nombre) => (
            <a
              key={nombre}
              href={`/tablero/?cliente=${encodeURIComponent(nombre)}`}
              className={filtro === nombre ? styles.activo : undefined}
            >
              {nombre} ({todos.filter((t) => t.cliente === nombre).length})
            </a>
          ))}
        </nav>
      ) : null}

      <Tablero
        columnas={COLUMNAS.map((estado) => ({
          estado,
          etiqueta: ETIQUETAS[estado],
          tickets: columnas[estado].map((t) => ({
            id: t.id,
            titulo: t.titulo,
            tipo: ETIQUETAS[t.tipo],
            prioridad: t.prioridad,
            prioridadEtiqueta: ETIQUETAS[t.prioridad],
            cliente: t.cliente,
            respuesta: t.respuesta,
            capturas: adjuntos.filter((a) => a.ticket_id === t.id).length,
            primerAdjunto: adjuntos.find((a) => a.ticket_id === t.id)?.id ?? null,
          })),
        }))}
        esAdmin={esAdmin}
      />
    </div>
  );
}
