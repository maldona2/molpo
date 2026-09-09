import type { Metadata } from "next";
import { exigirIdentidad } from "@/lib/auth";
import { ETIQUETAS, parseAviso } from "@/lib/tickets";
import { listTickets } from "@/lib/tickets-db";
import { listAdjuntos } from "@/lib/adjuntos-db";
import { agruparPorEstado, COLUMNAS } from "@/lib/tablero";
import Tablero from "@/components/Tablero";
import Toast from "@/components/Toast";
import styles from "./Tablero.module.css";
import panel from "@/app/(privado)/Panel.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tablero" };

type Props = { searchParams: Promise<{ cliente?: string; aviso?: string }> };

export default async function TableroPage({ searchParams }: Props) {
  const quien = await exigirIdentidad();
  const esAdmin = quien.rol === "admin";

  const { cliente: filtro, aviso: avisoCrudo } = await searchParams;
  const aviso = parseAviso(avisoCrudo);
  const todos = await listTickets(esAdmin ? undefined : quien.nombre);
  const tickets = esAdmin && filtro ? todos.filter((t) => t.cliente === filtro) : todos;
  const adjuntos = await listAdjuntos(tickets.map((t) => t.id));

  const columnas = agruparPorEstado(tickets);
  const clientes = esAdmin ? [...new Set(todos.map((t) => t.cliente))].sort() : [];
  const urgentes = todos.filter((t) => t.prioridad === "alta" && t.estado !== "resuelto" && t.estado !== "cerrado").length;

  return (
    <div className={`container ${styles.wrap}`}>
      <h1 className={panel.h1}>{esAdmin ? "Tablero" : "Tus pedidos"}</h1>
      <p className={panel.bajada}>
        {esAdmin
          ? "Tocá un estado en la tarjeta para moverla. Al cliente le llega el aviso."
          : "Acá ves en qué anda cada pedido. El título abre el detalle."}
      </p>

      <div className={panel.stats}>
        <div className={panel.stat}>
          <span className={panel.statValor}>{columnas.abierto.length}</span>
          <span className={panel.statEtiqueta}>Abiertos</span>
        </div>
        <div className={panel.stat}>
          <span className={panel.statValor}>{columnas.en_curso.length}</span>
          <span className={panel.statEtiqueta}>En curso</span>
        </div>
        <div className={panel.stat}>
          <span className={panel.statValor} data-tono={urgentes > 0 ? "alta" : undefined}>
            {urgentes}
          </span>
          <span className={panel.statEtiqueta}>Prioridad alta sin cerrar</span>
        </div>
        {esAdmin ? (
          <div className={panel.stat}>
            <span className={panel.statValor}>{clientes.length}</span>
            <span className={panel.statEtiqueta}>Clientes con pedidos</span>
          </div>
        ) : null}
      </div>

      {esAdmin && clientes.length > 1 ? (
        <nav className={panel.filtros} aria-label="Filtrar por cliente">
          <a href="/tablero/" className={!filtro ? panel.activo : undefined}>
            Todos ({todos.length})
          </a>
          {clientes.map((nombre) => (
            <a
              key={nombre}
              href={`/tablero/?cliente=${encodeURIComponent(nombre)}`}
              className={filtro === nombre ? panel.activo : undefined}
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
      {aviso === "resuelto" ? (
        <Toast>Le avisamos al cliente que el pedido quedó resuelto.</Toast>
      ) : null}
    </div>
  );
}
