import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Servicios from "@/components/Servicios";
import Proceso from "@/components/Proceso";
import Casos from "@/components/Casos";
import SobreMi from "@/components/SobreMi";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import FloatingWa from "@/components/FloatingWa";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
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
