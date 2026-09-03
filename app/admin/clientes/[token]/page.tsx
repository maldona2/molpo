import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { esAdmin } from "@/lib/tickets";
import { listClientes } from "@/lib/clientes-db";
import { site } from "@/lib/site";
import { crear, rotar, cambiarEstado } from "@/app/admin/clientes/actions";
import admin from "@/app/admin/soporte/[token]/AdminSoporte.module.css";
import styles from "./Clientes.module.css";

export const dynamic = "force-dynamic";

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

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
};

export default async function AdminClientesPage({ params, searchParams }: Props) {
  const { token } = await params;
  if (!esAdmin(token)) notFound();

  const { ok, error } = await searchParams;
  const clientes = await listClientes();

  return (
    <main className={`container ${admin.main}`}>
      <h1 className={admin.h1}>Clientes</h1>
      <nav className={admin.filtros} aria-label="Otros paneles">
        <a href={`/admin/soporte/${token}/`}>Ver pedidos de soporte →</a>
        <a href={`/admin/feedback/${token}/`}>Ver feedback →</a>
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
        <input type="hidden" name="token" value={token} />
        <label className={styles.campo}>
          <span>Nuevo cliente</span>
          <input name="nombre" type="text" required maxLength={200} placeholder="Acme SA" />
        </label>
        <button type="submit" className={styles.boton}>
          Crear
        </button>
      </form>

      <ul className={styles.lista}>
        {clientes.map((cliente) => {
          const soporteUrl = `${site.url}/soporte/${cliente.token}/`;
          const feedbackUrl = `${site.url}/feedback/${cliente.token}/`;
          return (
            <li key={cliente.id} className={styles.item}>
              <div className={styles.cabecera}>
                <span className={cliente.activo ? styles.activo : styles.inactivo}>
                  {cliente.activo ? "Activo" : "De baja"}
                </span>
                <span className={styles.meta}>
                  {cliente.nombre} · alta {fecha.format(new Date(cliente.creado))}
                </span>
              </div>

              <label className={styles.link}>
                <span>Link de soporte</span>
                <input type="text" readOnly value={soporteUrl} />
              </label>
              <label className={styles.link}>
                <span>Link de feedback</span>
                <input type="text" readOnly value={feedbackUrl} />
              </label>

              <div className={styles.acciones}>
                <form action={rotar}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="id" value={cliente.id} />
                  <button type="submit">Rotar token</button>
                </form>
                <form action={cambiarEstado}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="id" value={cliente.id} />
                  <input type="hidden" name="activo" value={cliente.activo ? "0" : "1"} />
                  <button type="submit">{cliente.activo ? "Dar de baja" : "Reactivar"}</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
