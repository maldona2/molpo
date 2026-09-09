import { moverTicket } from "@/app/(privado)/tablero/acciones";
import styles from "./Tablero.module.css";

export type TarjetaData = {
  id: number;
  titulo: string;
  tipo: string;
  prioridad: string;
  prioridadEtiqueta: string;
  cliente: string;
  respuesta: string | null;
  capturas: number;
  primerAdjunto: number | null;
};

export type ColumnaData = {
  estado: string;
  etiqueta: string;
  tickets: TarjetaData[];
};

type Props = {
  columnas: ColumnaData[];
  esAdmin: boolean;
};

function Tarjeta({
  tarjeta,
  esAdmin,
  columnas,
  estado,
}: {
  tarjeta: TarjetaData;
  esAdmin: boolean;
  columnas: ColumnaData[];
  estado: string;
}) {
  return (
    <li className={styles.tarjeta} data-prioridad={tarjeta.prioridad}>
      <div className={styles.tarjetaMeta}>
        <span className={`${styles.prioridad} ${styles[tarjeta.prioridad]}`}>
          {tarjeta.prioridadEtiqueta}
        </span>
        <span>
          #{tarjeta.id} · {tarjeta.tipo}
          {esAdmin ? ` · ${tarjeta.cliente}` : ""}
        </span>
      </div>
      <p className={styles.tarjetaTitulo}>
        <a className={styles.enlaceTitulo} href={`/tablero/${tarjeta.id}/`}>
          {tarjeta.titulo}
        </a>
      </p>
      {tarjeta.primerAdjunto ? (
        <a
          className={styles.miniatura}
          href={`/adjuntos/${tarjeta.primerAdjunto}`}
          target="_blank"
          rel="noopener"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/adjuntos/${tarjeta.primerAdjunto}`} alt="" />
          <span>
            {tarjeta.capturas} captura{tarjeta.capturas > 1 ? "s" : ""}
          </span>
        </a>
      ) : null}
      {tarjeta.respuesta ? <p className={styles.respuesta}>{tarjeta.respuesta}</p> : null}

      {esAdmin ? (
        <div className={styles.estados} role="group" aria-label={`Mover #${tarjeta.id}`}>
          {columnas.map((columna) => {
            const actual = columna.estado === estado;
            return (
              <form action={moverTicket} key={columna.estado}>
                <input type="hidden" name="id" value={tarjeta.id} />
                <input type="hidden" name="estado" value={columna.estado} />
                <button type="submit" disabled={actual} aria-current={actual ? "true" : undefined}>
                  {columna.etiqueta}
                </button>
              </form>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}

export default function Tablero({ columnas, esAdmin }: Props) {
  return (
    <div className={styles.tablero}>
      {columnas.map((columna) => (
        <section key={columna.estado} className={styles.columna} aria-label={columna.etiqueta}>
          <h2 className={styles.columnaTitulo}>
            {columna.etiqueta} <span className={styles.cuenta}>{columna.tickets.length}</span>
          </h2>
          <ul className={styles.pila}>
            {columna.tickets.map((tarjeta) => (
              <Tarjeta
                key={tarjeta.id}
                tarjeta={tarjeta}
                esAdmin={esAdmin}
                columnas={columnas}
                estado={columna.estado}
              />
            ))}
            {columna.tickets.length === 0 ? <li className={styles.vacia}>Nada acá.</li> : null}
          </ul>
        </section>
      ))}
    </div>
  );
}
