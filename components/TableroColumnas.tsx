"use client";

import { useState, type MouseEvent } from "react";
import { ETIQUETAS, type Estado } from "@/lib/tickets";
import { COLUMNAS, diasDesde, edad, estancado, vivo, type TarjetaTablero } from "@/lib/tablero";
import styles from "./Tablero.module.css";

/** Click común abre el panel; con modificador o rueda sigue siendo el link a la página completa. */
export function abrirSinSalir(e: MouseEvent, abrir?: () => void) {
  if (!abrir || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  abrir();
}

/** Click en cualquier parte de la tarjeta o la fila, salvo en sus links y botones. */
export function abrirDesdeFondo(e: MouseEvent, abrir?: () => void) {
  if (abrir && !(e.target instanceof Element && e.target.closest("a, button, input"))) abrir();
}

type Props = {
  tickets: TarjetaTablero[];
  visibles: TarjetaTablero[];
  filtrando: boolean;
  colapsadas: Partial<Record<Estado, boolean>>;
  onColapsar: (estado: Estado) => void;
  esAdmin: boolean;
  ahora: number;
  abierto?: number | null;
  onAbrir?: (id: number) => void;
  onMover?: (id: number, estado: Estado) => void;
};

export default function TableroColumnas({
  tickets,
  visibles,
  filtrando,
  colapsadas,
  onColapsar,
  esAdmin,
  ahora,
  abierto,
  onAbrir,
  onMover,
}: Props) {
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<Estado | null>(null);
  const soltar = () => {
    setArrastrando(null);
    setSobre(null);
  };
  const arrastrable = esAdmin && Boolean(onMover);

  return (
    <div className={styles.tablero} onDragEnd={soltar}>
      {COLUMNAS.map((estado) => {
        const tarjetas = visibles.filter((t) => t.estado === estado);
        const total = tickets.filter((t) => t.estado === estado).length;
        const altas = tarjetas.filter((t) => t.prioridad === "alta" && vivo(t)).length;
        const colapsada = Boolean(colapsadas[estado]);
        const etiqueta = ETIQUETAS[estado];
        return (
          <section
            key={estado}
            className={styles.columna}
            data-colapsada={colapsada || undefined}
            data-sobre={sobre === estado || undefined}
            aria-label={etiqueta}
            // Sólo se acepta lo que se arrastró desde este tablero: un link o
            // un archivo soltado desde afuera no mueve nada.
            onDragOver={(e) => {
              if (arrastrando === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setSobre(estado);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setSobre((s) => (s === estado ? null : s));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = arrastrando;
              soltar();
              if (id !== null) onMover?.(id, estado);
            }}
          >
            <header className={styles.columnaCabecera}>
              <span className={styles.punto} data-estado={estado} aria-hidden />
              <h2 className={styles.columnaTitulo}>{etiqueta}</h2>
              <span className={styles.cuenta}>{filtrando ? `${tarjetas.length} de ${total}` : total}</span>
              {altas > 0 ? (
                <span className={styles.altas}>
                  {altas} alta{altas > 1 ? "s" : ""}
                </span>
              ) : null}
              <button
                type="button"
                className={styles.colapsar}
                aria-expanded={!colapsada}
                aria-label={`${colapsada ? "Expandir" : "Colapsar"} ${etiqueta}`}
                onClick={() => onColapsar(estado)}
              >
                {colapsada ? "+" : "−"}
              </button>
            </header>
            {colapsada ? null : (
              <ul className={styles.pila}>
                {tarjetas.map((t) => (
                  <Tarjeta
                    key={t.id}
                    t={t}
                    esAdmin={esAdmin}
                    ahora={ahora}
                    seleccionada={abierto === t.id}
                    arrastrable={arrastrable}
                    arrastrada={arrastrando === t.id}
                    onArrastrar={() => setArrastrando(t.id)}
                    onAbrir={onAbrir && (() => onAbrir(t.id))}
                  />
                ))}
                {tarjetas.length === 0 ? (
                  <li className={styles.vacia}>
                    {arrastrando !== null ? "Soltá acá" : filtrando ? "Nada con estos filtros" : "Nada acá"}
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Tarjeta({
  t,
  esAdmin,
  ahora,
  seleccionada,
  arrastrable,
  arrastrada,
  onArrastrar,
  onAbrir,
}: {
  t: TarjetaTablero;
  esAdmin: boolean;
  ahora: number;
  seleccionada: boolean;
  arrastrable: boolean;
  arrastrada: boolean;
  onArrastrar: () => void;
  onAbrir?: () => void;
}) {
  const dias = diasDesde(t.actividad, ahora);
  return (
    <li
      className={styles.tarjeta}
      data-seleccionada={seleccionada || undefined}
      data-arrastrada={arrastrada || undefined}
      draggable={arrastrable}
      onDragStart={(e) => {
        if (!arrastrable) return;
        e.dataTransfer.effectAllowed = "move";
        // Firefox no arranca el drag sin datos; el id real viaja en el estado.
        e.dataTransfer.setData("text/plain", String(t.id));
        onArrastrar();
      }}
      onClick={(e) => abrirDesdeFondo(e, onAbrir)}
    >
      <div className={styles.tarjetaMeta}>
        <span
          className={styles.punto}
          data-prioridad={t.prioridad}
          title={`Prioridad ${ETIQUETAS[t.prioridad].toLowerCase()}`}
        />
        <span>
          #{t.id} · {ETIQUETAS[t.tipo]}
        </span>
        {t.externa !== null ? (
          <a className={styles.badgeExterno} href={t.externa} target="_blank" rel="noopener noreferrer">
            KOMUK Hub
          </a>
        ) : null}
      </div>
      {esAdmin ? <p className={styles.tarjetaCliente}>{t.cliente}</p> : null}
      <p className={styles.tarjetaTitulo}>
        <a href={`/tablero/${t.id}/`} draggable={false} onClick={(e) => abrirSinSalir(e, onAbrir)}>
          {t.titulo}
        </a>
      </p>
      <p className={styles.tarjetaPie}>
        <span>{edad(dias)}</span>
        {t.adjuntos.length > 0 ? (
          <span>
            {t.adjuntos.length} captura{t.adjuntos.length > 1 ? "s" : ""}
          </span>
        ) : null}
        {t.respuesta ? <span>Respondido</span> : null}
      </p>
      {estancado(t, ahora) ? <p className={styles.estancado}>Sin movimiento hace {dias} d</p> : null}
    </li>
  );
}
