import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const founders = localFont({
  src: [
    { path: "../public/fonts/FoundersGrotesk-Regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/FoundersGrotesk-Medium.otf", weight: "500", style: "normal" },
  ],
  variable: "--font-founders",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: "%s | molpo",
  },
  description: site.description,
  applicationName: site.name,
  referrer: "origin-when-cross-origin",
  authors: [{ name: site.founder, url: site.url }],
  creator: site.founder,
  publisher: site.name,
  keywords: [
    "desarrollo de software",
    "software a medida",
    "sistemas para pymes",
    "rescatar sistemas con IA",
    "integración de datos",
    "programador Tucumán",
    "desarrollador de software Argentina",
    "auditoría de software",
    "molpo",
    "Matías Maldonado",
  ],
  alternates: {
    canonical: "/",
    languages: { "es-AR": "/" },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.socialTitle,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: site.backgroundColor },
    { media: "(prefers-color-scheme: dark)", color: "#09172B" },
  ],
};

/**
 * Layout raíz: sólo <html>, <body> y las fuentes. Nada de analítica ni JSON-LD,
 * que son del sitio público y viven en app/(sitio)/layout.tsx. Mantenerlo sin
 * headers() ni cookies() es lo que deja que las páginas de marketing sigan
 * siendo estáticas.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={site.lang}
      className={`${inter.variable} ${founders.variable}`}
      suppressHydrationWarning
    >
      <body style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();',
          }}
        />
        {children}
      </body>
    </html>
  );
}
