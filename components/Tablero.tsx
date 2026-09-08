"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moverTicket, reordenar } from "@/app/(privado)/tablero/acciones";
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
  /** Id de la primera captura, para linkear la miniatura. */
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
  columnaOrdenable: string;
};

/** Contenido de la tarjeta. Igual con drag y sin drag: una sola fuente. */
function Contenido({
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
    <>
      <div className={styles.tarjetaMeta}>
        <span className={`${styles.prioridad} ${styles[tarjeta.prioridad]}`}>
          {tarjeta.prioridadEtiqueta}
        </span>
        <span>
          #{tarjeta.id} · {tarjeta.tipo}
          {esAdmin ? ` · ${tarjeta.cliente}` : ""}
        </span>
      </div>
      {/* El drag arranca recién a los 6px (ver PointerSensor), así que un click
          sin movimiento sigue abriendo el detalle. */}
      <p className={styles.tarjetaTitulo}>
        <a className={styles.enlaceTitulo} href={`/tablero/${tarjeta.id}/`}>
          {tarjeta.titulo}
        </a>
      </p>
      {tarjeta.capturas > 0 ? (
        <a className={styles.capturas} href={`/adjuntos/${tarjeta.primerAdjunto}`} target="_blank" rel="noopener">
          {tarjeta.capturas} captura{tarjeta.capturas > 1 ? "s" : ""}
        </a>
      ) : null}
      {tarjeta.respuesta ? <p className={styles.respuesta}>{tarjeta.respuesta}</p> : null}

      {esAdmin ? (
        // Camino sin JS y para teclado: mover con un select de toda la vida.
        <form action={moverTicket} className={styles.mover}>
          <input type="hidden" name="id" value={tarjeta.id} />
          <select name="estado" defaultValue={estado} aria-label={`Mover #${tarjeta.id} a`}>
            {columnas.map((c) => (
              <option key={c.estado} value={c.estado}>
                {c.etiqueta}
              </option>
            ))}
          </select>
          <button type="submit">Mover</button>
        </form>
      ) : null}
    </>
  );
}

type TarjetaProps = {
  tarjeta: TarjetaData;
  arrastrable: boolean;
  esAdmin: boolean;
  columnas: ColumnaData[];
  estado: string;
};

function TarjetaArrastrable({ tarjeta, arrastrable, ...resto }: TarjetaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarjeta.id,
    disabled: !arrastrable,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.tarjeta} ${isDragging ? styles.arrastrando : ""}`}
      {...attributes}
      {...listeners}
      // El KeyboardSensor arranca el drag con Enter y hace preventDefault. Sin
      // este filtro se come el Enter del link del título (y el del select de
      // mover), y el detalle queda inalcanzable sin mouse. El drag por teclado
      // sigue andando parado sobre la tarjeta misma.
      onKeyDown={(evento) => {
        if (evento.target === evento.currentTarget) listeners?.onKeyDown?.(evento);
      }}
    >
      <Contenido tarjeta={tarjeta} {...resto} />
    </li>
  );
}

export default function Tablero({ columnas, esAdmin, columnaOrdenable }: Props) {
  const [orden, setOrden] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(columnas.map((c) => [c.estado, c.tickets.map((t) => t.id)])),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const ordenRef = useRef<HTMLInputElement>(null);
  // El server pinta el tablero sin drag y el drag se monta después. Así el HTML
  // del server es exactamente lo que ve alguien sin JS, y de paso se evita el
  // mismatch de hidratación de dnd-kit, que numera sus aria-describedby con un
  // contador de módulo que en el server no arranca de cero en cada request.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const sensors = useSensors(
    // Un umbral chico deja que el click siga siendo click y no un drag fallido.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const porId = new Map(columnas.flatMap((c) => c.tickets.map((t) => [t.id, t] as const)));

  function columnaDe(id: number): string | undefined {
    return Object.keys(orden).find((estado) => orden[estado].includes(id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activo = Number(active.id);
    const origen = columnaDe(activo);
    // El destino puede ser otra tarjeta o el contenedor de la columna.
    const destino = columnaDe(Number(over.id)) ?? String(over.id);
    if (!origen || !destino) return;

    if (origen === destino) {
      if (!esAdmin && origen !== columnaOrdenable) return;
      const actual = orden[origen];
      const desde = actual.indexOf(activo);
      const hasta = actual.indexOf(Number(over.id));
      if (desde === -1 || hasta === -1 || desde === hasta) return;

      const nuevo = arrayMove(actual, desde, hasta);
      setOrden({ ...orden, [origen]: nuevo });
      if (!esAdmin) {
        // El cliente guarda su prioridad; el admin reordena sólo en pantalla.
        if (ordenRef.current) ordenRef.current.value = nuevo.join(",");
        formRef.current?.requestSubmit();
      }
      return;
    }

    // Cambiar de columna es cambiar el estado: sólo el admin decide eso.
    if (!esAdmin) return;
    setOrden({
      ...orden,
      [origen]: orden[origen].filter((id) => id !== activo),
      [destino]: [...orden[destino], activo],
    });

    const datos = new FormData();
    datos.set("id", String(activo));
    datos.set("estado", destino);
    void moverTicket(datos);
  }

  const cuerpo = (columna: ColumnaData) => {
    const ids = orden[columna.estado] ?? [];
    return ids.map((id) => porId.get(id)).filter((t) => t !== undefined);
  };

  if (!montado) {
    return (
      <div className={styles.tablero}>
        {columnas.map((columna) => (
          <section key={columna.estado} className={styles.columna} aria-label={columna.etiqueta}>
            <h2 className={styles.columnaTitulo}>
              {columna.etiqueta} <span className={styles.cuenta}>{cuerpo(columna).length}</span>
            </h2>
            <ul className={styles.pila}>
              {cuerpo(columna).map((tarjeta) => (
                <li key={tarjeta.id} className={styles.tarjeta}>
                  <Contenido
                    tarjeta={tarjeta}
                    esAdmin={esAdmin}
                    columnas={columnas}
                    estado={columna.estado}
                  />
                </li>
              ))}
              {cuerpo(columna).length === 0 ? <li className={styles.vacia}>Nada acá.</li> : null}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      <form action={reordenar} ref={formRef} hidden>
        <input type="hidden" name="orden" ref={ordenRef} />
      </form>

      <DndContext
        id="tablero"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className={styles.tablero}>
          {columnas.map((columna) => {
            const ids = orden[columna.estado] ?? [];
            const arrastrable = esAdmin || columna.estado === columnaOrdenable;
            return (
              <section key={columna.estado} className={styles.columna} aria-label={columna.etiqueta}>
                <h2 className={styles.columnaTitulo}>
                  {columna.etiqueta} <span className={styles.cuenta}>{ids.length}</span>
                </h2>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <ul className={styles.pila}>
                    {ids.map((id) => {
                      const tarjeta = porId.get(id);
                      if (!tarjeta) return null;
                      return (
                        <TarjetaArrastrable
                          key={id}
                          tarjeta={tarjeta}
                          arrastrable={arrastrable}
                          esAdmin={esAdmin}
                          columnas={columnas}
                          estado={columna.estado}
                        />
                      );
                    })}
                    {ids.length === 0 ? <li className={styles.vacia}>Nada acá.</li> : null}
                  </ul>
                </SortableContext>
              </section>
            );
          })}
        </div>
      </DndContext>
    </>
  );
}
