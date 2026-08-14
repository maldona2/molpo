import { ContactForm } from "molpo-landing";

// Full-width form as it appears on /contacto.
export function PaginaDeContacto() {
  return (
    <div style={{ maxWidth: 720, padding: 32 }}>
      <ContactForm placement="contact_page" />
    </div>
  );
}

// Compact variant on the light home surface. (The dark CTA band is NOT a story
// here: ContactForm ships no dark styling of its own — CtaFinal's own .formWrap
// recolors the labels and inputs, so see the CtaFinal card for that composition.)
export function CompactoEnHome() {
  return (
    <div style={{ maxWidth: 560, padding: 32 }}>
      <ContactForm placement="home_form" compact />
    </div>
  );
}
