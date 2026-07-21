// Copy verbatim del handoff de diseño. Fuente única de verdad del contenido.

export const servicios = [
  {
    num: "01",
    titulo: "Desarrollo a medida",
    texto:
      "Sistemas hechos para tu operación real, no plantillas. Con la estructura para crecer sin tener que rehacer todo más adelante.",
  },
  {
    num: "02",
    titulo: "Rescatar sistemas con IA",
    texto:
      "¿Empezaste algo con IA y quedó a medias, inseguro o difícil de mantener? Lo reviso, lo termino y lo dejo funcionando en producción.",
  },
  {
    num: "03",
    titulo: "Integración de sistemas y datos",
    texto:
      "Conecto tus sistemas y ordeno tus datos para que la información deje de vivir copiada en tres lugares distintos.",
  },
] as const;

export const pasos = [
  {
    paso: "Paso 01",
    titulo: "Diagnóstico honesto",
    texto: "Entiendo qué tenés y qué falla, con evidencia a nivel de código y datos.",
  },
  {
    paso: "Paso 02",
    titulo: "Bases sólidas",
    texto: "Defino la estructura y los datos antes de escribir código. Sin esto, lo demás se rompe.",
  },
  {
    paso: "Paso 03",
    titulo: "Construcción por etapas",
    texto: "Algo funcionando y en uso en cada tramo, no una entrega única al final.",
  },
  {
    paso: "Paso 04",
    titulo: "Acompañamiento",
    texto: "Reviso, mantengo y despliego lo que tu equipo sigue construyendo.",
  },
] as const;

export const casos = [
  {
    cliente: "Decortinas SAS",
    titulo: "Auditoría técnica y sistema de distribuidores",
    texto:
      "Diagnóstico verificado en código fuente de tres sistemas internos, con hoja de ruta priorizada, más el diseño del sistema de distribuidores.",
    tags: ["Auditoría", "Sistema de distribuidores"],
    variant: "dark" as const,
  },
  {
    cliente: "KOMUK",
    titulo: "Web mayorista y hub central",
    texto:
      "Web mayorista y un nuevo hub central que unifica la operación en un solo lugar, conectando lo que antes vivía disperso.",
    tags: ["Web mayorista", "Hub central"],
    variant: "light" as const,
  },
] as const;
