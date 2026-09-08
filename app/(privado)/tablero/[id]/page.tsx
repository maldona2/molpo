import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirIdentidad } from "@/lib/auth";
import { ESTADOS, ETIQUETAS, LIMITE_RESPUESTA, idDeTicket, puedeVerTicket } from "@/lib/tickets";
import { getTicket } from "@/lib/tickets-db";
import { listAdjuntos } from "@/lib/adjuntos-db";
import { moverTicket } from "@/app/(privado)/tablero/acciones";
import styles from "./Detalle.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Detalle del pedido" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ conflicto?: string }>;
};

const fecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function DetallePage({ params, searchParams }: Props) {
  const quien = await exigirIdentidad();

  const { id } = await params;
  const ticketId = idDeTicket(id);
  if (ticketId === null) notFound();

  const ticket = await getTicket(ticketId);
  // Mismo 404 para "no existe" y "no es tuyo": no confirmamos la existencia de
  // un pedido a quien no puede verlo.
  if (!ticket || !puedeVerTicket(quien, ticket.cliente)) notFound();

  const capturas = await listAdjuntos([ticket.id]);
  const { conflicto } = await searchParams;

  return (
    <div className={`container ${styles.wrap}`}>
      <a href="/tablero/" className={styles.volver}>
        ← Volver al tablero
      </a>

      <div className={styles.meta}>
        <span className={`${styles.prioridad} ${styles[ticket.prioridad]}`}>
          {ETIQUETAS[ticket.prioridad]}
        </span>
        <span className={styles.estado}>{ETIQUETAS[ticket.estado]}</span>
        <span>
          #{ticket.id} · {ETIQUETAS[ticket.tipo]}
          {quien.rol === "admin" ? ` · ${ticket.cliente}` : ""}
        </span>
      </div>

      <h1 className={styles.h1}>{ticket.titulo}</h1>

      <dl className={styles.datos}>
        {ticket.url ? (
          <div>
            <dt>Pantalla o URL</dt>
            <dd>{ticket.url}</dd>
          </div>
        ) : null}
        {ticket.reporta ? (
          <div>
            <dt>Reporta</dt>
            <dd>{ticket.reporta}</dd>
          </div>
        ) : null}
        <div>
          <dt>Creado</dt>
          <dd>{fecha.format(ticket.creado)}</dd>
        </div>
        <div>
          <dt>Última novedad</dt>
          <dd>{fecha.format(ticket.actualizado)}</dd>
        </div>
      </dl>

      <section className={styles.bloque} aria-labelledby="detalle">
        <h2 id="detalle" className={styles.h2}>
          Detalle
        </h2>
        {/* El detalle lo escribió una persona en un textarea: los saltos de
            línea son parte de lo que quiso decir. */}
        <p className={styles.detalle}>{ticket.detalle}</p>
      </section>

      {capturas.length > 0 ? (
        <section className={styles.bloque} aria-labelledby="capturas">
          <h2 id="capturas" className={styles.h2}>
            Capturas ({capturas.length})
          </h2>
          <ul className={styles.capturas}>
            {capturas.map((captura) => (
              <li key={captura.id}>
                {/* ponytail: la miniatura baja la captura entera (hasta 3 MB x 3
                    por ticket, ver MAX_BYTES). Redimensionar en /adjuntos/<id>
                    cuando alguien se queje de que el detalle tarda. */}
                <a href={`/adjuntos/${captura.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/adjuntos/${captura.id}`} alt={captura.nombre} loading="lazy" />
                  <span>{captura.nombre}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ticket.respuesta ? (
        <section className={styles.bloque} aria-labelledby="respuesta">
          <h2 id="respuesta" className={styles.h2}>
            Respuesta
          </h2>
          <p className={styles.respuesta}>{ticket.respuesta}</p>
        </section>
      ) : null}

      {quien.rol === "admin" ? (
        <form action={moverTicket} className={styles.gestion}>
          <input type="hidden" name="id" value={ticket.id} />
          {/* Con qué respuesta se pintó el form: si cambió mientras tanto, la
              acción manda a recargar en vez de pisarla. */}
          <input type="hidden" name="respuestaPrevia" value={ticket.respuesta ?? ""} />
          {conflicto ? (
            <p className={styles.conflicto}>
              Alguien más cambió la respuesta mientras tenías esto abierto. Abajo está la que
              quedó guardada: revisala antes de escribir de nuevo.
            </p>
          ) : null}
          <label className={styles.campo}>
            <span>Estado</span>
            <select name="estado" defaultValue={ticket.estado}>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {ETIQUETAS[estado]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.campo}>
            <span>Respuesta para el cliente</span>
            <textarea
              name="respuesta"
              rows={4}
              maxLength={LIMITE_RESPUESTA}
              defaultValue={ticket.respuesta ?? ""}
              placeholder="Qué le contás al cliente sobre este pedido."
            />
          </label>
          <button type="submit" className={styles.guardar}>
            Guardar y avisar
          </button>
        </form>
      ) : null}
    </div>
  );
}
