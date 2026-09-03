import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { identidad } from "@/lib/auth";
import { pedirAcceso } from "@/app/(privado)/acciones";
import styles from "./Entrar.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar" };

type Props = { searchParams: Promise<{ enviado?: string; error?: string; expirado?: string }> };

export default async function EntrarPage({ searchParams }: Props) {
  if (await identidad()) redirect("/");

  const { enviado, error, expirado } = await searchParams;

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.caja}>
        <h1 className={styles.h1}>Entrá a tu espacio</h1>
        <p className={styles.lead}>
          Poné tu email y te mando un link para entrar. No hay contraseña que recordar.
        </p>

        {expirado ? (
          <p className={styles.error} role="alert">
            Ese link ya se usó o venció. Pedí uno nuevo, tarda un segundo.
          </p>
        ) : null}

        <form className={styles.form} action={pedirAcceso}>
          <label className={styles.campo}>
            <span>Tu email</span>
            <input
              name="email"
              type="email"
              required
              maxLength={320}
              autoComplete="email"
              autoFocus
              placeholder="vos@tuempresa.com"
            />
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
              Si ese email tiene acceso, el link ya salió. Revisá tu correo, y el spam.
            </p>
          ) : null}
          <button type="submit" className={styles.submit}>
            Mandame el link
          </button>
        </form>

        <p className={styles.pie}>
          ¿Problemas? Escribime a <a href="mailto:info@molpo.ar">info@molpo.ar</a>.
        </p>
      </div>
    </div>
  );
}
