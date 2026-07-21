// Configuración central del sitio. Fuente única para URLs, contacto y flags.

export const site = {
  name: "molpo",
  legalName: "molpo",
  founder: "Matías Maldonado",
  jobTitle: "Desarrollador de Software",
  url: "https://www.molpo.com",
  locale: "es_AR",
  lang: "es-AR",
  region: "Tucumán, Argentina",
  tagline: "Software construido sobre bases sólidas",
  description:
    "Desarrollo de software a medida, rescate de sistemas hechos con IA e integración de datos para pymes de Tucumán y toda Argentina.",
  contact: {
    whatsappNumber: "+5493813000120",
    whatsappUrl: "https://wa.me/5493813000120",
    email: "molpo@gmail.com",
    web: "https://www.molpo.com",
    phoneDisplay: "+54 9 381 300 0120",
  },
  nav: [
    { label: "Servicios", href: "/#servicios" },
    { label: "Cómo trabajo", href: "/#proceso" },
    { label: "Metodología", href: "/como-trabajamos" },
    { label: "Casos", href: "/#casos" },
  ],
  // Muestra/oculta el botón flotante de WhatsApp (sin JS de cliente).
  showFloatingWa: true,
} as const;
