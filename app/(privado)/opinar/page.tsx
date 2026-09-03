import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { crearFeedback } from "@/app/(privado)/opinar/acciones";
import { exigirIdentidad } from "@/lib/auth";
import {
  PUNTAJES,
  PUNTAJE_ETIQUETAS,
  TRABAJOS,
  TRABAJO_ETIQUETAS,
  type Puntaje,
} from "@/lib/feedback";
import styles from "@/app/(privado)/pedidos/Pedidos.module.css";
import propios from "./Opinar.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Contame cómo salió el trabajo.",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { searchParams: Promise<{ ok?: string; error?: string; trabajo?: string }> };

/** Escala 1–5 como radios: sin JS y accesible con teclado. */
function Escala({
  name,
  titulo,
  leyenda,
}: {
  name: string;
  titulo: string;
  leyenda: (p: Puntaje) => string;
}) {
  return (
    <fieldset className={propios.grupo}>
      <legend className={propios.legend}>{titulo}</legend>
      <div className={propios.escala}>
      {PUNTAJES.map((p) => (
        <label key={p} className={propios.opcion}>
          <input type="radio" name={name} value={p} required />
          <span>{leyenda(p) ? `${p} · ${leyenda(p)}` : p}</span>
        </label>
      ))}
      </div>
    </fieldset>
  );
}

export default async function OpinarPage({ searchParams }: Props) {
  const quien = await exigirIdentidad();
  if (quien.rol !== "cliente") redirect("/tablero/");
  const cliente = quien.nombre;

  const { ok, error, trabajo } = await searchParams;
  const trabajoInicial = TRABAJOS.find((t) => t === trabajo) ?? "desarrollo";

  return (
    <>
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={`eyebrow ${styles.eyebrow}`}>Feedback</p>
            <h1 className={styles.h1}>{cliente}, ¿cómo salió el trabajo?</h1>
            <p className={styles.lead}>
              Terminamos una auditoría, un desarrollo o un pedido de soporte y quiero saber
              qué te sirvió y qué no. Son dos minutos y me sirven para el próximo trabajo.
            </p>
          </div>
        </header>

        <section className={styles.body} aria-label="Dejar feedback">
          <div className={`container ${styles.grid}`}>
            <form className={styles.form} action={crearFeedback}>
              <label className={styles.field}>
                <span>Qué trabajo estás calificando</span>
                <select name="trabajo" defaultValue={trabajoInicial} required>
                  {TRABAJOS.map((t) => (
                    <option key={t} value={t}>
                      {TRABAJO_ETIQUETAS[t]}
                    </option>
                  ))}
                </select>
              </label>

              <Escala
                name="puntaje"
                titulo="Puntaje general"
                leyenda={(p) => PUNTAJE_ETIQUETAS[p]}
              />

              <Escala
                name="recomienda"
                titulo="¿Nos recomendarías a otra empresa?"
                leyenda={(p) => (p === 1 ? "No" : p === 5 ? "Seguro" : "")}
              />

              <label className={styles.field}>
                <span>Comentario</span>
                <textarea
                  name="comentario"
                  required
                  maxLength={3000}
                  rows={6}
                  placeholder="Cómo fue trabajar juntos: tiempos, comunicación, si el resultado resolvió lo que necesitabas."
                />
              </label>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Lo que más te sirvió (opcional)</span>
                  <textarea name="destacado" maxLength={1000} rows={3} />
                </label>
                <label className={styles.field}>
                  <span>Lo que mejoraría (opcional)</span>
                  <textarea name="mejorar" maxLength={1000} rows={3} />
                </label>
              </div>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Tu nombre (opcional)</span>
                  <input name="nombre" type="text" maxLength={200} autoComplete="name" />
                </label>
                <label className={styles.field}>
                  <span>Tu email (opcional)</span>
                  <input name="email" type="email" maxLength={320} autoComplete="email" />
                </label>
              </div>
              <label className={propios.checkbox}>
                <input type="checkbox" name="publicar" value="1" />
                <span>
                  Autorizo a publicar este comentario como testimonio, con mi nombre y el de la
                  empresa. Sin esta marca queda sólo para uso interno.
                </span>
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
                  Gracias. Lo leo entero y te escribo si hay algo para charlar.
                </p>
              ) : null}
              <button type="submit" className={styles.submit}>
                Enviar feedback
              </button>
            </form>

            <aside className={styles.ayuda}>
              <h2 className={styles.ayudaTitle}>Qué me sirve más</h2>
              <ul className={styles.ayudaLista}>
                <li>Lo concreto: qué cambió en tu día a día después del trabajo.</li>
                <li>Lo que costó: tiempos, idas y vueltas, cosas poco claras.</li>
                <li>Lo que falta: lo que esperabas y no llegó.</li>
              </ul>
              <p className={styles.ayudaLista}>
                ¿Necesitás reportar un bug o pedir una mejora?{" "}
                <a className={propios.link} href="/pedidos/">
                  Cargalo en pedidos
                </a>
                .
              </p>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
