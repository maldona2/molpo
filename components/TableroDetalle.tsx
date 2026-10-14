"use client";

import { useState } from "react";
import { ETIQUETAS, LIMITE_RESPUESTA, type Estado } from "@/lib/tickets";
import { COLUMNAS, diasDesde, edad, estancado, type TarjetaTablero } from "@/lib/tablero";
import styles from "./Tablero.module.css";

// Zona horaria fija: el texto es el mismo en el server y en cualquier navegador.
const fecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

type Props = {
  t: TarjetaTablero;
  esAdmin: boolean;
  ahora: number;
  /** i = -1 cuando el pedido abierto ya no pasa los filtros. */
  posicion: { i: number; n: number };
  onCerrar: () => void;
  onPaso: (delta: number) => void;
  onMover: (estado: Estado) => void;
  onResponder: (texto: string) => void;
};

export default function TableroDetalle({ t, esAdmin, ahora, posicion, onCerrar, onPaso, onMover, onResponder }: Props) {
  const [borrador, setBorrador] = useState(t.respuesta ?? "");
  const hayCambios = borrador.trim() !== (t.respuesta ?? "");
  const dias = diasDesde(t.actividad, ahora);
  const tituloId = `detalle-${t.id}`;

  return (
    <aside className={styles.detalle} role="dialog" aria-labelledby={tituloId}>
      <header className={styles.detalleCabecera}>
        <span>
          #{t.id} · {ETIQUETAS[t.tipo]}
        </span>
        <span className={styles.prioridadTexto} data-prioridad={t.prioridad}>
          {ETIQUETAS[t.prioridad]}
        </span>
        <span className={styles.conPunto}>
          <span className={styles.punto} data-estado={t.estado} aria-hidden />
          {ETIQUETAS[t.estado]}
        </span>
        {t.externa !== null ? (
          <a className={styles.badgeExterno} href={t.externa} target="_blank" rel="noopener noreferrer">
            KOMUK Hub
          </a>
        ) : null}
        <div className={styles.detalleAcciones}>
          <button
            type="button"
            className={styles.iconoBoton}
            aria-label="Anterior"
            disabled={posicion.i <= 0}
            onClick={() => onPaso(-1)}
          >
            ↑
          </button>
          <span>{posicion.i >= 0 ? `${posicion.i + 1} de ${posicion.n}` : "fuera del filtro"}</span>
          <button
            type="button"
            className={styles.iconoBoton}
            aria-label="Siguiente"
            disabled={posicion.i >= posicion.n - 1}
            onClick={() => onPaso(1)}
          >
            ↓
          </button>
          {/* autoFocus: el foco entra al panel, y j/k/Esc funcionan sin tocar el mouse. */}
          <button type="button" className={styles.iconoBoton} aria-label="Cerrar" autoFocus onClick={onCerrar}>
            ×
          </button>
        </div>
      </header>

      <h2 id={tituloId} className={styles.detalleTitulo}>
        {t.titulo}
      </h2>
      <a className={styles.completa} href={`/tablero/${t.id}/`}>
        Abrir página completa
      </a>

      <p className={styles.detalleTexto} style={{ marginTop: 12 }}>
        {t.detalle}
      </p>
      {estancado(t, ahora) ? <p className={styles.estancado}>Sin movimiento hace {dias} días</p> : null}

      <dl className={styles.campos}>
        {esAdmin ? (
          <>
            <dt>Cliente</dt>
            <dd>{t.cliente}</dd>
          </>
        ) : null}
        <dt>Reporta</dt>
        <dd>{t.reporta ?? "—"}</dd>
        <dt>Email</dt>
        <dd>{t.email ?? "—"}</dd>
        <dt>URL</dt>
        <dd>{t.url ?? "—"}</dd>
        <dt>Creado</dt>
        <dd>{fecha.format(t.creado)}</dd>
        <dt>Última actividad</dt>
        <dd>
          {fecha.format(t.actividad)} ({edad(dias)})
        </dd>
      </dl>

      {t.adjuntos.length > 0 ? (
        <section className={styles.seccion}>
          <h3 className={styles.h3}>Capturas ({t.adjuntos.length})</h3>
          <ul className={styles.capturas}>
            {t.adjuntos.map((a) => (
              <li key={a.id}>
                <a href={`/adjuntos/${a.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/adjuntos/${a.id}`} alt={a.nombre} loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {esAdmin ? (
        <>
          <section className={styles.seccion}>
            <h3 className={styles.h3}>Estado</h3>
            <div className={styles.segmentado}>
              {COLUMNAS.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  aria-pressed={t.estado === estado}
                  onClick={() => onMover(estado)}
                >
                  {ETIQUETAS[estado]}
                </button>
              ))}
            </div>
          </section>
          <section className={styles.seccion}>
            <h3 className={styles.h3}>Respuesta</h3>
            <textarea
              className={styles.respuesta}
              aria-label="Respuesta para el cliente"
              rows={5}
              maxLength={LIMITE_RESPUESTA}
              value={borrador}
              placeholder="Qué le contás al cliente sobre este pedido."
              onChange={(e) => setBorrador(e.target.value)}
            />
            <button type="button" className={styles.guardar} disabled={!hayCambios} onClick={() => onResponder(borrador)}>
              Guardar
            </button>
            {t.email ? <p className={styles.nota}>Le llega por mail a {t.email}</p> : null}
          </section>
        </>
      ) : t.respuesta ? (
        <section className={styles.seccion}>
          <h3 className={styles.h3}>Respuesta</h3>
          <p className={styles.detalleTexto}>{t.respuesta}</p>
        </section>
      ) : null}
    </aside>
  );
}
