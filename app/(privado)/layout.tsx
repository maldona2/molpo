import type { Metadata } from "next";
import { identidad } from "@/lib/auth";
import { salir } from "@/app/(privado)/acciones";
import NavLinks from "@/components/NavLinks";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./App.module.css";

export const metadata: Metadata = {
  title: { default: "molpo", template: "%s · molpo" },
  // El área privada no se indexa nunca, ni siquiera si el dominio se filtra.
  robots: { index: false, follow: false, nocache: true },
};

const NAV_ADMIN = [
  { href: "/tablero/", label: "Tablero" },
  { href: "/clientes/", label: "Clientes" },
  { href: "/opiniones/", label: "Feedback" },
];
const NAV_CLIENTE = [
  { href: "/tablero/", label: "Mis pedidos" },
  { href: "/pedidos/", label: "Cargar pedido" },
  { href: "/opinar/", label: "Dejar feedback" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const quien = await identidad();
  const nav = quien?.rol === "admin" ? NAV_ADMIN : NAV_CLIENTE;

  return (
    <div className={`${styles.shell} ${quien ? "" : styles.shellSolo}`}>
      {quien ? (
        <aside className={styles.sidebar}>
          <a href="/" className={styles.marca} aria-label="molpo — inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/molpo-blanco.png" alt="molpo" width={68} height={24} />
          </a>

          <NavLinks items={nav} />

          <form action={salir} className={styles.cuenta}>
            <div className={styles.quien}>
              <span className={styles.quienRol}>{quien.rol === "admin" ? "Admin" : "Cliente"}</span>
              <span className={styles.quienNombre}>{quien.rol === "admin" ? "molpo" : quien.nombre}</span>
            </div>
            <div className={styles.acciones}>
              <ThemeToggle className={styles.tema} />
              <button type="submit" className={styles.salirBtn}>
                Salir
              </button>
            </div>
          </form>
        </aside>
      ) : null}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
