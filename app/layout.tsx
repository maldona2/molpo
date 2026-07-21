import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import { site } from "@/lib/site";
import { jsonLd } from "@/lib/jsonld";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const founders = localFont({
  src: [
    { path: "../public/fonts/FoundersGrotesk-Regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/FoundersGrotesk-Medium.otf", weight: "500", style: "normal" },
  ],
  variable: "--font-founders",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "molpo — Desarrollo de software para pymes | Tucumán",
    template: "%s | molpo",
  },
  description: site.description,
  applicationName: site.name,
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
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: "molpo — Sistemas que sostienen tu empresa, no que la complican",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "molpo — Desarrollo de software para pymes | Tucumán",
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.lang} className={`${inter.variable} ${founders.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();',
          }}
        />
      </head>
      <body style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
