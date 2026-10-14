"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { sincronizarKomuk } from "@/app/(privado)/tablero/acciones";
import type { Estado } from "@/lib/tickets";
import {
  DIAS_ESTANCADO,
  FILTROS_INICIALES,
  estancado,
  filtrar,
  filtrosAQuery,
  hayFiltros,
  textoSync,
  vivo,
  type Filtros,
  type TarjetaTablero,
} from "@/lib/tablero";
import TableroBarra from "@/components/TableroBarra";
import TableroColumnas from "@/components/TableroColumnas";
import TableroLista from "@/components/TableroLista";
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

const CLAVE_COLAPSADAS = "molpo:tablero:colapsadas";

export default function Tablero({ tickets, esAdmin, ahora, filtrosIniciales, sync }: Props) {
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [menu, setMenu] = useState<string | null>(null);
  const [colapsadas, setColapsadas] = useState<Partial<Record<Estado, boolean>>>({ cerrado: true });
  const buscador = useRef<HTMLInputElement>(null);

  const cambiar = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));

  useEffect(() => {
    try {
      const guardadas = localStorage.getItem(CLAVE_COLAPSADAS);
      if (guardadas) setColapsadas(JSON.parse(guardadas));
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

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const escribiendo =
        e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape") {
        if (menu) setMenu(null);
        if (escribiendo) (e.target as HTMLElement).blur();
        return;
      }
      if (escribiendo || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        buscador.current?.focus();
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const visibles = useMemo(
    () => filtrar(tickets, filtros, esAdmin, ahora),
    [tickets, filtros, esAdmin, ahora],
  );
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
        />
      ) : (
        <TableroLista visibles={visibles} filtrando={filtrando} esAdmin={esAdmin} ahora={ahora} />
      )}
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
