import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TicketList from "@/components/TicketList";
import { esAdmin, ESTADOS, ETIQUETAS } from "@/lib/tickets";
import { listTickets } from "@/lib/tickets-db";
import styles from "./AdminSoporte.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Soporte (admin)",
  description: "Panel privado de pedidos de soporte.",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ estado?: string; error?: string; ok?: string }>;
};

export default async function AdminSoportePage({ params, searchParams }: Props) {
  const { token } = await params;
  if (!esAdmin(token)) notFound();

  const { estado, error, ok } = await searchParams;
  const todos = await listTickets();
  const tickets = estado ? todos.filter((t) => t.estado === estado) : todos;

  return (
    <main className={`container ${styles.main}`}>
      <h1 className={styles.h1}>Pedidos de soporte</h1>
      <nav className={styles.filtros} aria-label="Filtrar por estado">
        <a href={`/admin/soporte/${token}/`} className={!estado ? styles.activo : undefined}>
          Todos ({todos.length})
        </a>
        {ESTADOS.map((e) => (
          <a
            key={e}
            href={`/admin/soporte/${token}/?estado=${e}`}
            className={estado === e ? styles.activo : undefined}
          >
            {ETIQUETAS[e]} ({todos.filter((t) => t.estado === e).length})
          </a>
        ))}
        <a href={`/admin/feedback/${token}/`}>Ver feedback →</a>
        <a href={`/admin/clientes/${token}/`}>Gestionar clientes →</a>
      </nav>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className={styles.ok} role="status">
          Pedido actualizado.
        </p>
      ) : null}
      <TicketList tickets={tickets} adminToken={token} />
    </main>
  );
}
