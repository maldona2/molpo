"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";
import styles from "./Nav.module.css";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const pageElements = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.tagName !== "SCRIPT" &&
        element.tagName !== "STYLE" &&
        !element.contains(menuButtonRef.current),
    );
    const previousInertState = pageElements.map((element) => [element, element.inert] as const);

    document.body.style.overflow = "hidden";
    pageElements.forEach((element) => {
      element.inert = true;
    });
    firstLinkRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    function handleDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }

    const desktopQuery = window.matchMedia("(min-width: 901px)");
    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleDesktopChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      previousInertState.forEach(([element, wasInert]) => {
        element.inert = wasInert;
      });
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className={styles.nav} aria-label="Principal" data-menu-open={menuOpen || undefined}>
      <div className={`container ${styles.inner}`}>
        <a href="/" aria-label="molpo — inicio" onClick={closeMenu}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/molpo-negro.png" alt="molpo" className={styles.logo} width={68} height={24} />
        </a>
        <div className={styles.right}>
          <div className={styles.links}>
            {site.nav.map((item) => (
              <a key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </a>
            ))}
            <a href={site.contact.whatsappUrl} className={styles.cta} rel="noopener">
              WhatsApp
            </a>
          </div>
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.menuIcon} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobile-navigation" className={styles.mobileMenu}>
          <div className={`container ${styles.mobileMenuInner}`}>
            <div className={styles.mobileLinks}>
              {site.nav.map((item, index) => (
                <a
                  key={item.href}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={item.href}
                  className={styles.mobileLink}
                  onClick={closeMenu}
                >
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
            <a
              href={site.contact.whatsappUrl}
              className={styles.mobileCta}
              rel="noopener"
              onClick={closeMenu}
            >
              <span className={styles.statusDot} aria-hidden="true" />
              Hablemos por WhatsApp
            </a>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
