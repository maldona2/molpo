import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import {
  promedio,
  PUNTAJE_ETIQUETAS,
  TRABAJOS,
  TRABAJO_ETIQUETAS,
  type Trabajo,
} from "@/lib/feedback";
import { listFeedback } from "@/lib/feedback-db";
import admin from "@/app/(privado)/Panel.module.css";
import styles from "./Opiniones.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feedback (admin)",
  description: "Panel privado de feedback de clientes.",
  robots: { index: false, follow: false, nocache: true },
};

const fecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

type Props = { searchParams: Promise<{ trabajo?: string }> };

export default async function OpinionesPage({ searchParams }: Props) {
  await exigirAdmin();

  const { trabajo } = await searchParams;
  const filtro = TRABAJOS.find((t) => t === trabajo) as Trabajo | undefined;
  const todos = await listFeedback();
  const items = filtro ? todos.filter((f) => f.trabajo === filtro) : todos;

  const puntaje = promedio(items.map((f) => f.puntaje));
  const recomienda = promedio(items.map((f) => f.recomienda));

  return (
    <main className={`container ${admin.main}`}>
      <h1 className={admin.h1}>Feedback de clientes</h1>
      <nav className={admin.filtros} aria-label="Filtrar por trabajo">
        <a href="/opiniones/" className={!filtro ? admin.activo : undefined}>
          Todos ({todos.length})
        </a>
        {TRABAJOS.map((t) => (
          <a
            key={t}
            href={`/opiniones/?trabajo=${t}`}
            className={filtro === t ? admin.activo : undefined}
          >
            {TRABAJO_ETIQUETAS[t]} ({todos.filter((f) => f.trabajo === t).length})
          </a>
        ))}
        <a href="/tablero/">Ver tablero →</a>
        <a href="/clientes/">Gestionar clientes →</a>
      </nav>

      <p className={styles.resumen}>
        {puntaje === null
          ? "Todavía no hay respuestas."
          : `Puntaje promedio ${puntaje}/5 · Recomendación ${recomienda}/5 · ${items.length} respuesta(s)`}
      </p>

      <ul className={styles.lista}>
        {items.map((f) => (
          <li key={f.id} className={styles.item}>
            <div className={styles.cabecera}>
              <span className={styles.nota}>{f.puntaje}/5</span>
              <span className={styles.meta}>
                #{f.id} · {f.cliente} · {TRABAJO_ETIQUETAS[f.trabajo]} ·{" "}
                {PUNTAJE_ETIQUETAS[f.puntaje]} · Recomienda {f.recomienda}/5 ·{" "}
                {fecha.format(new Date(f.creado))}
                {f.publicar ? " · publicable" : ""}
              </span>
            </div>
            <p className={styles.comentario}>{f.comentario}</p>
            {f.destacado ? (
              <p className={styles.extra}>
                <strong>Lo que sirvió:</strong> {f.destacado}
              </p>
            ) : null}
            {f.mejorar ? (
              <p className={styles.extra}>
                <strong>A mejorar:</strong> {f.mejorar}
              </p>
            ) : null}
            {f.nombre || f.email ? (
              <p className={styles.extra}>{[f.nombre, f.email].filter(Boolean).join(" · ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
