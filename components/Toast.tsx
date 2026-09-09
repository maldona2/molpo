"use client";

import { useEffect, useState } from "react";
import styles from "./Toast.module.css";

const VIDA_MS = 5000;

export default function Toast({ children }: { children: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("aviso")) {
      url.searchParams.delete("aviso");
      const query = url.searchParams.toString();
      window.history.replaceState(null, "", url.pathname + (query ? `?${query}` : ""));
    }
    const oculta = window.setTimeout(() => setVisible(false), VIDA_MS);
    return () => window.clearTimeout(oculta);
  }, []);

  if (!visible) return null;

  return (
    <p className={styles.toast} role="status">
      {children}
    </p>
  );
}
