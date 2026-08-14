import { ThemeToggle } from "molpo-landing";

// On the light surface, as it sits in the sticky nav.
export function SobreClaro() {
  return (
    <div style={{ background: "var(--bg)", padding: 24, display: "flex", gap: 16, alignItems: "center" }}>
      <ThemeToggle />
      <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Cambia entre tema claro y oscuro</span>
    </div>
  );
}

// On a dark surface the toggle needs the `className` prop — Hero recolors it
// exactly this way for its top bar; the component ships no dark variant.
export function SobreOscuroConClassName() {
  return (
    <div style={{ background: "var(--grad-hero)", padding: 24, borderRadius: 16, display: "flex", gap: 16, alignItems: "center" }}>
      <style>{".molpo-toggle-oscuro.molpo-toggle-oscuro{color:#c6dcf2;border-color:rgba(180,210,240,.16)}"}</style>
      <ThemeToggle className="molpo-toggle-oscuro" />
      <span style={{ color: "rgba(255,255,255,.72)", fontSize: 14 }}>En la barra superior del hero</span>
    </div>
  );
}
