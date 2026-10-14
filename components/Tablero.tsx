"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { guardarTicket, sincronizarKomuk } from "@/app/(privado)/tablero/acciones";
import { ETIQUETAS, type Estado } from "@/lib/tickets";
import {
  DIAS_ESTANCADO,
  FILTROS_INICIALES,
  estancado,
  filtrar,
  filtrosAQuery,
  hayFiltros,
  ordenNavegacion,
  textoSync,
  vivo,
  type Filtros,
  type TarjetaTablero,
} from "@/lib/tablero";
import TableroBarra from "@/components/TableroBarra";
import TableroColumnas from "@/components/TableroColumnas";
import TableroDetalle from "@/components/TableroDetalle";
import TableroLista from "@/components/TableroLista";
import Toast from "@/components/Toast";
import panel from "@/app/(privado)/Panel.module.css";
import styles from "./Tablero.module.css";

type Props = {
  tickets: TarjetaTablero[];
  esAdmin: boolean;
  /** La hora del server: con la del navegador, "hoy" y "ayer" podrían no coincidir al hidratar. */
  ahora: number;
  filtrosIniciales: Filtros;
  sync: { ultima: number | null; error: string | null } | null;
};

type Cambio = { id: number; estado?: Estado; respuesta?: string | null };
type Aviso = { texto: string; deshacer?: () => void; n: number };

const CLAVE_COLAPSADAS = "molpo:tablero:colapsadas";

export default function Tablero({ tickets: delServer, esAdmin, ahora, filtrosIniciales, sync }: Props) {
  // Mover y responder se ven al instante. Si el server falla, al terminar la
  // transición React vuelve solo a lo que vino del server.
  const [tickets, aplicar] = useOptimistic(delServer, (actuales: TarjetaTablero[], c: Cambio) =>
    actuales.map((t) =>
      t.id !== c.id
        ? t
        : {
            ...t,
            estado: c.estado ?? t.estado,
            respuesta: c.respuesta === undefined ? t.respuesta : c.respuesta,
            actividad: ahora,
          },
    ),
  );
  // Deshacer corre varios renders después de armarse: lee los tickets de acá,
  // no los que quedaron en su closure.
  const ultimos = useRef(tickets);
  ultimos.current = tickets;

  const [, enTransicion] = useTransition();
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [menu, setMenu] = useState<string | null>(null);
  const [colapsadas, setColapsadas] = useState<Partial<Record<Estado, boolean>>>({ cerrado: true });
  const [abierto, setAbierto] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const buscador = useRef<HTMLInputElement>(null);

  const cambiar = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));

  useEffect(() => {
    try {
      const guardadas = localStorage.getItem(CLAVE_COLAPSADAS);
      const parsed: unknown = guardadas ? JSON.parse(guardadas) : null;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        setColapsadas((c) => ({ ...c, ...parsed }));
      }
    } catch {
      // Sin storage (ventana privada, sitio bloqueado): quedan las de fábrica.
    }
  }, []);

  function alternarColumna(estado: Estado) {
    const nuevas = { ...colapsadas, [estado]: !colapsadas[estado] };
    setColapsadas(nuevas);
    try {
      localStorage.setItem(CLAVE_COLAPSADAS, JSON.stringify(nuevas));
    } catch {
      // Ídem: sin storage la preferencia dura hasta recargar.
    }
  }

  // Los filtros viven en la URL para recargar o compartir la vista. replaceState
  // y no router.replace: el router le volvería a pedir la página al server.
  useEffect(() => {
    const query = filtrosAQuery(filtros);
    window.history.replaceState(null, "", `/tablero/${query ? `?${query}` : ""}`);
  }, [filtros]);

  const visibles = useMemo(
    () => filtrar(tickets, filtros, esAdmin, ahora),
    [tickets, filtros, esAdmin, ahora],
  );
  const ids = ordenNavegacion(visibles, filtros.vista, colapsadas);
  const actual = abierto === null ? null : (tickets.find((t) => t.id === abierto) ?? null);

  function avisar(texto: string, deshacer?: () => void) {
    setAviso({ texto, deshacer, n: Date.now() });
  }

  function paso(delta: number) {
    // Fuera del filtro (indexOf = -1), "siguiente" va al primero.
    const siguiente = ids[ids.indexOf(abierto ?? -1) + delta];
    if (siguiente !== undefined) setAbierto(siguiente);
  }

  function mover(id: number, estado: Estado, avisarCliente = true) {
    const t = ultimos.current.find((x) => x.id === id);
    if (!esAdmin || !t || t.estado === estado) return;
    const previo = t.estado;
    enTransicion(async () => {
      aplicar({ id, estado });
      // Un throw (red caída, 500) iría al error boundary: lo atajamos para avisar.
      const r = await guardarTicket({ id, estado, avisar: avisarCliente }).catch(() => null);
      if (!r?.ok) return avisar(`No pudimos mover #${id}. Probá de nuevo.`);
      if (!avisarCliente) return avisar(`#${id} volvió a ${ETIQUETAS[estado]}.`);
      const aQuien = r.mailEnviado ? ` Le avisamos a ${t.reporta ?? t.email}.` : "";
      avisar(`#${id} pasó a ${ETIQUETAS[estado]}.${aQuien}`, () => mover(id, previo, false));
    });
  }

  function responder(id: number, texto: string) {
    const t = ultimos.current.find((x) => x.id === id);
    if (!esAdmin || !t) return;
    const respuesta = texto.trim() || null;
    if ((respuesta ?? "") === (t.respuesta ?? "")) return;
    enTransicion(async () => {
      aplicar({ id, respuesta });
      const r = await guardarTicket({
        id,
        estado: t.estado,
        respuesta: texto,
        respuestaPrevia: t.respuesta ?? "",
      }).catch(() => null);
      if (!r?.ok) {
        return avisar(
          r?.motivo === "conflicto"
            ? "Alguien más cambió la respuesta mientras escribías. Revisala antes de guardar de nuevo."
            : "No pudimos guardar la respuesta. Probá de nuevo.",
        );
      }
      if (!respuesta) return avisar("Respuesta borrada.");
      avisar(r.mailEnviado ? `Respuesta guardada. Le llega por mail a ${t.reporta ?? t.email}.` : "Respuesta guardada.");
    });
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const escribiendo =
        e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape") {
        if (menu) setMenu(null);
        else if (abierto !== null) setAbierto(null);
        if (escribiendo) (e.target as HTMLElement).blur();
        return;
      }
      if (escribiendo || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        buscador.current?.focus();
      } else if (abierto !== null && (e.key === "j" || e.key === "ArrowDown")) {
        e.preventDefault();
        paso(1);
      } else if (abierto !== null && (e.key === "k" || e.key === "ArrowUp")) {
        e.preventDefault();
        paso(-1);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const filtrando = hayFiltros(filtros, esAdmin);
  const sinCerrar = tickets.filter(vivo).length;
  const altas = tickets.filter((t) => t.prioridad === "alta" && vivo(t)).length;
  const estancados = tickets.filter((t) => estancado(t, ahora)).length;

  return (
    <div className={styles.raiz}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={panel.h1}>{esAdmin ? "Tablero" : "Tus pedidos"}</h1>
          <p className={styles.resumen}>
            {tickets.length} pedidos · {sinCerrar} sin cerrar
          </p>
        </div>
        {sync ? (
          <form action={sincronizarKomuk} className={styles.sync}>
            <BotonSync ultima={sync.ultima} ahora={ahora} />
            {sync.error ? (
              <p className={styles.syncError} role="alert">
                Último error: {sync.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </header>

      {altas > 0 || estancados > 0 ? (
        <div className={styles.alertas}>
          {altas > 0 ? (
            <button type="button" className={styles.alerta} onClick={() => cambiar({ prioridades: ["alta"] })}>
              {altas} de prioridad alta
            </button>
          ) : null}
          {estancados > 0 ? (
            <button
              type="button"
              className={styles.alerta}
              onClick={() =>
                setFiltros((f) =>
                  f.atajos.includes("estancados") ? f : { ...f, atajos: [...f.atajos, "estancados"] },
                )
              }
            >
              {estancados} sin movimiento hace más de {DIAS_ESTANCADO} días
            </button>
          ) : null}
        </div>
      ) : null}

      <TableroBarra
        tickets={tickets}
        filtros={filtros}
        cambiar={cambiar}
        limpiar={() => setFiltros((f) => ({ ...FILTROS_INICIALES, orden: f.orden, vista: f.vista }))}
        esAdmin={esAdmin}
        ahora={ahora}
        visibles={visibles.length}
        filtrando={filtrando}
        menu={menu}
        setMenu={setMenu}
        buscador={buscador}
      />

      {filtros.vista === "tablero" ? (
        <TableroColumnas
          tickets={tickets}
          visibles={visibles}
          filtrando={filtrando}
          colapsadas={colapsadas}
          onColapsar={alternarColumna}
          esAdmin={esAdmin}
          ahora={ahora}
          abierto={abierto}
          onAbrir={setAbierto}
          onMover={mover}
        />
      ) : (
        <TableroLista
          visibles={visibles}
          filtrando={filtrando}
          esAdmin={esAdmin}
          ahora={ahora}
          abierto={abierto}
          onAbrir={setAbierto}
        />
      )}

      {actual ? (
        <TableroDetalle
          key={actual.id}
          t={actual}
          esAdmin={esAdmin}
          ahora={ahora}
          posicion={{ i: ids.indexOf(actual.id), n: ids.length }}
          onCerrar={() => setAbierto(null)}
          onPaso={paso}
          onMover={(estado) => mover(actual.id, estado)}
          onResponder={(texto) => responder(actual.id, texto)}
        />
      ) : null}

      {aviso ? (
        <Toast key={aviso.n} accion={aviso.deshacer ? { etiqueta: "Deshacer", alHacer: aviso.deshacer } : undefined}>
          {aviso.texto}
        </Toast>
      ) : null}
    </div>
  );
}

function BotonSync({ ultima, ahora }: { ultima: number | null; ahora: number }) {
  const { pending } = useFormStatus();
  return (
    <>
      <span className={styles.syncEstado}>
        KOMUK Hub · {pending ? "sincronizando…" : textoSync(ultima, ahora)}
      </span>
      <button type="submit" className={styles.syncBoton} disabled={pending}>
        {pending ? "Sincronizando…" : "Sincronizar"}
      </button>
    </>
  );
}
