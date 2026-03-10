import Reveal from "./Reveal";
import SectionTag from "./SectionTag";

export default function CtaSection() {
  return (
    <section id="cta" className="py-[140px] px-12 text-center relative overflow-hidden">
      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(29,58,47,0.08) 0%, transparent 70%)" }}
      />

      <Reveal className="relative z-10 max-w-[1400px] mx-auto">
        <SectionTag center>Join Kosmè</SectionTag>
        <h2 className="font-serif text-[clamp(3rem,5vw,5rem)] font-light leading-[1.0] tracking-tight4 mb-7">
          Ready to build<br />
          something <em className="italic text-k-primary">real?</em>
        </h2>
        <p className="text-[1.05rem] text-k-gray-600 max-w-[520px] mx-auto font-light leading-[1.7] mb-12">
          Whether you&apos;re a student, educator, client, or employer — Kosmè has a place for you.
          Join the platform that finally takes cosmetology education seriously.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="#"
            className="bg-k-primary text-k-white font-medium px-10 py-4 rounded-full text-base tracking-wide no-underline
                       shadow-[0_4px_20px_rgba(29,58,47,0.25)] transition-all duration-200
                       hover:bg-k-primary-light hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(29,58,47,0.3)]"
          >
            Create your account
          </a>
          <a
            href="#"
            className="text-k-black font-normal text-base tracking-wide no-underline inline-flex items-center gap-2
                       transition-[gap] duration-200 hover:gap-3.5"
          >
            Request a demo <span className="text-lg">→</span>
          </a>
        </div>
      </Reveal>
    </section>
  );
}
