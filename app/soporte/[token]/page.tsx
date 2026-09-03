import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TicketList from "@/components/TicketList";
import { crearTicket } from "@/app/soporte/actions";
import { PRIORIDADES, TIPOS, ETIQUETAS } from "@/lib/tickets";
import { listTickets } from "@/lib/tickets-db";
import { listAdjuntos } from "@/lib/adjuntos-db";
import { clienteDeToken } from "@/lib/clientes-db";
import styles from "./Soporte.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Soporte",
  description: "Reportá bugs, pedí mejoras y seguí el estado de cada pedido.",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
};

export default async function SoportePage({ params, searchParams }: Props) {
  const { token } = await params;
  const cliente = await clienteDeToken(token);
  if (!cliente) notFound();

  const { ok, error } = await searchParams;
  const tickets = await listTickets(cliente);
  const adjuntos = await listAdjuntos(tickets.map((t) => t.id));

  return (
    <>
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={`eyebrow ${styles.eyebrow}`}>Soporte</p>
            <h1 className={styles.h1}>{cliente}</h1>
            <p className={styles.lead}>
              Contame qué hay que arreglar o mejorar. Cargá acá los bugs, las mejoras y
              las consultas de tu sistema: cada pedido queda registrado con su estado,
              así los dos vemos en qué anda.
            </p>
          </div>
        </header>

        <section className={styles.body} aria-label="Nuevo pedido">
          <div className={`container ${styles.grid}`}>
            <form className={styles.form} action={crearTicket} encType="multipart/form-data">
              <input type="hidden" name="token" value={token} />
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Tipo</span>
                  <select name="tipo" defaultValue="bug" required>
                    {TIPOS.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {ETIQUETAS[tipo]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Prioridad</span>
                  <select name="prioridad" defaultValue="media" required>
                    {PRIORIDADES.map((prioridad) => (
                      <option key={prioridad} value={prioridad}>
                        {ETIQUETAS[prioridad]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={styles.field}>
                <span>Título</span>
                <input
                  name="titulo"
                  type="text"
                  required
                  maxLength={200}
                  placeholder="No puedo guardar una factura con descuento"
                />
              </label>
              <label className={styles.field}>
                <span>Detalle</span>
                <textarea
                  name="detalle"
                  required
                  maxLength={5000}
                  rows={6}
                  placeholder="Qué hiciste, qué esperabas que pasara y qué pasó. Si hay un mensaje de error, copialo tal cual."
                />
              </label>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Pantalla o URL (opcional)</span>
                  <input name="url" type="text" maxLength={500} placeholder="Facturación → Nueva" />
                </label>
                <label className={styles.field}>
                  <span>Tu nombre (opcional)</span>
                  <input name="reporta" type="text" maxLength={200} autoComplete="name" />
                </label>
              </div>
              <label className={styles.field}>
                <span>Capturas de pantalla (opcional)</span>
                <input
                  type="file"
                  name="capturas"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  multiple
                />
                <small className={styles.ayudaCampo}>
                  Hasta 3 imágenes, 3 MB cada una. Una captura del error suele ahorrar
                  media conversación.
                </small>
              </label>
              <label className={styles.field}>
                <span>Tu email (opcional)</span>
                <input name="email" type="email" maxLength={320} autoComplete="email" />
                <small className={styles.ayudaCampo}>
                  Si lo dejás, te aviso por mail cada vez que el pedido cambia de estado.
                </small>
              </label>
              {/* Honeypot: oculto para humanos, los bots lo completan */}
              <label className={styles.web} aria-hidden="true">
                Web
                <input name="web" type="text" tabIndex={-1} autoComplete="off" />
              </label>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              {ok ? (
                <p className={styles.ok} role="status">
                  Pedido registrado. Lo miro y te aviso por mail.
                </p>
              ) : null}
              <button type="submit" className={styles.submit}>
                Enviar pedido
              </button>
            </form>

            <aside className={styles.ayuda}>
              <h2 className={styles.ayudaTitle}>Qué me ayuda a resolverlo rápido</h2>
              <ul className={styles.ayudaLista}>
                <li>Los pasos exactos para reproducirlo.</li>
                <li>El mensaje de error tal cual aparece.</li>
                <li>Qué usuario y qué pantalla estabas usando.</li>
                <li>Si pasa siempre o una vez cada tanto.</li>
              </ul>
              <p className={styles.ayudaCierre}>
                ¿Terminamos una auditoría o un desarrollo?{" "}
                <a href={`/feedback/${token}/`}>Dejame tu feedback</a>.
              </p>
            </aside>
          </div>
        </section>

        <section className={styles.body} aria-label="Pedidos cargados">
          <div className="container">
            <h2 className={styles.h2}>Tus pedidos</h2>
            <TicketList tickets={tickets} token={token} adjuntos={adjuntos} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
