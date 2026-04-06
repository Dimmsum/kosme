import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import MarqueeStrip from "@/components/MarqueeStrip";
import WhySection from "@/components/WhySection";
import RolesSection from "@/components/RolesSection";
import HowItWorks from "@/components/HowItWorks";
import ServicesSection from "@/components/ServicesSection";
import ProofSection from "@/components/ProofSection";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <MarqueeStrip />
        <WhySection />
        <RolesSection />
        <HowItWorks />
        <ServicesSection />
        <ProofSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
