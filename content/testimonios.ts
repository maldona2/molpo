// Testimonios publicables (los clientes lo autorizan en /opinar).
// Fuente única de verdad de la sección "Testimonios" del home.

export type TestimonioHome = {
  quote: string;
  name: string;
  company: string;
  role?: string;
  trabajo: string;
};

export const testimonios: readonly TestimonioHome[] = [
  {
    quote:
      "Mucha predisposición por parte de molpo para realizar los trabajos, claridad al presentar informes y haciendo seguimiento de las mejoras y auditorías. Nunca hubo ningún problema con ir por más de lo estipulado inicialmente, muy recomendado.",
    name: "Pablo Torino",
    company: "La Loma Aconquija",
    trabajo: "Auditoría",
  },
];
