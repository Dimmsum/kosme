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
    <section className="py-[120px] px-12 bg-k-black overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="text-center mb-16">
          <SectionTag center>What they say</SectionTag>
          <h2 className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] font-light text-k-white tracking-tight3 leading-[1.1]">
            Voices from the
            <br />
            <em className="italic text-k-accent">Kosmè community</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map(({ quote, name, role, initial }, i) => (
            <Reveal key={name} delay={i * 0.1}>
              <div
                className="group bg-white/5 border border-white/8 rounded-3xl p-9 h-full
                           transition-all duration-300 hover:border-k-accent/40 hover:bg-white/8"
              >
                <p className="font-serif text-xl font-light text-k-white leading-[1.6] mb-7 before:content-['\201C'] before:text-k-accent before:text-3xl before:leading-[0] before:align-[-0.5rem] before:mr-1">
                  {quote}
                </p>
                <div className="flex items-center gap-3.5">
                  {/* Avatar — replace SVG with Image when you have photos */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-k-primary to-[#3D6B55] flex items-center justify-center font-serif text-lg text-k-accent font-medium">
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
