"use client";

import { useState } from "react";
import { RESOLVER_URL } from "@/lib/resolver";
import styles from "./ResolverConGrok.module.css";

type Props = { cliente: string; prompt: string };

type Estado =
  | { tipo: "idle" }
  | { tipo: "pendiente" }
  | { tipo: "ok"; carpeta: string }
  | { tipo: "sin_helper" }
  | { tipo: "cancelado" }
  | { tipo: "error"; detalle: string }
  | { tipo: "copiado" };

function nombreCarpeta(cwd: string): string {
  return cwd.split("/").filter(Boolean).pop() ?? cwd;
}

export default function ResolverConGrok({ cliente, prompt }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt);
      setEstado({ tipo: "copiado" });
    } catch {
      setEstado({ tipo: "error", detalle: "No pude copiar el prompt." });
    }
  }

  async function resolver() {
    setEstado({ tipo: "pendiente" });
    try {
      const respuesta = await fetch(`${RESOLVER_URL}/abrir`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cliente, prompt }),
      });
      if (!respuesta.ok) {
        setEstado({ tipo: "error", detalle: "El helper rechazó el pedido." });
        return;
      }
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        cwd?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.cwd) {
        setEstado({ tipo: "ok", carpeta: nombreCarpeta(cuerpo.cwd) });
        return;
      }
      if (cuerpo.error === "cancelado") {
        setEstado({ tipo: "cancelado" });
        return;
      }
      setEstado({ tipo: "error", detalle: "No se pudo abrir Terminal." });
    } catch {
      setEstado({ tipo: "sin_helper" });
    }
  }

  const mostrarCopia = estado.tipo === "sin_helper" || estado.tipo === "error";

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.boton}
        onClick={resolver}
        disabled={estado.tipo === "pendiente"}
      >
        {estado.tipo === "pendiente" ? "Abriendo…" : "Resolver con Grok"}
      </button>
      {estado.tipo === "ok" ? (
        <p className={styles.ok} role="status">
          Abierto en {estado.carpeta}
        </p>
      ) : null}
      {estado.tipo === "sin_helper" ? (
        <p className={styles.aviso} role="status">
          El helper no está corriendo. Copiá el prompt o instalalo con{" "}
          <code>pnpm resolver:install</code>.
        </p>
      ) : null}
      {estado.tipo === "cancelado" ? (
        <p className={styles.aviso} role="status">
          No elegiste la carpeta del repo.
        </p>
      ) : null}
      {estado.tipo === "error" ? (
        <p className={styles.aviso} role="status">
          {estado.detalle}
        </p>
      ) : null}
      {estado.tipo === "copiado" ? (
        <p className={styles.ok} role="status">
          Prompt copiado.
        </p>
      ) : null}
      {mostrarCopia ? (
        <button type="button" className={styles.secundario} onClick={copiar}>
          Copiar prompt
        </button>
      ) : null}
    </div>
  );
}
