import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import Servicios from "@/components/Servicios";
import Proceso from "@/components/Proceso";
import Casos from "@/components/Casos";
import SobreMi from "@/components/SobreMi";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import FloatingWa from "@/components/FloatingWa";
import JsonLd from "@/components/JsonLd";
import { homePageJsonLd } from "@/lib/jsonld";

export default function Home() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <Servicios />
        <Proceso />
        <Casos />
        <SobreMi />
        <CtaFinal />
      </main>
      <Footer />
      <FloatingWa />
    </>
  );
}
