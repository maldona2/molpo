import "./assets.css";

// design-sync entry: the landing's component surface, re-exported by name.
// Components read process.env at render (Footer gates on NEXT_PUBLIC_GA_*);
// outside Next there is no process, so stub one before anything renders.
(globalThis as unknown as { process?: { env: Record<string, string> } }).process ??= { env: {} };

export { default as Hero } from "../components/Hero";
export { default as Nav } from "../components/Nav";
export { default as Servicios } from "../components/Servicios";
export { default as Casos } from "../components/Casos";
export { default as Proceso } from "../components/Proceso";
export { default as SobreMi } from "../components/SobreMi";
export { default as CtaFinal } from "../components/CtaFinal";
export { default as TrustStrip } from "../components/TrustStrip";
export { default as Footer } from "../components/Footer";
export { default as ContactForm } from "../components/ContactForm";
export { default as ThemeToggle } from "../components/ThemeToggle";
