import Reveal from "./Reveal";
import SectionTag from "./SectionTag";
import Image from "next/image";

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
    <section className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-12 md:grid-cols-2 md:gap-20">
        {/* Left */}
        <Reveal>
          <SectionTag>Why Kosmè</SectionTag>
          <h2 className="mb-6 font-serif text-[clamp(2.3rem,10vw,4rem)] font-light leading-[1.05] tracking-tight3 sm:mb-7">
            The gap between
            <br />
            <em className="italic text-k-primary">training and trust</em>
            <br />
            ends here
          </h2>
          <p className="mb-10 max-w-[440px] text-sm font-light leading-[1.8] text-k-gray-600 sm:mb-12 sm:text-base">
            Cosmetology students spend hundreds of hours perfecting their craft
            — yet have no structured way to prove it. Kosmè bridges that gap
            with a platform that documents every session, verifies every skill,
            and builds portfolios that employers trust.
          </p>

          <div className="flex flex-col gap-5">
            {cards.map(({ num, title, body }, i) => (
              <Reveal key={num} delay={i * 0.1 + 0.1}>
                <div
                  className="group grid items-start gap-4 rounded-2xl border border-k-gray-200 bg-k-white px-5 py-6
                             sm:grid-cols-[auto_1fr] sm:gap-5 sm:px-8 sm:py-7
                             transition-all duration-300
                             hover:border-k-accent sm:hover:translate-x-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)]"
                >
                  <span className="font-serif text-lg text-k-accent font-medium pt-0.5">
                    {num}
                  </span>
                  <div>
                    <h3 className="font-serif text-xl font-medium mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-k-gray-600 leading-[1.65] font-light">
                      {body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Right — image */}
        <Reveal direction="right" className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-gradient-to-br from-k-primary to-[#200818] sm:rounded-[28px]">
            <Image
              src="/cosmetology-student.jpg"
              alt="Cosmetology student in a salon"
              fill
              className="object-cover object-top"
            />

            {/* Caption overlay */}
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-k-white backdrop-blur-xl sm:bottom-7 sm:left-7 sm:right-7 sm:px-5 sm:py-[18px]">
              <strong className="mb-1 block font-serif text-lg font-normal sm:text-xl">
                Your Kosmè Portfolio
              </strong>
              <span className="text-[0.72rem] opacity-60 sm:text-[0.78rem]">
                Verified · Structured · Professional
              </span>
            </div>
          </div>

          {/* Decorative rings */}
          <div className="pointer-events-none absolute -right-4 -top-4 hidden h-16 w-16 rounded-full border border-k-accent opacity-40 sm:block md:h-20 md:w-20" />
          <div className="pointer-events-none absolute -right-2 -top-2 hidden h-10 w-10 rounded-full border border-k-accent opacity-20 sm:block md:h-14 md:w-14" />
        </Reveal>
      </div>
    </section>
  );
}
