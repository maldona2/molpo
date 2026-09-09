"use client";

import { moverTicket } from "@/app/(privado)/tablero/acciones";
import styles from "./Tablero.module.css";

type Opcion = { estado: string; etiqueta: string };

export default function MoverEstado({
  id,
  estado,
  opciones,
}: {
  id: number;
  estado: string;
  opciones: Opcion[];
}) {
  return (
    <form action={moverTicket} className={styles.mover}>
      <input type="hidden" name="id" value={id} />
      <select
        name="estado"
        defaultValue={estado}
        aria-label={`Mover #${id}`}
        onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
      >
        {opciones.map((opcion) => (
          <option key={opcion.estado} value={opcion.estado}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </form>
  );
}
