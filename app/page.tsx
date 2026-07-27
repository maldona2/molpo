import Hero from "@/components/Hero";
import HeroCurtain from "@/components/HeroCurtain";
import StackDeck from "@/components/StackDeck";
import TrustStrip from "@/components/TrustStrip";
import Servicios from "@/components/Servicios";
import Proceso from "@/components/Proceso";
import Casos from "@/components/Casos";
import SobreMi from "@/components/SobreMi";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { homePageJsonLd } from "@/lib/jsonld";

export default function Home() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <main>
        <HeroCurtain>
          <Hero />
        </HeroCurtain>
        <StackDeck>
          <div>
            <TrustStrip />
            <Servicios />
          </div>
          <Proceso />
          <Casos />
          <SobreMi />
          <div>
            <CtaFinal />
            <Footer />
          </div>
        </StackDeck>
      </main>
    </>
  );
}
