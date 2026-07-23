"use client";

import { useState } from "react";
import { site } from "@/lib/site";
import TrackedLink from "./TrackedLink";
import styles from "./Hero.module.css";

export default function HeroMenu() {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="hero-mobile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.menuIcon} aria-hidden="true">
          <span />
          <span />
        </span>
      </button>
      {open ? (
        <div id="hero-mobile-menu" className={styles.mobileMenu}>
          {site.nav.map((item) => (
            <a key={item.href} href={item.href} className={styles.mobileLink} onClick={close}>
              {item.label}
            </a>
          ))}
          <TrackedLink
            href={site.contact.whatsappUrl}
            className={styles.mobileContact}
            rel="noopener"
            onClick={close}
            tracking={{ name: "contact_click", method: "whatsapp", placement: "hero_nav" }}
          >
            Contacto
          </TrackedLink>
        </div>
      ) : null}
    </>
  );
}
