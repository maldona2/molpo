"use client";

import { useMemo, useState } from "react";
import { cerrarSesiones, cambiarEstado, guardarEmail } from "@/app/(privado)/clientes/acciones";
import styles from "./Clientes.module.css";

type Cliente = {
  id: number;
  nombre: string;
  email: string | null;
  activo: boolean;
  creado: string;
};

const fecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default function ClientesTable({ clientes, appHost }: { clientes: Cliente[]; appHost: string }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter(
      (c) => c.nombre.toLowerCase().includes(termino) || (c.email ?? "").toLowerCase().includes(termino),
    );
  }, [busqueda, clientes]);

  return (
    <>
      <label className={styles.buscador}>
        <input
          type="search"
          aria-label="Buscar cliente"
          placeholder="Buscar por nombre o email…"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
      </label>

      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email de acceso a {appHost}</th>
              <th>Alta</th>
              <th>Estado</th>
              <th aria-label="Acciones"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((cliente) => (
              <tr key={cliente.id}>
                <td className={styles.celdaNombre}>{cliente.nombre}</td>
                <td>
                  <form action={guardarEmail} className={styles.emailForm}>
                    <input type="hidden" name="id" value={cliente.id} />
                    <input
                      name="email"
                      type="email"
                      maxLength={320}
                      defaultValue={cliente.email ?? ""}
                      placeholder="sin email: no puede entrar"
                      aria-label={`Email de ${cliente.nombre}`}
                    />
                    <button type="submit">Guardar</button>
                  </form>
                </td>
                <td className={styles.celdaTenue}>{fecha.format(new Date(cliente.creado))}</td>
                <td>
                  <span className={cliente.activo ? styles.activo : styles.inactivo}>
                    {cliente.activo ? "Activo" : "De baja"}
                  </span>
                </td>
                <td>
                  <div className={styles.acciones}>
                    <form action={cerrarSesiones}>
                      <input type="hidden" name="id" value={cliente.id} />
                      <button type="submit" className={styles.accionBtn}>
                        Cerrar sesiones
                      </button>
                    </form>
                    <form action={cambiarEstado}>
                      <input type="hidden" name="id" value={cliente.id} />
                      <input type="hidden" name="activo" value={cliente.activo ? "0" : "1"} />
                      <button type="submit" className={styles.accionBtn}>
                        {cliente.activo ? "Dar de baja" : "Reactivar"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.sinResultados}>
                  Ningún cliente coincide con &ldquo;{busqueda}&rdquo;.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
