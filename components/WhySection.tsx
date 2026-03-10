import Reveal from "./Reveal";
import SectionTag from "./SectionTag";
import PersonPlaceholder from "./PersonPlaceholder";

const cards = [
  {
    num: "01",
    title: "Structured Practice Workflows",
    body: "Every client session follows a guided process that captures the work done, the techniques applied, and the results achieved — all tied to your growing portfolio.",
  },
  {
    num: "02",
    title: "Educator-Verified Records",
    body: "Instructors review and sign off on student work directly in the platform, creating an unbroken chain of verified evidence that carries real professional weight.",
  },
  {
    num: "03",
    title: "Employer-Ready Portfolios",
    body: "When students are ready to enter the workforce, their Kosmè portfolio is a complete, credible record — not a collection of photos on a phone.",
  },
];

export default function WhySection() {
  return (
    <section className="py-[120px] px-12">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
        {/* Left */}
        <Reveal>
          <SectionTag>Why Kosmè</SectionTag>
          <h2 className="font-serif text-[clamp(2.5rem,4.5vw,4rem)] font-light leading-[1.1] tracking-tight3 mb-7">
            The gap between<br />
            <em className="italic text-k-primary">training and trust</em><br />
            ends here
          </h2>
          <p className="text-base leading-[1.75] text-k-gray-600 max-w-[440px] font-light mb-12">
            Cosmetology students spend hundreds of hours perfecting their craft — yet have no
            structured way to prove it. Kosmè bridges that gap with a platform that documents
            every session, verifies every skill, and builds portfolios that employers trust.
          </p>

          <div className="flex flex-col gap-5">
            {cards.map(({ num, title, body }, i) => (
              <Reveal key={num} delay={i * 0.1 + 0.1}>
                <div
                  className="group border border-k-gray-200 rounded-2xl px-8 py-7 bg-k-white
                             cursor-none grid grid-cols-[auto_1fr] gap-5 items-start
                             transition-all duration-300
                             hover:border-k-accent hover:translate-x-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)]"
                >
                  <span className="font-serif text-lg text-k-accent font-medium pt-0.5">{num}</span>
                  <div>
                    <h3 className="font-serif text-xl font-medium mb-2">{title}</h3>
                    <p className="text-sm text-k-gray-600 leading-[1.65] font-light">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Right — image */}
        <Reveal direction="right" className="relative">
          <div className="aspect-[4/5] rounded-[28px] overflow-hidden relative flex items-end justify-center bg-gradient-to-br from-k-primary to-[#0D2318]">
            {/*
              ↓ Replace PersonPlaceholder with:
                <Image src="/why-person.jpg" fill alt="Cosmetology student" className="object-cover object-top" />
            */}
            <div className="w-[70%] opacity-80">
              <PersonPlaceholder size="lg" label="Replace with photo" />
            </div>

            {/* Caption overlay */}
            <div className="absolute bottom-7 left-7 right-7 bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-[18px] text-k-white">
              <strong className="font-serif text-xl font-normal block mb-1">Your Kosmè Portfolio</strong>
              <span className="text-[0.78rem] opacity-60">Verified · Structured · Professional</span>
            </div>
          </div>

          {/* Decorative rings */}
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full border border-k-accent opacity-40 pointer-events-none" />
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full border border-k-accent opacity-20 pointer-events-none" />
        </Reveal>
      </div>
    </section>
  );
}
