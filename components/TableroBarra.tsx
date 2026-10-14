"use client";

import { useEffect, type RefObject } from "react";
import { ETIQUETAS, PRIORIDADES, TIPOS } from "@/lib/tickets";
import {
  ATAJOS,
  ATAJOS_ADMIN,
  ETIQUETAS_ATAJO,
  ETIQUETAS_ORDEN,
  ORDENES,
  cumpleAtajo,
  type Filtros,
  type Orden,
  type TarjetaTablero,
} from "@/lib/tablero";
import styles from "./Tablero.module.css";

type Props = {
  tickets: TarjetaTablero[];
  filtros: Filtros;
  cambiar: (parcial: Partial<Filtros>) => void;
  limpiar: () => void;
  esAdmin: boolean;
  ahora: number;
  visibles: number;
  filtrando: boolean;
  menu: string | null;
  setMenu: (menu: string | null) => void;
  buscador: RefObject<HTMLInputElement | null>;
};

const alternar = <T,>(lista: T[], valor: T): T[] =>
  lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

export default function TableroBarra({
  tickets,
  filtros,
  cambiar,
  limpiar,
  esAdmin,
  ahora,
  visibles,
  filtrando,
  menu,
  setMenu,
  buscador,
}: Props) {
  // Click afuera de un menú abierto lo cierra.
  useEffect(() => {
    if (!menu) return;
    function afuera(e: PointerEvent) {
      if (!(e.target instanceof Element && e.target.closest("[data-menu]"))) setMenu(null);
    }
    document.addEventListener("pointerdown", afuera);
    return () => document.removeEventListener("pointerdown", afuera);
  }, [menu, setMenu]);

  // Los contadores son sobre el total, no sobre lo filtrado: dicen cuántos hay de cada cosa.
  const cuenta = (test: (t: TarjetaTablero) => boolean) => tickets.filter(test).length;
  // Un cliente elegido que ya no tiene pedidos (link viejo) igual aparece, para poder destildarlo.
  const clientes = [...new Set([...tickets.map((t) => t.cliente), ...filtros.clientes])].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const menuProps = { menu, setMenu };

  return (
    <div className={styles.barra}>
      <input
        ref={buscador}
        type="search"
        className={styles.buscador}
        value={filtros.q}
        onChange={(e) => cambiar({ q: e.target.value })}
        placeholder={esAdmin ? "Buscar por título, #id, cliente o quién reporta" : "Buscar por título o #id"}
        aria-label="Buscar pedidos"
        maxLength={200}
      />

      {esAdmin ? (
        <Multi
          id="cliente"
          etiqueta="Cliente"
          elegidos={filtros.clientes}
          onCambio={(clientes) => cambiar({ clientes })}
          opciones={clientes.map((c) => ({ valor: c, etiqueta: c, cuenta: cuenta((t) => t.cliente === c) }))}
          {...menuProps}
        />
      ) : null}
      <Multi
        id="tipo"
        etiqueta="Tipo"
        elegidos={filtros.tipos}
        onCambio={(tipos) => cambiar({ tipos })}
        opciones={TIPOS.map((v) => ({ valor: v, etiqueta: ETIQUETAS[v], cuenta: cuenta((t) => t.tipo === v) }))}
        {...menuProps}
      />
      <Multi
        id="prio"
        etiqueta="Prioridad"
        punto
        elegidos={filtros.prioridades}
        onCambio={(prioridades) => cambiar({ prioridades })}
        opciones={[...PRIORIDADES].reverse().map((v) => ({
          valor: v,
          etiqueta: ETIQUETAS[v],
          cuenta: cuenta((t) => t.prioridad === v),
        }))}
        {...menuProps}
      />

      <select
        className={styles.orden}
        aria-label="Orden"
        value={filtros.orden}
        onChange={(e) => cambiar({ orden: e.target.value as Orden })}
      >
        {ORDENES.map((o) => (
          <option key={o} value={o}>
            {ETIQUETAS_ORDEN[o]}
          </option>
        ))}
      </select>

      <div className={styles.atajos} role="group" aria-label="Atajos">
        {ATAJOS.filter((a) => esAdmin || !ATAJOS_ADMIN.includes(a)).map((a) => (
          <button
            key={a}
            type="button"
            className={styles.chip}
            aria-pressed={filtros.atajos.includes(a)}
            onClick={() => cambiar({ atajos: alternar(filtros.atajos, a) })}
          >
            {ETIQUETAS_ATAJO[a]} <span className={styles.chipCuenta}>{cuenta((t) => cumpleAtajo(a, t, ahora))}</span>
          </button>
        ))}
      </div>

      {filtrando ? (
        <p className={styles.mostrando}>
          {visibles} de {tickets.length}
          <button type="button" className={styles.limpiar} onClick={limpiar}>
            Limpiar filtros
          </button>
        </p>
      ) : null}

      <div className={styles.vistas} role="group" aria-label="Vista">
        <button type="button" aria-pressed={filtros.vista === "tablero"} onClick={() => cambiar({ vista: "tablero" })}>
          Tablero
        </button>
        <button type="button" aria-pressed={filtros.vista === "lista"} onClick={() => cambiar({ vista: "lista" })}>
          Lista
        </button>
      </div>
    </div>
  );
}

type Opcion<T extends string> = { valor: T; etiqueta: string; cuenta: number };

function Multi<T extends string>({
  id,
  etiqueta,
  opciones,
  elegidos,
  onCambio,
  punto,
  menu,
  setMenu,
}: {
  id: string;
  etiqueta: string;
  opciones: Opcion<T>[];
  elegidos: T[];
  onCambio: (elegidos: T[]) => void;
  punto?: boolean;
  menu: string | null;
  setMenu: (menu: string | null) => void;
}) {
  const abierto = menu === id;
  return (
    <div className={styles.menu} data-menu>
      <button
        type="button"
        className={styles.menuBoton}
        data-activo={elegidos.length > 0 || undefined}
        aria-expanded={abierto}
        onClick={() => setMenu(abierto ? null : id)}
      >
        {etiqueta}
        {elegidos.length > 0 ? <span className={styles.badge}>{elegidos.length}</span> : null}
      </button>
      {abierto ? (
        <div className={styles.menuPanel} role="group" aria-label={etiqueta}>
          {opciones.map((o) => (
            <label key={o.valor} className={styles.menuOpcion}>
              <input
                type="checkbox"
                checked={elegidos.includes(o.valor)}
                onChange={() => onCambio(alternar(elegidos, o.valor))}
              />
              {punto ? <span className={styles.punto} data-prioridad={o.valor} aria-hidden /> : null}
              <span className={styles.menuEtiqueta}>{o.etiqueta}</span>
              <span className={styles.menuCuenta}>{o.cuenta}</span>
            </label>
          ))}
          <button type="button" className={styles.menuLimpiar} onClick={() => onCambio([])}>
            Limpiar
          </button>
        </div>
      ) : null}
    </div>
  );
}
