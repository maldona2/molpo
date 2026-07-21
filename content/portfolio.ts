// Portfolio de casos. Fuente única de verdad del contenido de /casos/[slug]
// y de las cards de la sección "Casos" del home.

export type Bloque =
  | { tipo: "p"; texto: string }
  | { tipo: "lista"; items: readonly string[]; ordenada?: boolean }
  | { tipo: "cita"; texto: string }
  | { tipo: "sub"; titulo: string; bloques: readonly Bloque[] };

export type Seccion = {
  titulo: string;
  bloques: readonly Bloque[];
};

export type Proyecto = {
  slug: string;
  cliente: string;
  titulo: string;
  lead: string;
  ficha: readonly { label: string; valor: string; url?: string }[];
  card: {
    titulo: string;
    texto: string;
    tags: readonly string[];
    variant: "dark" | "light";
  };
  secciones: readonly Seccion[];
  stack: readonly { area: string; items: readonly string[] }[];
  frase?: string;
};

export const proyectos: readonly Proyecto[] = [
  {
    slug: "komuk",
    cliente: "KOMUK",
    titulo: "Plataforma B2B de regalos corporativos",
    lead: "Catálogo digital, cotizador asistido por IA, motor de precios y backoffice comercial integrados en un mismo producto, conectado a múltiples proveedores.",
    ficha: [
      { label: "Rol", valor: "Desarrollo full-stack" },
      { label: "Tipo", valor: "Plataforma web B2B, catálogo digital y gestión comercial" },
      { label: "Industria", valor: "Merchandising y regalos corporativos" },
      { label: "Sitio", valor: "komuk.com.ar", url: "https://komuk.com.ar/" },
    ],
    card: {
      titulo: "Plataforma B2B de regalos corporativos",
      texto:
        "Catálogo, cotizador con IA, motor de precios y backoffice en un solo producto, sincronizado con múltiples proveedores.",
      tags: ["Catálogo B2B", "Cotizador con IA"],
      variant: "dark",
    },
    secciones: [
      {
        titulo: "El proyecto",
        bloques: [
          {
            tipo: "p",
            texto:
              "Diseñé y desarrollé una plataforma B2B que integra en un mismo producto el catálogo de regalos corporativos de KOMUK, la generación de cotizaciones y presupuestos, la gestión de clientes y pedidos, y un backoffice para administrar la operación comercial.",
          },
          {
            tipo: "p",
            texto:
              "La solución conecta múltiples proveedores, aplica reglas de precios configurables y utiliza inteligencia artificial para asistir al equipo en la búsqueda de productos y el armado de presupuestos.",
          },
        ],
      },
      {
        titulo: "El desafío",
        bloques: [
          {
            tipo: "p",
            texto:
              "KOMUK necesitaba convertir un proceso comercial con información distribuida entre catálogos, listas de precios, archivos Excel y sistemas de proveedores en una experiencia digital unificada. El proyecto debía resolver dos necesidades complementarias:",
          },
          {
            tipo: "lista",
            items: [
              "ofrecer a empresas y agencias un catálogo claro, rápido y adaptable a dispositivos móviles;",
              "dar al equipo comercial herramientas para mantener productos, calcular precios, preparar presupuestos y seguir oportunidades sin repetir tareas manuales.",
            ],
          },
          {
            tipo: "p",
            texto:
              "La complejidad principal estaba en normalizar productos de diferentes orígenes, mantener precios y stock actualizados, contemplar cantidades mínimas y márgenes comerciales, y conservar la coherencia entre lo que ve el cliente, lo que calcula el sistema y lo que finalmente aparece en cada presupuesto.",
          },
        ],
      },
      {
        titulo: "La solución",
        bloques: [
          {
            tipo: "p",
            texto:
              "Construí una aplicación full-stack con Next.js y TypeScript que cubre el recorrido completo, desde la exploración del catálogo hasta la gestión interna de la solicitud.",
          },
          {
            tipo: "p",
            texto:
              "La experiencia pública permite navegar productos por categoría, buscar y filtrar el catálogo, consultar variantes y disponibilidad, ver precios escalonados según cantidad y solicitar una cotización. El backoffice centraliza productos, clientes, usuarios, pedidos, presupuestos, contenido y configuración de precios, con importación desde Excel y un tablero Kanban con drag and drop para el avance comercial.",
          },
        ],
      },
      {
        titulo: "Funcionalidades principales",
        bloques: [
          {
            tipo: "sub",
            titulo: "Catálogo B2B",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Catálogo responsive con categorías, productos destacados y más buscados.",
                  "Búsqueda, filtros, ordenamiento y paginación.",
                  "Fichas de producto con variantes, stock, imágenes, dimensiones y precios por volumen.",
                  "Flujo de cotización con validación de cantidades y comunicación de próximos descuentos.",
                  "Carrito tradicional y constructor de presupuestos con productos individuales o kits.",
                ],
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Motor de precios",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Conversión automática de productos en dólares a pesos argentinos.",
                  "Reglas de descuento, envío, aplicación de logo y margen configuradas por proveedor.",
                  "Precios diferenciados para Minorista, PyME, Mayorista y Distribuidor.",
                  "Cálculo de cantidades mínimas y selección automática de la categoría comercial.",
                  "Una única fuente de cálculo para el catálogo, el cotizador con IA, las órdenes y los PDF.",
                ],
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Cotizador asistido por inteligencia artificial",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Interfaz conversacional para buscar productos a partir de pedidos en lenguaje natural.",
                  "Búsqueda híbrida: coincidencias exactas, filtros determinísticos y búsqueda semántica con embeddings.",
                  "Comprensión de restricciones como categoría, color, material, cantidad, stock y precio máximo.",
                  "Cálculo de precios reales mediante herramientas del servidor antes de presentar una propuesta.",
                  "Creación de presupuestos confirmados directamente desde la conversación, vinculados a cada cliente.",
                  "Controles para evitar precios inventados, órdenes duplicadas y pérdidas de contexto.",
                ],
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Gestión comercial",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "CRM liviano para crear, editar, buscar e importar clientes desde Excel.",
                  "Gestión de pedidos y presupuestos con tablas y tablero Kanban por estados.",
                  "Búsqueda por ID, empresa, contacto, email, teléfono o comentario.",
                  "Generación de presupuestos PDF con productos, kits, imágenes, cantidades, precios e impuestos.",
                  "Notificaciones y confirmaciones por email.",
                ],
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Administración de catálogo",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Sincronización con los proveedores Zecat, CDO y PromoProductos.",
                  "Importación del catálogo propio desde archivos Excel alojados en Amazon S3.",
                  "Normalización de categorías, imágenes, variantes, monedas, stock y dimensiones.",
                  "Detección de productos nuevos o modificados para evitar escrituras innecesarias.",
                  "Actualizaciones automáticas programadas y regeneración del sitemap tras cada sincronización.",
                  "Generación de embeddings en lote cuando cambia el contenido relevante de un producto.",
                ],
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Contenido, posicionamiento y medición",
            bloques: [
              {
                tipo: "lista",
                items: [
                  "Módulo de noticias con borradores, publicación, categorías y editor Markdown.",
                  "Metadatos dinámicos, URLs canónicas y sitemap generado desde el catálogo.",
                  "Datos estructurados de Schema.org para productos, FAQ, negocio local y sitio web.",
                  "Integración con Google Tag Manager y Vercel Analytics.",
                ],
              },
            ],
          },
        ],
      },
      {
        titulo: "Decisiones técnicas destacadas",
        bloques: [
          {
            tipo: "sub",
            titulo: "Precios validados en el servidor",
            bloques: [
              {
                tipo: "p",
                texto:
                  "El modelo de IA no define el precio final. La aplicación obliga al asistente a consultar el motor de precios y vuelve a calcular cada línea en el servidor antes de guardar un presupuesto. El catálogo, la propuesta comercial y el PDF trabajan con las mismas reglas.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Búsqueda híbrida para un catálogo heterogéneo",
            bloques: [
              {
                tipo: "p",
                texto:
                  "La búsqueda semántica ayuda a interpretar pedidos abiertos, pero no alcanza para códigos, medidas o nombres exactos. Combiné vectores de PostgreSQL con coincidencias literales, mapeo de categorías y filtros por atributos, manteniendo la flexibilidad del lenguaje natural sin perder precisión sobre el catálogo real.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Integraciones normalizadas",
            bloques: [
              {
                tipo: "p",
                texto:
                  "Cada proveedor expone estructuras, monedas y criterios de stock diferentes. Implementé adaptadores que transforman esas respuestas a un único modelo de producto; la sincronización actualiza solo los cambios y respeta listas negras y reglas de disponibilidad.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Arquitectura full-stack tipada",
            bloques: [
              {
                tipo: "p",
                texto:
                  "App Router de Next.js, componentes y acciones de servidor, Drizzle ORM y Zod para mantener tipados y validados los datos entre PostgreSQL, las APIs y la interfaz. Clerk protege las rutas privadas y Amazon S3 centraliza imágenes y archivos de catálogo.",
              },
            ],
          },
        ],
      },
      {
        titulo: "Resultado",
        bloques: [
          {
            tipo: "p",
            texto:
              "KOMUK evolucionó de un catálogo online a una herramienta operativa que conecta marketing, ventas y administración. La plataforma reduce el trabajo repetitivo para actualizar productos y preparar propuestas, mejora la consistencia de los precios y permite gestionar el ciclo comercial desde un único lugar.",
          },
          {
            tipo: "p",
            texto:
              "Lo más valioso del desarrollo fue integrar reglas de negocio específicas, datos externos y automatización con IA sin delegar decisiones críticas al modelo: la IA acelera la búsqueda y el armado de propuestas, mientras el servidor conserva el control sobre precios, productos y creación de órdenes.",
          },
        ],
      },
    ],
    stack: [
      { area: "Frontend", items: ["Next.js 14", "React 18", "TypeScript", "Tailwind CSS", "Radix UI", "TanStack Table"] },
      { area: "Backend", items: ["Server Actions", "Route Handlers", "Node.js", "Zod"] },
      { area: "Datos", items: ["PostgreSQL", "Drizzle ORM", "pgvector"] },
      { area: "IA", items: ["OpenAI", "Function calling", "Embeddings"] },
      { area: "Infraestructura", items: ["Vercel", "Amazon S3", "Clerk", "Tareas programadas"] },
      { area: "Documentos y calidad", items: ["Puppeteer", "jsPDF", "Nodemailer", "Vitest"] },
    ],
    frase:
      "Una plataforma B2B que transforma catálogos de múltiples proveedores en presupuestos consistentes, trazables y listos para gestionar.",
  },
  {
    slug: "decortinas",
    cliente: "Decortinas",
    titulo: "Cotización y gestión de pedidos para distribuidores de cortinas",
    lead: "Aplicación web privada que conecta la cotización comercial con la gestión y fabricación de cada pedido: presupuestador guiado, reglas técnicas, tablero de pedidos y documentación en PDF.",
    ficha: [
      { label: "Rol", valor: "Desarrollo full-stack, arquitectura y UX" },
      { label: "Tipo", valor: "Aplicación web B2B a medida (privada)" },
      { label: "Período", valor: "2024–2026" },
      { label: "Mercado", valor: "Argentina" },
    ],
    card: {
      titulo: "Cotización y pedidos a medida",
      texto:
        "Presupuestador con reglas de fabricación, tablero de pedidos y PDFs específicos para cliente y fábrica en un único flujo.",
      tags: ["Cotizador a medida", "Pedidos y fábrica"],
      variant: "light",
    },
    secciones: [
      {
        titulo: "El proyecto",
        bloques: [
          {
            tipo: "p",
            texto:
              "Decortinas es una aplicación web creada para digitalizar el circuito comercial y operativo de una red de distribuidores de cortinas. Reemplaza cálculos dispersos y tareas manuales por un presupuestador guiado que combina catálogo, medidas, accesorios, costos y reglas de fabricación para calcular cada pedido.",
          },
          {
            tipo: "p",
            texto:
              "El sistema acompaña todo el proceso: registro y validación de distribuidores, creación de presupuestos, seguimiento de pedidos, generación de PDFs comerciales y órdenes de fabricación, permisos por rol, alertas configurables y sincronización del catálogo desde Excel.",
          },
        ],
      },
      {
        titulo: "El desafío",
        bloques: [
          {
            tipo: "p",
            texto:
              "Cotizar una cortina a medida no consiste solamente en multiplicar una cantidad por un precio. El resultado depende del producto, las dimensiones, la tela, el sistema, los accesorios, el tipo de confección y distintas restricciones de fabricación.",
          },
          {
            tipo: "p",
            texto:
              "El desafío principal fue transformar ese conocimiento operativo en una experiencia simple para el distribuidor, sin perder precisión técnica. Al mismo tiempo, la información cargada durante la venta debía llegar de forma clara al equipo administrativo y a fábrica, evitando duplicaciones y reinterpretaciones manuales.",
          },
        ],
      },
      {
        titulo: "La solución",
        bloques: [
          { tipo: "p", texto: "Diseñé y desarrollé una aplicación full-stack que centraliza el proceso en un flujo único:" },
          {
            tipo: "lista",
            ordenada: true,
            items: [
              "El distribuidor ingresa los datos del cliente.",
              "Configura uno o más productos mediante un formulario dinámico.",
              "La aplicación calcula el precio y evalúa reglas técnicas en tiempo real.",
              "El usuario revisa el resumen y confirma el presupuesto.",
              "El pedido queda disponible para seguimiento, edición y duplicación.",
              "El sistema genera un PDF comercial y una orden de fabricación con la información que necesita cada destinatario.",
            ],
          },
        ],
      },
      {
        titulo: "Funcionalidades principales",
        bloques: [
          {
            tipo: "sub",
            titulo: "Presupuestador asistido",
            bloques: [
              {
                tipo: "p",
                texto:
                  "El formulario se adapta al producto seleccionado y solicita únicamente los datos necesarios: medidas, soporte, caída, cadena, apertura, pellizcos o cantidad de paños. Permite agregar, eliminar y duplicar ítems antes de confirmar el pedido.",
              },
              {
                tipo: "p",
                texto:
                  "La lógica de precios contempla productos por unidad, metro lineal o superficie; mínimos de fabricación; conversión del dólar; costos de confección; cadenas, sistemas y accesorios. También resuelve configuraciones especiales, como cortinas de riel doble con dos telas, colores y parámetros independientes.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Validaciones y alertas técnicas",
            bloques: [
              {
                tipo: "p",
                texto:
                  "La aplicación valida combinaciones de medidas, telas y sistemas antes de confirmar: recomienda el sistema Roller adecuado según una matriz de ancho y alto, informa límites de fabricación y puede bloquear configuraciones inválidas.",
              },
              {
                tipo: "p",
                texto:
                  "Además, desarrollé un editor de alertas para administradores. Las reglas se almacenan en la base de datos y se pueden crear, editar, activar o desactivar sin desplegar una nueva versión. Cada regla admite condiciones, producto objetivo, severidad, mensaje y comportamiento bloqueante.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Gestión de pedidos",
            bloques: [
              {
                tipo: "p",
                texto:
                  "Los distribuidores consultan sus pedidos, buscan por número, empresa, cliente o correo, filtran por fechas y editan pedidos pendientes. El equipo administrador dispone de una vista global y actualiza estados. El seguimiento incluye un tablero Kanban con drag and drop: pendiente, presupuestado, en fabricación, enviado, entregado y completado.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Documentación para cliente y fábrica",
            bloques: [
              { tipo: "p", texto: "Cada pedido puede generar dos documentos con objetivos distintos:" },
              {
                tipo: "lista",
                items: [
                  "PDF de presupuesto: productos, cantidades, especificaciones, precios, condiciones y datos del cliente.",
                  "PDF de fabricación: reorganiza la misma información para producción, elimina precios y prioriza medidas, variantes, accesorios y comentarios técnicos.",
                ],
              },
              {
                tipo: "p",
                texto:
                  "El sistema también permite copiar los ítems en CSV y envía correos de confirmación asociados al flujo del pedido.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Administración del negocio",
            bloques: [
              {
                tipo: "p",
                texto:
                  "Los administradores gestionan usuarios y roles, actualizan costos de confección y cotización del dólar, mantienen las reglas de alerta y renuevan el catálogo mediante Excel. El catálogo se carga en AWS S3 y se sincroniza con PostgreSQL, detectando productos nuevos, modificados o eliminados y conservando códigos estables para no romper pedidos históricos.",
              },
            ],
          },
        ],
      },
      {
        titulo: "Decisiones técnicas destacadas",
        bloques: [
          {
            tipo: "lista",
            items: [
              "Reglas de negocio separadas de la interfaz: cálculos y validaciones como funciones de dominio independientes, fáciles de probar y reutilizar en formularios, tablas, PDFs y exportaciones.",
              "Motor de alertas basado en datos: las validaciones que cambian con el negocio se administran desde la aplicación, no quedan rígidas en el código.",
              "Operaciones transaccionales: creación, edición y duplicación de pedidos guardan la orden y sus ítems dentro de transacciones para evitar estados parciales.",
              "Permisos en cliente y servidor: las acciones sensibles se limitan por rol en la interfaz y se vuelven a validar en el servidor.",
              "Una fuente de datos, dos documentos: presupuesto y orden de fabricación parten del mismo pedido, adaptando la presentación a cada audiencia.",
              "Compatibilidad con datos históricos: códigos estables y campos opcionales permiten evolucionar el modelo sin invalidar pedidos anteriores.",
              "Estado compartible en la URL: búsquedas, paginación y filtros persisten en los parámetros de navegación.",
            ],
          },
        ],
      },
      {
        titulo: "Calidad y mantenimiento",
        bloques: [
          {
            tipo: "p",
            texto:
              "La suite automatizada cubre las áreas con mayor riesgo funcional y económico: fórmulas de precios, riel doble, variantes de producto, expansión de ítems, recomendaciones de sistemas Roller y evaluación de alertas. Actualmente cuenta con 73 pruebas aprobadas.",
          },
          {
            tipo: "p",
            texto:
              "La aplicación utiliza TypeScript y validación con Zod en los límites del sistema. El esquema de PostgreSQL evoluciona mediante migraciones versionadas, y la separación entre componentes, acciones, validaciones y acceso a datos facilita incorporar nuevos productos y reglas.",
          },
        ],
      },
      {
        titulo: "Resultado",
        bloques: [
          {
            tipo: "p",
            texto:
              "El resultado es una herramienta que conecta ventas, administración y fabricación con una única fuente de información. El distribuidor recibe una experiencia guiada para cotizar productos complejos; el equipo interno obtiene trazabilidad sobre cada pedido; y fábrica recibe documentación preparada para producir sin reconstruir manualmente lo que se vendió.",
          },
          {
            tipo: "p",
            texto:
              "Más allá de automatizar cálculos, el proyecto convirtió conocimiento específico del negocio en un sistema mantenible que puede evolucionar junto con el catálogo y las reglas operativas.",
          },
        ],
      },
    ],
    stack: [
      { area: "Frontend", items: ["Next.js 14", "React 18", "TypeScript", "Tailwind CSS", "shadcn/ui", "Radix UI"] },
      { area: "Formularios", items: ["React Hook Form", "Zod"] },
      { area: "Backend", items: ["App Router", "Server Actions", "Route Handlers"] },
      { area: "Datos", items: ["PostgreSQL", "Drizzle ORM", "Drizzle Kit"] },
      { area: "Estado y tablas", items: ["Zustand", "nuqs", "TanStack Table"] },
      { area: "Documentos", items: ["React PDF", "CSV", "Excel"] },
      { area: "Integraciones", items: ["Clerk", "AWS S3", "Nodemailer"] },
      { area: "Calidad", items: ["Vitest", "Testing Library"] },
    ],
    frase:
      "Cotizaciones a medida, reglas de fabricación y documentación para cliente y fábrica en un único flujo de trabajo.",
  },
  {
    slug: "tr-fit",
    cliente: "TR Fit",
    titulo: "Plataforma de entrenamiento personalizado para coaches y atletas",
    lead: "App móvil para iOS y Android, panel web de administración y API propia que concentra rutinas, sesiones guiadas, progresión automática, alertas y membresías.",
    ficha: [
      { label: "Rol", valor: "Desarrollo full-stack end-to-end" },
      { label: "Tipo", valor: "App móvil + panel web + API" },
      { label: "Industria", valor: "Fitness y entrenamiento personalizado" },
      { label: "Plataformas", valor: "iOS, Android y web" },
    ],
    card: {
      titulo: "Entrenamiento personalizado, de coach a atleta",
      texto:
        "App móvil offline-first, panel para coaches y API propia: rutinas con IA controlada, sesiones guiadas y membresías.",
      tags: ["App móvil", "Panel para coaches"],
      variant: "dark",
    },
    secciones: [
      {
        titulo: "El proyecto",
        bloques: [
          {
            tipo: "p",
            texto:
              "TR Fit es una plataforma de entrenamiento personalizado que conecta el trabajo del coach con la experiencia diaria de sus atletas. Permite crear planes adaptados a cada persona, guiar y registrar entrenamientos incluso con conexión inestable, medir el progreso y centralizar la operación del coach desde un panel web.",
          },
        ],
      },
      {
        titulo: "El desafío",
        bloques: [
          {
            tipo: "p",
            texto:
              "El proyecto no consistía solamente en mostrar una lista de ejercicios. Había que convertir una metodología real de entrenamiento en un producto capaz de:",
          },
          {
            tipo: "lista",
            items: [
              "adaptar las rutinas al objetivo, nivel, disponibilidad, equipamiento, lesiones y tiempo de cada atleta;",
              "mantener el criterio profesional del entrenador dentro del proceso de personalización;",
              "acompañar una sesión completa en el gimnasio sin perder información ante cortes de conexión;",
              "traducir el rendimiento de cada semana en ajustes concretos de repeticiones, cargas y planificación;",
              "darle al coach herramientas para revisar rutinas, responder alertas y gestionar atletas, pagos y accesos desde un único lugar.",
            ],
          },
        ],
      },
      {
        titulo: "La solución",
        bloques: [
          { tipo: "p", texto: "Diseñé el producto como tres aplicaciones conectadas:" },
          {
            tipo: "lista",
            ordenada: true,
            items: [
              "App móvil para atletas: onboarding, plan semanal, sesión guiada, registro de cargas, descansos, mediciones y evolución.",
              "Panel web para el coach: atletas, rutinas, ejercicios, alertas, actividad, membresías y seguimiento individual.",
              "Backend y base de datos: API, reglas de negocio, generación y validación de rutinas, sincronización de sesiones y procesos automáticos.",
            ],
          },
          {
            tipo: "p",
            texto:
              "Esta separación mantiene una experiencia simple en el teléfono sin trasladar al cliente reglas sensibles como la progresión, la vigencia del acceso o la aprobación de una rutina.",
          },
        ],
      },
      {
        titulo: "Experiencia del atleta",
        bloques: [
          {
            tipo: "lista",
            items: [
              "Onboarding en cinco etapas: datos personales, objetivo, experiencia, exigencia, días disponibles, duración, equipamiento, lesiones y medidas corporales.",
              "Inicio personalizado con la sesión del día, semana de periodización, métricas de constancia y pasos diarios.",
              "Sesión en modo guiado o rápido, con videos técnicos, objetivos de repeticiones o tiempo, peso sugerido, RPE, calentamiento, dropsets y descansos.",
              "Temporizador en segundo plano, notificaciones y Live Activity en iOS (pantalla bloqueada y Dynamic Island).",
              "Cambio de ejercicio cuando una máquina no está disponible y comunicación de dolor o molestias al coach.",
              "Registro de tests de fuerza, marcas personales y percepción de fatiga.",
              "Resumen compartible del entrenamiento con volumen, cumplimiento, duración y nuevos récords.",
              "Seguimiento de fuerza, medidas corporales, peso, constancia e historial de sesiones.",
            ],
          },
        ],
      },
      {
        titulo: "Herramientas para el coach",
        bloques: [
          {
            tipo: "lista",
            items: [
              "Dashboard con indicadores operativos y accesos rápidos.",
              "Alta, aprobación, edición y seguimiento de atletas, con vista individual de perfil, sesiones, medidas, rutina y membresía.",
              "Cola de rutinas pendientes de revisión antes de publicarlas al atleta.",
              "Editor de rutinas activas y catálogo de ejercicios con grupos musculares, equipamiento, nivel y videos técnicos.",
              "Alertas por dolor, falta de equipamiento y vencimientos, con acciones que aplican cambios temporales o inician una nueva rutina.",
              "Registro de pagos, pausas, reactivaciones y vencimientos de membresías.",
              "Historial de actividad y auditoría de acciones administrativas.",
            ],
          },
        ],
      },
      {
        titulo: "Decisiones de producto y arquitectura",
        bloques: [
          {
            tipo: "sub",
            titulo: "Personalización con criterio del entrenador",
            bloques: [
              {
                tipo: "p",
                texto:
                  "Las rutinas parten de plantillas reales definidas por el coach. La IA interviene únicamente cuando hace falta adaptar ejercicios, disponibilidad, lesiones o duración. La respuesta se genera con una estructura tipada, se valida con Zod y atraviesa reglas determinísticas sobre días, ejercicios permitidos, grupos musculares y volumen. El resultado queda pendiente de revisión humana antes de activarse: la IA funciona como un ajustador controlado, no como una caja negra.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Generación asíncrona y tolerante a fallos",
            bloques: [
              {
                tipo: "p",
                texto:
                  "La creación o regeneración de una rutina se procesa mediante una cola en PostgreSQL. Un worker toma cada trabajo de forma atómica, aplica reintentos con espera y recupera tareas interrumpidas por reinicios o despliegues. Esto evita dejar perfiles incompletos cuando un proveedor externo tarda o falla.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Sesiones preparadas para conexiones inestables",
            bloques: [
              {
                tipo: "p",
                texto:
                  "Durante el entrenamiento, cada serie se guarda primero en el dispositivo. Los registros usan identificadores únicos, se envían al servidor cuando hay conexión y se reconcilian al reabrir la app. Si el atleta termina sin internet, la sesión se cierra localmente y la sincronización se completa más tarde: una mala señal en el gimnasio no bloquea la experiencia ni borra trabajo registrado.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Progresión automática basada en cumplimiento",
            bloques: [
              {
                tipo: "p",
                texto:
                  "El backend evalúa las sesiones completadas y ejecuta una progresión semanal. Según cumplimiento, tipo de ejercicio y ciclo de repeticiones, el sistema puede avanzar de semana, ajustar repeticiones o incrementar cargas. Las semanas de RM y AMRAP se tratan como hitos específicos dentro de la periodización.",
              },
            ],
          },
          {
            tipo: "sub",
            titulo: "Acceso y membresías como conceptos separados",
            bloques: [
              {
                tipo: "p",
                texto:
                  "La aprobación de una persona y la vigencia de su membresía se modelan por separado. Los pagos extienden el acceso de forma transaccional, procesos programados detectan vencimientos y generan avisos, y se contemplan pausas por lesión o vacaciones reanudando luego el tiempo restante.",
              },
            ],
          },
        ],
      },
      {
        titulo: "Calidad y alcance técnico",
        bloques: [
          {
            tipo: "lista",
            items: [
              "Más de 100 handlers de API organizados por dominio, protegidos por autenticación y roles.",
              "56 migraciones SQL para evolucionar el modelo de datos de forma incremental.",
              "Más de 170 archivos de pruebas entre la app, el backend y el panel web.",
              "Validación de entradas, rate limiting, refresh tokens, almacenamiento seguro y auditoría administrativa.",
              "Builds móviles para iOS y Android, actualizaciones OTA y despliegue web contenerizado.",
            ],
          },
        ],
      },
      {
        titulo: "Resultado",
        bloques: [
          {
            tipo: "p",
            texto:
              "El resultado es un sistema que cubre todo el recorrido entre coach y atleta: desde el alta y la creación del plan hasta la ejecución de cada serie, el análisis del progreso y la renovación de la membresía.",
          },
          {
            tipo: "p",
            texto:
              "Más que una app de rutinas, TR Fit funciona como la infraestructura operativa de un servicio de entrenamiento personalizado: reduce tareas manuales para el coach y le da al atleta una guía clara, consistente y accesible durante cada sesión.",
          },
        ],
      },
    ],
    stack: [
      { area: "App móvil", items: ["React Native", "Expo SDK 55", "Expo Router", "TypeScript", "NativeWind", "Zustand"] },
      { area: "Integraciones móviles", items: ["HealthKit", "Push notifications", "Live Activities", "Expo Updates"] },
      { area: "Panel web", items: ["React 19", "Vite", "Tailwind CSS", "shadcn/ui", "TanStack Query"] },
      { area: "Backend", items: ["Node.js 20", "Express", "TypeScript", "Zod", "JWT", "OpenAI API"] },
      { area: "Datos e infraestructura", items: ["PostgreSQL 15", "Migraciones SQL", "Docker"] },
      { area: "Calidad", items: ["Jest", "Vitest", "Testing Library", "ESLint"] },
    ],
    frase:
      "Plataforma full-stack para crear, ejecutar y supervisar planes de entrenamiento personalizados desde una app móvil y un panel web.",
  },
] as const;

export function getProyecto(slug: string) {
  return proyectos.find((p) => p.slug === slug);
}
