"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { site } from "@/lib/site";
import { trackEvent, type ContactPlacement } from "@/lib/analytics";
import styles from "./ContactForm.module.css";

type Props = {
  placement: ContactPlacement;
  compact?: boolean;
};

type Status = "idle" | "sending" | "ok" | "error";

export default function ContactForm({ placement, compact }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (status === "ok") successRef.current?.focus();
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo enviar");
      }
      setStatus("ok");
      form.reset();
      trackEvent({ name: "contact_click", method: "form", placement });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar");
    }
  }

  if (status === "ok") {
    return (
      <p className={styles.success} role="status" tabIndex={-1} ref={successRef}>
        Mensaje enviado. Te respondo personalmente a la brevedad.
      </p>
    );
  }

  return (
    <form className={`${styles.form} ${compact ? styles.compact : ""}`} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Nombre</span>
          <input name="nombre" type="text" required maxLength={200} autoComplete="name" />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" required maxLength={320} autoComplete="email" />
        </label>
      </div>
      <label className={styles.field}>
        <span>Empresa (opcional)</span>
        <input name="empresa" type="text" maxLength={200} autoComplete="organization" />
      </label>
      <label className={styles.field}>
        <span>Mensaje</span>
        <textarea
          name="mensaje"
          required
          maxLength={5000}
          rows={compact ? 4 : 6}
          placeholder="Contame qué sistema tenés y qué está fallando."
        />
      </label>
      {/* Honeypot: oculto para humanos, los bots lo completan */}
      <label className={styles.web} aria-hidden="true">
        Web
        <input name="web" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      {status === "error" ? (
        <p className={styles.error} role="alert">
          {errorMessage}. También podés escribirme directo a{" "}
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
