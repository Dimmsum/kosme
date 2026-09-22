import Nav from "@/components/Nav";
import VideoPopup from "@/components/VideoPopup";
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
      <VideoPopup />
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
