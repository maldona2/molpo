import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listClientes } from "@/lib/clientes-db";
import { crear } from "@/app/(privado)/clientes/acciones";
import ClientesTable from "@/app/(privado)/clientes/ClientesTable";
import panel from "@/app/(privado)/Panel.module.css";
import styles from "./Clientes.module.css";

export const dynamic = "force-dynamic";

const APP_HOST = (process.env.APP_URL ?? "https://app.molpo.ar").replace(/^https?:\/\//, "");

export const metadata: Metadata = {
  title: "Clientes (admin)",
  description: "Alta y baja de clientes con acceso a soporte y feedback.",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function ClientesPage({ searchParams }: Props) {
  await exigirAdmin();

  const { ok, error } = await searchParams;
  const clientes = await listClientes();
  const activos = clientes.filter((c) => c.activo).length;

  return (
    <main className={`container ${panel.main}`}>
      <h1 className={panel.h1}>Clientes</h1>
      <p className={panel.bajada}>
        {activos} activo{activos === 1 ? "" : "s"} de {clientes.length} en total.
      </p>

      {error ? (
        <p className={panel.error} role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className={panel.ok} role="status">
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

      <ClientesTable
        appHost={APP_HOST}
        clientes={clientes.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          email: c.email,
          activo: c.activo,
          creado: c.creado.toISOString(),
        }))}
      />
    </main>
  );
}
