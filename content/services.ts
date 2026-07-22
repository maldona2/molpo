export type ServicioDetalle = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  lead: string;
  signals: readonly string[];
  fit: readonly string[];
  notFit: readonly string[];
  process: readonly { title: string; text: string }[];
  deliverables: readonly string[];
  caseSlug: string;
  caseContext: string;
  questions: readonly { question: string; answer: string }[];
  cta: string;
};

export const serviciosDetalle: readonly ServicioDetalle[] = [
  {
    slug: "software-a-medida",
    eyebrow: "Desarrollo a medida",
    title: "Software a medida para una operación que ya no entra en una plantilla",
    description:
      "Diseño y desarrollo de sistemas a medida para pymes que necesitan ordenar procesos, datos y reglas sin adaptar el negocio a una herramienta genérica.",
    lead:
      "Cuando el proceso real vive entre planillas, mensajes y sistemas separados, agregar otra aplicación suele aumentar la duplicación. El trabajo empieza por entender la operación y construir una base que pueda sostener las próximas decisiones.",
    signals: [
      "La misma información se copia entre planillas, chats y sistemas.",
      "El equipo depende de una persona que conoce todos los pasos manuales.",
      "Cotizar, coordinar o informar exige revisar varias fuentes.",
      "Una herramienta estándar obliga a trabajar de una forma que no representa al negocio.",
      "Cada mejora parece requerir rehacer una parte importante del sistema.",
    ],
    fit: [
      "Pymes con un proceso concreto que ya genera costo, demora o errores.",
      "Equipos dispuestos a mostrar cómo trabajan hoy, incluidos los casos excepcionales.",
      "Operaciones que necesitan una primera entrega útil antes de ampliar el alcance.",
    ],
    notFit: [
      "Ideas sin usuarios, problema definido ni responsable para tomar decisiones.",
      "Proyectos que necesitan copiar un producto existente sin validar su operación.",
      "Implementaciones donde la prioridad sea acumular funcionalidades antes de probar valor.",
    ],
    process: [
      {
        title: "Mapear el proceso real",
        text: "Reviso qué hace cada persona, qué información necesita y dónde aparecen repeticiones, demoras o decisiones difíciles de verificar.",
      },
      {
        title: "Definir datos y reglas",
        text: "Separo lo que debe existir una sola vez —clientes, productos, precios, permisos o estados— de las pantallas que pueden cambiar.",
      },
      {
        title: "Elegir una primera entrega",
        text: "Priorizamos un flujo con valor visible. La primera versión debe poder usarse y evaluarse, no ser una maqueta de todo el sistema futuro.",
      },
      {
        title: "Construir y ajustar con evidencia",
        text: "Cada etapa incluye una versión funcionando, revisión de decisiones y pruebas acordes al riesgo del cambio.",
      },
    ],
    deliverables: [
      "Mapa inicial del proceso, riesgos y prioridades.",
      "Modelo de datos y reglas principales del negocio.",
      "Aplicación desplegada por etapas con acceso controlado.",
      "Pruebas, documentación operativa y registro de decisiones importantes.",
      "Plan concreto para mantenimiento, soporte y próximas mejoras.",
    ],
    caseSlug: "decortinas",
    caseContext:
      "Decortinas muestra cómo reglas de fabricación, cotización y seguimiento de pedidos pueden vivir en un flujo común en lugar de depender de cálculos dispersos.",
    questions: [
      {
        question: "¿Hay que reemplazar todos los sistemas actuales?",
        answer:
          "No necesariamente. Primero se identifica qué puede mantenerse, qué conviene integrar y cuál es el punto donde una solución nueva aporta más valor con menos riesgo.",
      },
      {
        question: "¿Cuánto se define antes de empezar?",
        answer:
          "Se define lo suficiente para entender datos, riesgos y primera entrega. El resto se ajusta con uso real; no hace falta simular cada detalle del proyecto completo en un documento inicial.",
      },
      {
        question: "¿Puedo seguir ampliándolo después?",
        answer:
          "Sí. La estructura se diseña para agregar herramientas sin duplicar las reglas centrales. Cada ampliación debe conservar pruebas y documentación de lo que ya funciona.",
      },
    ],
    cta: "Contame qué proceso hoy depende de planillas, mensajes o pasos manuales.",
  },
  {
    slug: "rescate-software-ia",
    eyebrow: "Rescate de software con IA",
    title: "Convertir un prototipo hecho con IA en un sistema que se pueda operar",
    description:
      "Auditoría, estabilización y puesta en producción de sistemas iniciados con IA que quedaron inseguros, incompletos o difíciles de mantener.",
    lead:
      "La IA puede producir una primera versión muy rápido. El problema aparece cuando nadie puede explicar qué depende de qué, los datos cambian sin control o cada corrección rompe otra parte. Rescatar el proyecto implica entenderlo antes de seguir agregando código.",
    signals: [
      "El sistema funciona en una demo pero falla con datos o usuarios reales.",
      "No está claro qué variables, servicios o permisos necesita producción.",
      "Hay funcionalidades duplicadas y archivos que resuelven lo mismo de formas distintas.",
      "Cada conversación con la IA modifica más código del esperado.",
      "No existen pruebas, migraciones confiables ni una forma repetible de desplegar.",
    ],
    fit: [
      "Prototipos con usuarios o una necesidad comercial ya validada.",
      "Equipos que pueden entregar repositorio, accesos técnicos y contexto del negocio.",
      "Proyectos donde estabilizar el núcleo es más importante que sumar pantallas nuevas.",
    ],
    notFit: [
      "Repositorios sin autorización de sus propietarios o sin acceso a dependencias esenciales.",
      "Proyectos que buscan ocultar problemas de seguridad para publicar más rápido.",
      "Pedidos de garantizar una fecha o costo antes de inspeccionar el estado real.",
    ],
    process: [
      {
        title: "Congelar el riesgo",
        text: "Identifico datos sensibles, credenciales, despliegues activos y cambios que no deberían continuar hasta entender su impacto.",
      },
      {
        title: "Auditar con evidencia",
        text: "Ejecuto el proyecto, reviso arquitectura, dependencias, datos y seguridad, y documento problemas reproducibles en orden de impacto.",
      },
      {
        title: "Decidir rescate o reconstrucción parcial",
        text: "No todo código generado debe descartarse. Se conserva lo que tiene una base verificable y se reemplaza sólo lo que impide operar o evolucionar con seguridad.",
      },
      {
        title: "Estabilizar y publicar",
        text: "Agrego validaciones, pruebas, migraciones y un despliegue repetible antes de retomar nuevas funcionalidades.",
      },
    ],
    deliverables: [
      "Diagnóstico priorizado con evidencia y riesgos.",
      "Decisión explícita sobre qué conservar, corregir o reemplazar.",
      "Credenciales y configuración separadas del código.",
      "Pruebas sobre los flujos críticos y migraciones reproducibles.",
      "Procedimiento de build, deploy, rollback y mantenimiento.",
    ],
    caseSlug: "komuk",
    caseContext:
      "KOMUK es una referencia de IA integrada dentro de un producto operativo: el asistente convive con reglas de precios, proveedores y un backoffice que siguen siendo verificables.",
    questions: [
      {
        question: "¿Vas a reescribir todo el proyecto?",
        answer:
          "No por defecto. Primero se determina qué código tiene pruebas o comportamiento confiable. Reescribir sin diagnóstico puede eliminar valor y crear problemas nuevos.",
      },
      {
        question: "¿Se puede seguir usando IA después del rescate?",
        answer:
          "Sí, pero con contexto, límites y verificaciones. La IA puede acelerar cambios cuando conoce la arquitectura, los comandos de calidad y las áreas que requieren aprobación humana.",
      },
      {
        question: "¿Podés estimar sin ver el repositorio?",
        answer:
          "Sólo un rango muy general. La primera estimación útil aparece después de reproducir el sistema y revisar dependencias, datos, seguridad y estado del despliegue.",
      },
    ],
    cta: "Contame qué construiste, dónde está ejecutándose y cuál es el problema más urgente.",
  },
  {
    slug: "integracion-sistemas-datos",
    eyebrow: "Integración de sistemas y datos",
    title: "Una sola versión de los datos, aunque tu empresa use varias herramientas",
    description:
      "Integración de sistemas, APIs y datos para pymes que necesitan eliminar copias manuales y mantener reglas coherentes entre áreas.",
    lead:
      "Ventas, logística y finanzas pueden necesitar herramientas distintas. Eso no obliga a que cada una mantenga su propia versión de clientes, productos, stock o precios. La integración define quién es responsable de cada dato y cómo se propagan los cambios.",
    signals: [
      "Dos áreas muestran valores distintos para el mismo indicador.",
      "Alguien exporta, corrige y vuelve a importar archivos todas las semanas.",
      "Un cambio de precio o estado debe repetirse en varias herramientas.",
      "Las integraciones fallan sin dejar claro qué quedó actualizado.",
      "No existe una fuente de verdad acordada para datos centrales.",
    ],
    fit: [
      "Empresas que ya utilizan sistemas valiosos pero desconectados.",
      "Procesos con responsables claros para clientes, productos, pedidos o finanzas.",
      "Equipos que necesitan automatizar sin perder trazabilidad ni control manual.",
    ],
    notFit: [
      "Integraciones con servicios sin API, exportación o autorización de acceso.",
      "Proyectos donde nadie puede decidir qué sistema es dueño de cada dato.",
      "Sincronizaciones que pretenden ocultar problemas de calidad sin corregir el origen.",
    ],
    process: [
      {
        title: "Inventariar fuentes y responsables",
        text: "Documento qué sistemas existen, qué dato crea cada uno, quién lo modifica y cómo se resuelven hoy las diferencias.",
      },
      {
        title: "Definir contratos",
        text: "Acordamos formatos, identificadores, reglas de validación y qué debe ocurrir cuando un servicio no responde o envía información incompleta.",
      },
      {
        title: "Integrar un flujo crítico",
        text: "Empiezo por una sincronización con impacto visible, incorporando registros, reintentos e idempotencia para no duplicar operaciones.",
      },
      {
        title: "Observar y ampliar",
        text: "Medimos errores y tiempos del flujo real antes de conectar nuevas áreas o automatizar decisiones adicionales.",
      },
    ],
    deliverables: [
      "Mapa de sistemas, datos principales y fuentes de verdad.",
      "Contratos de integración y reglas de validación.",
      "Conectores o API con autenticación y manejo de errores.",
      "Registro de ejecuciones, reintentos y alertas operativas.",
      "Documentación para recuperar, mantener y ampliar la integración.",
    ],
    caseSlug: "komuk",
    caseContext:
      "KOMUK centraliza productos de múltiples proveedores y mantiene alineados catálogo, reglas de precios, presupuestos y backoffice comercial.",
    questions: [
      {
        question: "¿Hay que centralizar todo en un único sistema?",
        answer:
          "No. Cada herramienta puede conservar su especialidad. Lo importante es definir una fuente de verdad para cada dato y evitar que varias aplicaciones modifiquen lo mismo sin coordinación.",
      },
      {
        question: "¿Qué pasa si un proveedor externo se cae?",
        answer:
          "La integración debe registrar el intento, evitar duplicados y reintentar cuando corresponda. Los flujos críticos no deberían depender de que todos los servicios respondan al mismo tiempo.",
      },
      {
        question: "¿También trabajás con archivos Excel?",
        answer:
          "Sí. Una integración puede comenzar con importaciones y exportaciones controladas. Si el proceso demuestra valor, luego se evalúa una API o automatización más directa.",
      },
    ],
    cta: "Decime qué información copiás hoy, entre qué sistemas y qué ocurre cuando queda desactualizada.",
  },
] as const;

export function getServicioDetalle(slug: string) {
  return serviciosDetalle.find((servicio) => servicio.slug === slug);
}
