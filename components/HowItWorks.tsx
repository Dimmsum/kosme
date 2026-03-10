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
    <section id="how" className="py-[120px] px-12 max-w-[1400px] mx-auto">
      <Reveal className="text-center mb-20">
        <SectionTag center>The Process</SectionTag>
        <h2 className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] font-light tracking-tight3 leading-[1.1] mb-5">
          How Kosmè <em className="italic text-k-primary">works</em>
        </h2>
        <p className="text-base text-k-gray-600 font-light max-w-[480px] mx-auto leading-[1.7]">
          A simple, repeatable workflow that turns every client session into
          verified career evidence.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Connecting line (desktop only) */}
        <div
          className="hidden md:block absolute top-[80px] left-[calc(16.66%+32px)] right-[calc(16.66%+32px)] h-px pointer-events-none"
          style={{
            background: "linear-gradient(90deg, #C8A96E, #1D3A2F, #C8A96E)",
            opacity: 0.35,
          }}
        />

        {steps.map(({ num, title, body }, i) => (
          <Reveal key={num} delay={i * 0.12}>
            <div
              className="group bg-k-gray-100 rounded-3xl px-9 py-11 relative
                         transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)]"
            >
              <div
                className="w-[60px] h-[60px] rounded-full bg-k-white border-2 border-k-gray-200
                           flex items-center justify-center font-serif text-2xl font-medium text-k-primary mb-7
                           relative z-10 transition-all duration-300
                           group-hover:bg-k-accent group-hover:border-k-accent group-hover:text-k-white"
              >
                {num}
              </div>
              <h3 className="font-serif text-2xl font-normal mb-3.5">
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
