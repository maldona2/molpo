"use client";

import { ETIQUETAS } from "@/lib/tickets";
import { diasDesde, edad, estancado, type TarjetaTablero } from "@/lib/tablero";
import { abrirDesdeFondo, abrirSinSalir } from "@/components/TableroColumnas";
import styles from "./Tablero.module.css";

type Props = {
  visibles: TarjetaTablero[];
  filtrando: boolean;
  esAdmin: boolean;
  ahora: number;
  abierto?: number | null;
  onAbrir?: (id: number) => void;
};

export default function TableroLista({ visibles, filtrando, esAdmin, ahora, abierto, onAbrir }: Props) {
  if (visibles.length === 0) {
    return (
      <p className={styles.listaVacia}>
        {filtrando ? "Nada con estos filtros." : "Todavía no hay pedidos."}
      </p>
    );
  }
  return (
    <div className={styles.listaMarco}>
      <table className={styles.lista}>
        <thead>
          <tr>
            <th className={styles.colId}>#</th>
            <th>Título</th>
            {esAdmin ? <th className={styles.colCliente}>Cliente</th> : null}
            <th className={styles.colTipo}>Tipo</th>
            <th className={styles.colPrio}>Prioridad</th>
            <th className={styles.colEstado}>Estado</th>
            <th className={styles.colActividad}>Actividad</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((t) => {
            const abrir = onAbrir && (() => onAbrir(t.id));
            return (
              <tr
                key={t.id}
                data-seleccionada={abierto === t.id || undefined}
                onClick={(e) => abrirDesdeFondo(e, abrir)}
              >
                <td>#{t.id}</td>
                <td>
                  <a href={`/tablero/${t.id}/`} onClick={(e) => abrirSinSalir(e, abrir)}>
                    {t.titulo}
                  </a>
                  {t.externa !== null ? <span className={styles.badgeExterno}>KOMUK Hub</span> : null}
                </td>
                {esAdmin ? <td>{t.cliente}</td> : null}
                <td>{ETIQUETAS[t.tipo]}</td>
                <td>
                  <span className={styles.conPunto}>
                    <span className={styles.punto} data-prioridad={t.prioridad} aria-hidden />
                    {ETIQUETAS[t.prioridad]}
                  </span>
                </td>
                <td>
                  <span className={styles.conPunto}>
                    <span className={styles.punto} data-estado={t.estado} aria-hidden />
                    {ETIQUETAS[t.estado]}
                  </span>
                </td>
                <td className={styles.actividad} data-estancado={estancado(t, ahora) || undefined}>
                  {edad(diasDesde(t.actividad, ahora))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
