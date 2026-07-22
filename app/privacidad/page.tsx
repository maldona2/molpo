import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FloatingWa from "@/components/FloatingWa";
import { site } from "@/lib/site";
import styles from "./Privacidad.module.css";

const title = "Política de privacidad";
const description =
  "Cómo molpo trata los datos de contacto, las preferencias del sitio y la medición opcional con Google Analytics.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacidad/",
    languages: { "es-AR": "/privacidad/" },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: `${site.url}/privacidad/`,
    siteName: site.name,
    title: `${title} | molpo`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | molpo`,
    description,
  },
};

export default function PrivacidadPage() {
  return (
    <>
      <Nav />
      <main id="top">
        <header className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <p className={`eyebrow ${styles.eyebrowLight}`}>Información clara</p>
            <h1 className={styles.h1}>Política de privacidad</h1>
            <p className={styles.lead}>
              Qué información se trata al visitar molpo.com.ar o iniciar una conversación.
            </p>
            <p className={styles.updated}>Última actualización: 22 de julio de 2026.</p>
          </div>
        </header>

        <article className={styles.article}>
          <div className={`container ${styles.prose}`}>
            <p>
              El responsable de este sitio es Matías Maldonado, titular del estudio unipersonal molpo,
              con base en Tucumán, Argentina. Para cualquier consulta sobre esta política podés escribir
              a <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
            </p>

            <h2>Qué datos pueden tratarse</h2>
            <h3>Cuando te comunicás</h3>
            <p>
              Si escribís por email o WhatsApp se reciben los datos que decidas compartir, como nombre,
              medio de contacto, empresa y descripción de tu necesidad. Se usan para responder,
              evaluar si molpo puede ayudarte y continuar una relación comercial si ambas partes lo
              acuerdan.
            </p>

            <h3>Cuando navegás</h3>
            <p>
              El proveedor de infraestructura puede generar registros técnicos necesarios para operar
              y proteger el sitio, como fecha, dirección IP, URL solicitada y datos básicos del
              navegador. Molpo no utiliza esos registros para publicidad ni crea perfiles comerciales
              con ellos.
            </p>

            <h3>Analítica opcional</h3>
            <p>
              Si aceptás expresamente, se carga Google Analytics 4 para medir páginas vistas, origen
              aproximado de la visita, tipo de dispositivo y clics en enlaces de contacto. No se envían
              deliberadamente nombres, emails, teléfonos ni el contenido de tus mensajes. Las señales
              publicitarias y la personalización de anuncios permanecen desactivadas.
            </p>
            <p>
              Si rechazás, el script de Google Analytics no se carga. Podés cambiar la decisión desde
              “Preferencias de analítica” en el pie del sitio.
            </p>

            <h2>Cookies y almacenamiento local</h2>
            <ul>
              <li>
                <strong>Preferencia de tema:</strong> guarda localmente si elegiste modo claro u oscuro.
              </li>
              <li>
                <strong>Preferencia de analítica:</strong> guarda si aceptaste o rechazaste la medición.
              </li>
              <li>
                <strong>Cookies de Google Analytics:</strong> sólo pueden crearse después de aceptar.
              </li>
            </ul>
            <p>
              Las dos primeras preferencias son necesarias para recordar tus decisiones y no se usan
              para identificarte comercialmente.
            </p>

            <h2>Proveedores y transferencias</h2>
            <p>
              El sitio puede involucrar a Railway para infraestructura, Google Analytics para medición
              consentida y los proveedores correspondientes cuando elegís contactar por email o
              WhatsApp. Cada proveedor procesa información según sus propias condiciones y puede operar
              infraestructura fuera de Argentina.
            </p>
            <p>
              Molpo no vende datos personales ni los comparte con redes publicitarias. Sólo se limita el
              acceso a proveedores necesarios para prestar, medir con permiso o proteger el servicio.
            </p>

            <h2>Conservación y seguridad</h2>
            <p>
              Los datos de una consulta se conservan durante el tiempo necesario para responder,
              mantener antecedentes comerciales razonables o cumplir obligaciones aplicables. Los datos
              de analítica respetan la configuración de conservación de la propiedad de GA4. Molpo
              aplica medidas razonables para limitar el acceso, aunque ningún sistema conectado a
              Internet puede garantizar seguridad absoluta.
            </p>

            <h2>Tus derechos</h2>
            <p>
              Podés solicitar información, acceso, actualización, rectificación o supresión de tus
              datos escribiendo a <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> e
              indicando cómo verificar tu identidad y qué derecho querés ejercer. También podés retirar
              el consentimiento de analítica en cualquier momento desde el footer.
            </p>
            <p>
              La Agencia de Acceso a la Información Pública es la autoridad de aplicación de la Ley
              25.326. Encontrás información oficial sobre derechos y reclamos en el sitio de la{` `}
              <a
                href="https://www.argentina.gob.ar/aaip/datospersonales/derechos"
                target="_blank"
                rel="noopener noreferrer"
              >
                AAIP
              </a>
              .
            </p>

            <h2>Cambios en esta política</h2>
            <p>
              Si cambian las herramientas, finalidades o proveedores, esta página se actualizará antes
              de aplicar el nuevo tratamiento y mostrará una nueva fecha de actualización.
            </p>
          </div>
        </article>
      </main>
      <Footer />
      <FloatingWa />
    </>
  );
}
