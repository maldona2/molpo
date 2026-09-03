import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listClientes } from "@/lib/clientes-db";
import { crear, cerrarSesiones, cambiarEstado } from "@/app/(privado)/clientes/acciones";
import admin from "@/app/(privado)/Panel.module.css";
import styles from "./Clientes.module.css";

export const dynamic = "force-dynamic";

const APP_HOST = (process.env.APP_URL ?? "https://app.molpo.ar").replace(/^https?:\/\//, "");

export const metadata: Metadata = {
  title: "Clientes (admin)",
  description: "Alta y baja de clientes con acceso a soporte y feedback.",
  robots: { index: false, follow: false, nocache: true },
};

const fecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function ClientesPage({ searchParams }: Props) {
  await exigirAdmin();

  const { ok, error } = await searchParams;
  const clientes = await listClientes();

  return (
    <main className={`container ${admin.main}`}>
      <h1 className={admin.h1}>Clientes</h1>
      <nav className={admin.filtros} aria-label="Otros paneles">
        <a href="/tablero/">Ver tablero →</a>
        <a href="/opiniones/">Ver feedback →</a>
      </nav>
      {error ? (
        <p className={admin.error} role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className={admin.ok} role="status">
          Listo.
        </p>
      ) : null}

      <form className={styles.alta} action={crear}>
        <label className={styles.campo}>
          <span>Nuevo cliente</span>
          <input name="nombre" type="text" required maxLength={200} placeholder="Acme SA" />
        </label>
        <label className={styles.campo}>
          <span>Email (para que pida su link solo)</span>
          <input name="email" type="email" maxLength={320} placeholder="vos@acme.com" />
        </label>
        <button type="submit" className={styles.boton}>
          Crear
        </button>
      </form>

      <ul className={styles.lista}>
        {clientes.map((cliente) => (
            <li key={cliente.id} className={styles.item}>
              <div className={styles.cabecera}>
                <span className={cliente.activo ? styles.activo : styles.inactivo}>
                  {cliente.activo ? "Activo" : "De baja"}
                </span>
                <span className={styles.meta}>
                  {cliente.nombre} · alta {fecha.format(new Date(cliente.creado))}
                  {cliente.email ? ` · ${cliente.email}` : " · sin email"}
                </span>
              </div>

              <p className={styles.acceso}>
                {cliente.email
                  ? `Entra en ${APP_HOST} con ${cliente.email}`
                  : "Sin email cargado: no puede pedir su link para entrar."}
              </p>

              <div className={styles.acciones}>
                <form action={cerrarSesiones}>
                  <input type="hidden" name="id" value={cliente.id} />
                  <button type="submit">Cerrar sus sesiones</button>
                </form>
                <form action={cambiarEstado}>
                            <input type="hidden" name="id" value={cliente.id} />
                  <input type="hidden" name="activo" value={cliente.activo ? "0" : "1"} />
                  <button type="submit">{cliente.activo ? "Dar de baja" : "Reactivar"}</button>
                </form>
              </div>
            </li>
        ))}
      </ul>
    </main>
  );
}
