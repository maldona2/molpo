// Configuración central del sitio. Fuente única para URLs, contacto y flags.

export const site = {
  name: "molpo",
  legalName: "molpo",
  title: "molpo — Desarrollo de software para pymes | Tucumán",
  socialTitle: "molpo — Sistemas que sostienen tu empresa",
  founder: "Matías Maldonado",
  jobTitle: "Desarrollador de Software",
  url: "https://molpo.com.ar",
  locale: "es_AR",
  lang: "es-AR",
  region: "Tucumán, Argentina",
  tagline: "Software construido sobre bases sólidas",
  description:
    "Desarrollo de software a medida, rescate de sistemas hechos con IA e integración de datos para pymes de Tucumán y toda Argentina.",
  socialImage: {
    openGraph: "/opengraph-image",
    twitter: "/twitter-image",
    width: 1200,
    height: 630,
    alt: "molpo — Desarrollo de software para pymes | Tucumán",
  },
  themeColor: "#18365D",
  backgroundColor: "#FFFFFF",
  contact: {
    whatsappNumber: "+5493813000120",
    whatsappUrl: "https://wa.me/5493813000120",
    email: "molpo@gmail.com",
    web: "https://molpo.com.ar",
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
