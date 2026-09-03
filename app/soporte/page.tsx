import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { pedirLink } from "@/app/soporte/acceso";
import styles from "./[token]/Soporte.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Soporte",
  description: "Pedí el acceso a tu tablero de soporte.",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { searchParams: Promise<{ enviado?: string; error?: string }> };

export default async function AccesoSoportePage({ searchParams }: Props) {
  const { enviado, error } = await searchParams;

  return (
    <>
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={`eyebrow ${styles.eyebrow}`}>Soporte</p>
            <h1 className={styles.h1}>Entrá a tu tablero.</h1>
            <p className={styles.lead}>
              Cada cliente tiene un link propio. Poné tu email y te lo mando: no hay
              contraseña que recordar.
            </p>
          </div>
        </header>

        <section className={styles.body} aria-label="Pedir acceso">
          <div className={`container ${styles.grid}`}>
            <form className={styles.form} action={pedirLink}>
              <label className={styles.field}>
                <span>Tu email</span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={320}
                  autoComplete="email"
                  placeholder="vos@tuempresa.com"
                />
                <small className={styles.ayudaCampo}>
                  Tiene que ser el mismo que me diste cuando arrancamos a trabajar.
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
              {enviado ? (
                <p className={styles.ok} role="status">
                  Si ese email es de un cliente, ya salió el link. Revisá tu correo.
                </p>
              ) : null}
              <button type="submit" className={styles.submit}>
                Mandame el link
              </button>
            </form>

            <aside className={styles.ayuda}>
              <h2 className={styles.ayudaTitle}>¿No llega?</h2>
              <ul className={styles.ayudaLista}>
                <li>Fijate en spam: sale desde info@molpo.ar.</li>
                <li>Puede que tenga otro email tuyo anotado.</li>
                <li>Escribime a info@molpo.ar y lo resolvemos.</li>
              </ul>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
