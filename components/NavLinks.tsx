"use client";

import { usePathname } from "next/navigation";
import styles from "@/app/(privado)/App.module.css";

export default function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Secciones">
      {items.map((item) => {
        const activo = pathname === item.href || pathname === item.href.replace(/\/$/, "");
        return (
          <a key={item.href} href={item.href} className={styles.navLink} aria-current={activo ? "page" : undefined}>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
