import Reveal from "./Reveal";
import SectionTag from "./SectionTag";

const testimonials = [
  {
    quote:
      "Kosmè gave me something no certificate could — a portfolio that shows every real client I've worked on, with my educator's signature on each one.",
    name: "Amara T.",
    role: "Cosmetology Student, Year 2",
    initial: "A",
  },
  {
    quote:
      "As an educator, the verification tools save me hours every week. I can review student work, leave precise feedback, and sign off — all from one dashboard.",
    name: "Marcus J.",
    role: "Senior Hair Educator",
    initial: "M",
  },
  {
    quote:
      "We hired our last three stylists directly from Kosmè portfolios. The verified session logs tell you far more than a CV ever could.",
    name: "Sophia R.",
    role: "Studio Owner & Employer",
    initial: "S",
  },
];

export default function Testimonials() {
  return (
    <section className="overflow-hidden bg-k-black px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="mb-12 text-center sm:mb-16">
          <SectionTag center>What they say</SectionTag>
          <h2 className="font-serif text-[clamp(2.3rem,10vw,3.5rem)] font-light leading-[1.05] tracking-tight3 text-k-white">
            Voices from the
            <br />
            <em className="italic text-k-accent">Kosmè community</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {testimonials.map(({ quote, name, role, initial }, i) => (
            <Reveal key={name} delay={i * 0.1}>
              <div
                className="group h-full rounded-3xl border border-white/8 bg-white/5 p-6 sm:p-8 md:p-9
                           transition-all duration-300 hover:border-k-accent/40 hover:bg-white/8"
              >
                <p className="mb-6 font-serif text-lg font-light leading-[1.7] text-k-white before:mr-1 before:text-3xl before:leading-[0] before:text-k-accent before:content-['\201C'] sm:mb-7 sm:text-xl">
                  {quote}
                </p>
                <div className="flex items-center gap-3.5">
                  {/* Avatar — replace SVG with Image when you have photos */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-k-primary to-[#7A2058] flex items-center justify-center font-serif text-lg text-k-accent font-medium">
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm text-k-white font-medium">{name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
