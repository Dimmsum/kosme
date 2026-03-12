import Reveal from "./Reveal";
import SectionTag from "./SectionTag";

const steps = [
  {
    num: "1",
    title: "Book a Session",
    body: "Students and volunteer clients connect through the platform. Sessions are scheduled, categorised, and linked to specific skill areas — from colour techniques to hair restoration.",
  },
  {
    num: "2",
    title: "Document the Work",
    body: "During and after the session, students record the techniques used, products applied, and outcomes achieved. Photo placeholders guide consistent, professional documentation.",
  },
  {
    num: "3",
    title: "Verify & Portfolio",
    body: "Educators review and verify the session record. Clients rate their experience. The verified entry is added to the student's professional portfolio, ready for employers to view.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
      <Reveal className="mb-14 text-center sm:mb-20">
        <SectionTag center>The Process</SectionTag>
        <h2 className="mb-5 font-serif text-[clamp(2.3rem,10vw,3.5rem)] font-light leading-[1.05] tracking-tight3">
          How Kosmè <em className="italic text-k-primary">works</em>
        </h2>
        <p className="mx-auto max-w-[480px] text-sm font-light leading-[1.75] text-k-gray-600 sm:text-base">
          A simple, repeatable workflow that turns every client session into
          verified career evidence.
        </p>
      </Reveal>

      <div className="relative grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3 md:gap-8">
        {/* Connecting line (desktop only) */}
        <div
          className="hidden md:block absolute top-[80px] left-[calc(16.66%+32px)] right-[calc(16.66%+32px)] h-px pointer-events-none"
          style={{
            background: "linear-gradient(90deg, #ee0384, #3B0A2A, #ee0384)",
            opacity: 0.35,
          }}
        />

        {steps.map(({ num, title, body }, i) => (
          <Reveal key={num} delay={i * 0.12}>
            <div
              className="group relative rounded-3xl bg-k-gray-100 px-6 py-8 sm:px-8 sm:py-10 md:px-9 md:py-11
                         transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)]"
            >
              <div
                className="mb-6 flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-k-gray-200 bg-k-white font-serif text-xl font-medium text-k-primary
                           sm:mb-7 sm:h-[60px] sm:w-[60px] sm:text-2xl
                           relative z-10 transition-all duration-300
                           group-hover:bg-k-accent group-hover:border-k-accent group-hover:text-k-white"
              >
                {num}
              </div>
              <h3 className="mb-3 font-serif text-[1.7rem] font-normal sm:mb-3.5 sm:text-2xl">
                {title}
              </h3>
              <p className="text-sm text-k-gray-600 leading-[1.7] font-light">
                {body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
