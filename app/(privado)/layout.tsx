import type { Metadata } from "next";
import { identidad } from "@/lib/auth";
import { salir } from "@/app/(privado)/acciones";
import styles from "./App.module.css";

export const metadata: Metadata = {
  title: { default: "molpo", template: "%s · molpo" },
  // El área privada no se indexa nunca, ni siquiera si el dominio se filtra.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const quien = await identidad();

  return (
    <div className={styles.shell}>
      <header className={styles.barra}>
        <div className={`container ${styles.barraInner}`}>
          <a href="/" className={styles.marca} aria-label="molpo — inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/molpo-blanco.png" alt="molpo" width={62} height={22} />
          </a>

          {quien ? (
            <nav className={styles.links} aria-label="Secciones">
              {quien.rol === "admin" ? (
                <>
                  <a href="/tablero/">Tablero</a>
                  <a href="/clientes/">Clientes</a>
                  <a href="/opiniones/">Feedback</a>
                </>
              ) : (
                <>
                  <a href="/tablero/">Mis pedidos</a>
                  <a href="/pedidos/">Cargar pedido</a>
                  <a href="/opinar/">Dejar feedback</a>
                </>
              )}
            </nav>
          ) : null}

          {quien ? (
            <form action={salir} className={styles.salir}>
              <span className={styles.quien}>
                {quien.rol === "admin" ? "Admin" : quien.nombre}
              </span>
              <button type="submit">Salir</button>
            </form>
          ) : null}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
