import { actualizarTicket } from "@/app/soporte/actions";
import { ESTADOS, ETIQUETAS, type Ticket } from "@/lib/tickets";
import styles from "./TicketList.module.css";

const fecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

type Props = {
  tickets: Ticket[];
  /** Token de admin: si viene, cada ticket puede cambiar de estado y responderse. */
  adminToken?: string;
};

export default function TicketList({ tickets, adminToken }: Props) {
  if (tickets.length === 0) {
    return <p className={styles.vacio}>Todavía no hay pedidos cargados.</p>;
  }

  return (
    <ul className={styles.lista}>
      {tickets.map((ticket) => (
        <li key={ticket.id} className={styles.item}>
          <div className={styles.cabecera}>
            <span className={`${styles.chip} ${styles[ticket.estado]}`}>
              {ETIQUETAS[ticket.estado]}
            </span>
            <span className={styles.meta}>
              #{ticket.id} · {ETIQUETAS[ticket.tipo]} · Prioridad {ETIQUETAS[ticket.prioridad]} ·{" "}
              {fecha.format(new Date(ticket.creado))}
              {adminToken ? ` · ${ticket.cliente}` : ""}
            </span>
          </div>
          <h3 className={styles.titulo}>{ticket.titulo}</h3>
          <p className={styles.detalle}>{ticket.detalle}</p>
          {ticket.url || ticket.reporta || (adminToken && ticket.email) ? (
            <p className={styles.contexto}>
              {[ticket.url, ticket.reporta, adminToken ? ticket.email : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {ticket.respuesta ? (
            <p className={styles.respuesta}>
              <strong>Respuesta:</strong> {ticket.respuesta}
            </p>
          ) : null}

          {adminToken ? (
            <form className={styles.acciones} action={actualizarTicket}>
              <input type="hidden" name="token" value={adminToken} />
              <input type="hidden" name="id" value={ticket.id} />
              <input type="hidden" name="estadoPrevio" value={ticket.estado} />
              <select name="estado" defaultValue={ticket.estado} aria-label="Estado">
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {ETIQUETAS[estado]}
                  </option>
                ))}
              </select>
              <input
                name="respuesta"
                type="text"
                maxLength={2000}
                defaultValue={ticket.respuesta ?? ""}
                placeholder="Respuesta visible para el cliente"
                aria-label="Respuesta"
              />
              <button type="submit">Guardar</button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
