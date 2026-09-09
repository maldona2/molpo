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
import panel from "@/app/(privado)/Panel.module.css";
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
    <main className={`container ${panel.main}`}>
      <h1 className={panel.h1}>Feedback de clientes</h1>

      <div className={panel.stats}>
        <div className={panel.stat}>
          <span className={panel.statValor}>{puntaje ?? "—"}</span>
          <span className={panel.statEtiqueta}>Puntaje promedio / 5</span>
        </div>
        <div className={panel.stat}>
          <span className={panel.statValor}>{recomienda ?? "—"}</span>
          <span className={panel.statEtiqueta}>Recomendación promedio / 5</span>
        </div>
        <div className={panel.stat}>
          <span className={panel.statValor}>{items.length}</span>
          <span className={panel.statEtiqueta}>Respuestas</span>
        </div>
      </div>

      <nav className={panel.filtros} aria-label="Filtrar por trabajo">
        <a href="/opiniones/" className={!filtro ? panel.activo : undefined}>
          Todos ({todos.length})
        </a>
        {TRABAJOS.map((t) => (
          <a
            key={t}
            href={`/opiniones/?trabajo=${t}`}
            className={filtro === t ? panel.activo : undefined}
          >
            {TRABAJO_ETIQUETAS[t]} ({todos.filter((f) => f.trabajo === t).length})
          </a>
        ))}
        <a href="/tablero/" className={panel.aparte}>
          Ver tablero →
        </a>
        <a href="/clientes/" className={panel.aparte}>
          Gestionar clientes →
        </a>
      </nav>

      <ul className={styles.lista}>
        {items.map((f) => (
          <li key={f.id} className={styles.item}>
            <div className={styles.nota} data-nota={f.puntaje}>
              {f.puntaje}
            </div>
            <div className={styles.cuerpo}>
              <div className={styles.cabecera}>
                <span className={styles.cliente}>{f.cliente}</span>
                <span className={styles.meta}>
                  {TRABAJO_ETIQUETAS[f.trabajo]} · {PUNTAJE_ETIQUETAS[f.puntaje]} · Recomienda{" "}
                  {f.recomienda}/5 · {fecha.format(new Date(f.creado))}
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
                <p className={styles.contacto}>{[f.nombre, f.email].filter(Boolean).join(" · ")}</p>
              ) : null}
            </div>
          </li>
        ))}
        {items.length === 0 ? <li className={styles.vacio}>Todavía no hay respuestas.</li> : null}
      </ul>
    </main>
  );
}
