import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FloatingWa from "@/components/FloatingWa";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import styles from "./ComoTrabajamos.module.css";

const pageTitle = "Cómo trabajamos";
const pageDescription =
  "Una metodología para construir software a medida que puede crecer sin duplicar datos, reglas ni problemas.";
const pageUrl = `${site.url}/como-trabajamos/`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "metodología de desarrollo de software",
    "arquitectura de software para pymes",
    "desarrollo de software por etapas",
    "integración de sistemas y datos",
  ],
  authors: [{ name: site.founder, url: site.url }],
  alternates: {
    canonical: "/como-trabajamos/",
    languages: { "es-AR": "/como-trabajamos/" },
  },
  openGraph: {
    type: "article",
    locale: site.locale,
    url: pageUrl,
    siteName: site.name,
    title: "Cómo trabajamos | molpo",
    description: pageDescription,
    authors: [`${site.url}/#matias`],
    section: "Metodología",
    images: [
      {
        url: site.socialImage.openGraph,
        width: site.socialImage.width,
        height: site.socialImage.height,
        alt: site.socialImage.alt,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cómo trabajamos | molpo",
    description: pageDescription,
    images: [
      {
        url: site.socialImage.twitter,
        width: site.socialImage.width,
        height: site.socialImage.height,
        alt: site.socialImage.alt,
      },
    ],
  },
};

const pageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      headline: "Software que puede cambiar sin romper lo que ya funciona",
      name: pageTitle,
      description: pageDescription,
      url: pageUrl,
      inLanguage: site.lang,
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      author: { "@id": `${site.url}/#matias` },
      publisher: { "@id": `${site.url}/#molpo` },
      about: { "@id": `${site.url}/#molpo` },
    },
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: `${pageTitle} | ${site.name}`,
      description: pageDescription,
      inLanguage: site.lang,
      isPartOf: { "@id": `${site.url}/#website` },
      mainEntity: { "@id": `${pageUrl}#article` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumbs`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${site.url}/` },
        { "@type": "ListItem", position: 2, name: pageTitle, item: pageUrl },
      ],
    },
  ],
};

export default function ComoTrabajamos() {
  const wa = site.contact.whatsappUrl;
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={`eyebrow ${styles.eyebrowLight}`}>Cómo trabajamos</p>
            <h1 className={styles.h1}>
              Software que puede cambiar sin romper lo que ya funciona
            </h1>
            <p className={styles.lead}>
              Una metodología para construir software a medida que puede crecer sin duplicar datos,
              reglas ni problemas.
            </p>
          </div>
        </header>

        <article className={styles.article}>
          <div className={`container ${styles.prose}`}>
            <p>
              Muchas empresas no tienen un solo sistema. Tienen una mezcla de planillas, aplicaciones,
              procesos manuales y herramientas que fueron apareciendo con el tiempo.
            </p>
            <p>
              El problema no es solamente que estén separadas. El problema es que cada una termina
              guardando su propia versión de los clientes, los productos, los precios, el stock o las
              reglas del negocio. Entonces, cuando algo cambia, alguien tiene que actualizarlo en
              varios lugares y esperar que ninguno quede desactualizado.
            </p>
            <p>Nuestra forma de trabajar parte de una idea simple:</p>
            <blockquote className={styles.quote}>
              <p>
                Lo importante se construye una sola vez. Las herramientas pueden cambiar sin copiar el
                corazón de la empresa.
              </p>
            </blockquote>
            <p>
              Por eso no empezamos diseñando pantallas aisladas. Primero entendemos qué información y
              qué reglas sostienen al negocio. Después construimos herramientas conectadas a esa base
              común.
            </p>
            <div className={styles.ctaRow}>
              <a href={wa} className={styles.cta} rel="noopener">
                <span className={styles.dot} aria-hidden="true" />
                Quiero conversar sobre mi empresa
              </a>
            </div>

            <h2>El problema de construir una aplicación para cada necesidad</h2>
            <p>
              Una empresa puede necesitar un sistema para ventas, otro para logística, un reporte para
              finanzas y una vista especial para dirección. Cada herramienta puede resolver bien su
              tarea y, aun así, crear un problema mayor si mantiene sus propios datos y cálculos.
            </p>
            <p>Cuando cada sistema trabaja por separado aparecen situaciones conocidas:</p>
            <ul>
              <li>un precio cambia en ventas, pero queda viejo en el reporte financiero;</li>
              <li>logística informa un stock diferente al que ve el equipo comercial;</li>
              <li>dos áreas calculan el mismo indicador de maneras distintas;</li>
              <li>una mejora pequeña exige modificar varias aplicaciones;</li>
              <li>nadie sabe con certeza cuál es la información correcta.</li>
            </ul>
            <p>
              Agregar más software no resuelve esto. A veces sólo agrega más lugares para mantener.
            </p>

            <h2>Nuestra metodología: cimientos compartidos, herramientas a medida</h2>
            <p>Pensamos el software como una construcción.</p>
            <p>
              Los <strong>cimientos</strong> son los datos y reglas que deben ser confiables: clientes,
              productos, pedidos, permisos, precios, stock y cualquier otra pieza central del negocio.
            </p>
            <p>
              Las <strong>habitaciones</strong> son las herramientas que cada equipo necesita: un
              tablero, un cotizador, un reporte, una pantalla de seguimiento o una automatización.
            </p>
            <p>
              Las habitaciones pueden ser distintas y cambiar con el tiempo. Los cimientos siguen
              siendo los mismos.
            </p>
            <p>
              Esto permite crear soluciones a medida sin volver a construir toda la empresa en cada
              proyecto.
            </p>

            <h2>Cómo trabajamos, paso a paso</h2>

            <h3>1. Entendemos el negocio antes de escribir código</h3>
            <p>Empezamos por el proceso real, no por una lista de funcionalidades.</p>
            <p>
              Observamos qué hace hoy cada persona, dónde se repite información, qué decisiones dependen
              de una planilla y qué errores generan trabajo manual. También identificamos qué reglas no
              pueden quedar libradas a interpretaciones.
            </p>
            <p>El resultado de esta etapa es un mapa claro de:</p>
            <ul>
              <li>la información que debe tener una sola fuente de verdad;</li>
              <li>las reglas que todos los sistemas deben respetar;</li>
              <li>las personas que necesitan consultar o modificar esa información;</li>
              <li>el primer problema que conviene resolver para demostrar valor.</li>
            </ul>

            <h3>2. Construimos una base confiable</h3>
            <p>
              Organizamos los datos y las reglas importantes en un núcleo común. Ese núcleo se convierte
              en la referencia para las herramientas actuales y futuras.
            </p>
            <p>
              No se trata de centralizar por gusto técnico. Se trata de evitar que cada nueva solución
              invente su propia versión del negocio.
            </p>
            <p>
              Una regla de precio, por ejemplo, se define una sola vez. Los sistemas que la necesitan la
              consultan. Si la regla cambia, no hay que corregirla manualmente en cinco lugares.
            </p>

            <h3>3. Creamos la primera herramienta alrededor de un problema concreto</h3>
            <p>No intentamos reemplazar toda la operación de una empresa de una sola vez.</p>
            <p>
              Elegimos un flujo con valor visible y construimos una herramienta conectada a los
              cimientos. Puede ser un reporte financiero, un seguimiento de cobranzas, un cotizador o
              una pantalla de stock.
            </p>
            <p>
              Así obtenemos evidencia rápidamente, aprendemos con uso real y evitamos invertir meses en
              una plataforma que todavía no fue probada por quienes la van a usar.
            </p>

            <h3>4. Usamos IA dentro de un marco de trabajo</h3>
            <p>
              La inteligencia artificial puede acelerar mucho la construcción, pero velocidad sin
              dirección sólo permite equivocarse más rápido.
            </p>
            <p>
              Por eso la IA no recibe acceso libre para improvisar. Trabaja con un contrato que le
              explica:
            </p>
            <ul>
              <li>qué objetivo debe resolver;</li>
              <li>qué datos puede consultar;</li>
              <li>qué partes no debe modificar;</li>
              <li>qué reglas debe respetar;</li>
              <li>cómo revisar y probar su trabajo;</li>
              <li>cuándo debe detenerse y pedir una decisión humana.</li>
            </ul>
            <p>
              Una persona puede describir una necesidad con palabras simples. El proceso interno se
              ocupa de clasificarla, planificar cuando hace falta, construir, revisar, probar y explicar
              el resultado.
            </p>

            <h3>5. Ajustamos el proceso al riesgo de cada cambio</h3>
            <p>
              No convertimos una corrección de texto en una ceremonia. Tampoco tratamos un cambio de
              datos o permisos como si fuera un detalle visual.
            </p>
            <p>El nivel de proceso depende del impacto:</p>
            <ul>
              <li>
                un ajuste pequeño puede resolverse de forma directa y verificarse con una prueba
                cercana;
              </li>
              <li>un error debe reproducirse, corregirse y quedar cubierto para que no vuelva;</li>
              <li>una nueva funcionalidad necesita un plan breve, revisión y pruebas;</li>
              <li>
                un cambio de arquitectura, datos o seguridad requiere alternativas y aprobación antes de
                construir;
              </li>
              <li>una publicación o acción destructiva siempre necesita autorización explícita.</li>
            </ul>
            <p>
              La metodología agrega disciplina donde reduce riesgo y evita burocracia donde no aporta
              valor.
            </p>

            <h3>6. Entregamos evidencia, no promesas</h3>
            <p>
              Una tarea no está terminada porque alguien diga “ya está”. Está terminada cuando existe
              evidencia de que funciona.
            </p>
            <p>Según el cambio, esa evidencia puede incluir:</p>
            <ul>
              <li>pruebas automáticas;</li>
              <li>una compilación completa;</li>
              <li>revisión de los archivos modificados;</li>
              <li>una comprobación visual;</li>
              <li>una prueba contra datos reales;</li>
              <li>una explicación clara de qué cambió y qué debería mirar el cliente.</li>
            </ul>
            <p>Si algo no pudo probarse, se informa. No se presenta como terminado.</p>

            <h2>Qué lugar ocupa la IA</h2>
            <p>No vendemos la idea de reemplazar criterio humano con un botón.</p>
            <p>
              Usamos IA para reducir el tiempo entre una necesidad y una primera solución útil: explorar
              alternativas, preparar planes, escribir código, detectar problemas y ejecutar
              verificaciones. Las decisiones importantes siguen teniendo responsables humanos.
            </p>
            <p>
              La diferencia no está solamente en usar IA. Está en darle contexto, límites y una
              definición verificable de “terminado”.
            </p>
            <p>
              Eso permite que una empresa avance más rápido sin convertir cada experimento en deuda
              técnica.
            </p>

            <h2>Un ejemplo: Cimientos</h2>
            <p>
              Construimos <strong>Cimientos</strong> para mostrar esta metodología funcionando.
            </p>
            <p>
              En la demostración, una distribuidora tiene herramientas distintas para logística,
              distribuidores y finanzas. Todas consultan los mismos productos, clientes, pedidos, stock
              y reglas de precio.
            </p>
            <p>Cuando cambia el margen:</p>
            <ul>
              <li>el nuevo precio se calcula en un solo lugar;</li>
              <li>las herramientas conectadas reciben el valor actualizado;</li>
              <li>los pedidos históricos conservan el precio que tenían al confirmarse;</li>
              <li>ninguna persona tiene que reconciliar varias planillas.</li>
            </ul>
            <p>
              Cuando alguien necesita una herramienta nueva, recibe un proyecto ya conectado y preparado
              para trabajar con IA. Si falta una capacidad central, la herramienta no inventa datos ni
              crea una copia: registra la necesidad para que se resuelva en el lugar correcto.
            </p>
            <p>
              Cimientos no es una plantilla para todas las empresas. Es una prueba visible de la forma en
              que diseñamos sistemas que pueden evolucionar.
            </p>

            <h2>Qué obtiene la empresa</h2>
            <p>El resultado no es solamente una aplicación.</p>
            <p>La empresa obtiene:</p>
            <ul>
              <li>una base clara para sus datos y reglas principales;</li>
              <li>una primera herramienta enfocada en un problema concreto;</li>
              <li>una forma segura de crear nuevas herramientas conectadas;</li>
              <li>documentación para personas, desarrolladores y asistentes de IA;</li>
              <li>pruebas y criterios de calidad que acompañan los cambios;</li>
              <li>menos dependencia de procesos manuales y versiones duplicadas.</li>
            </ul>
            <p>
              Cada nueva necesidad deja de ser un proyecto que empieza desde cero. Se convierte en una
              extensión de una estructura que ya existe.
            </p>

            <h2>Cómo empezamos</h2>
            <p>
              El primer paso no es comprar una plataforma ni reemplazar todos los sistemas actuales.
            </p>
            <p>
              Empezamos con una conversación para elegir un proceso donde hoy existan datos repetidos,
              trabajo manual o decisiones difíciles de verificar. Mapeamos ese flujo, definimos qué
              debería vivir una sola vez y proponemos una primera herramienta que permita comprobar el
              enfoque con uso real.
            </p>
            <blockquote className={styles.quote}>
              <p>
                No construimos más pantallas desconectadas. Construimos una base confiable y la capacidad
                de mejorar sobre ella.
              </p>
            </blockquote>
            <div className={styles.ctaRow}>
              <a href={wa} className={styles.cta} rel="noopener">
                <span className={styles.dot} aria-hidden="true" />
                Contanos qué proceso querés mejorar
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
      <FloatingWa />
    </>
  );
}
