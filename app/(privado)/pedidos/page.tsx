import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirIdentidad } from "@/lib/auth";
import { crearPedido } from "@/app/(privado)/pedidos/acciones";
import { PRIORIDADES, TIPOS, ETIQUETAS } from "@/lib/tickets";
import styles from "./Pedidos.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cargar pedido" };

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function PedidosPage({ searchParams }: Props) {
  const quien = await exigirIdentidad();
  // El admin no carga pedidos a nombre de nadie: los pedidos son del cliente.
  if (quien.rol !== "cliente") redirect("/tablero/");

  const { ok, error } = await searchParams;

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.encabezado}>
        <h1 className={styles.h1}>Cargar un pedido</h1>
        <p className={styles.bajada}>
          Contame qué hay que arreglar o mejorar. Queda en tu tablero con su estado.
        </p>
      </div>

      <div className={styles.grid}>
        <form className={styles.form} action={crearPedido} encType="multipart/form-data">
          <fieldset className={styles.grupo}>
            <legend className={styles.legend}>Qué pasó</legend>
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
          </fieldset>

          <fieldset className={styles.grupo}>
            <legend className={styles.legend}>Dónde pasó (opcional)</legend>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Pantalla o URL</span>
                <input name="url" type="text" maxLength={500} placeholder="Facturación → Nueva" />
              </label>
              <label className={styles.field}>
                <span>Quién reporta</span>
                <input name="reporta" type="text" maxLength={200} autoComplete="name" />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.grupo}>
            <legend className={styles.legend}>Adjuntos y contacto (opcional)</legend>
            <label className={styles.field}>
              <span>Capturas de pantalla</span>
              <input
                type="file"
                name="capturas"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
              />
              <small className={styles.ayudaCampo}>
                Hasta 3 imágenes, 3 MB cada una. Una captura del error suele ahorrar media
                conversación.
              </small>
            </label>
            <label className={styles.field}>
              <span>Email para avisos</span>
              <input name="email" type="email" maxLength={320} autoComplete="email" />
              <small className={styles.ayudaCampo}>
                Si lo dejás, te aviso cada vez que este pedido cambia de estado.
              </small>
            </label>
          </fieldset>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className={styles.ok} role="status">
              Pedido registrado. Ya lo ves en tu tablero.
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
        </aside>
      </div>
    </div>
  );
}
