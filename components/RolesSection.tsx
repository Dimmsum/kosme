import Reveal from "./Reveal";
import SectionTag from "./SectionTag";

const roles = [
  {
    icon: "✂️",
    num: "01",
    title: "Students",
    body: "Document every session, build a verified portfolio, and graduate with proof of your skills that employers can actually assess.",
  },
  {
    icon: "🎓",
    num: "02",
    title: "Educators",
    body: "Guide, review, and verify student work through structured workflows. Track cohort progress and maintain academic standards with ease.",
  },
  {
    icon: "💆",
    num: "03",
    title: "Volunteer Clients",
    body: "Receive professional-quality services from supervised students, contribute to education, and provide structured feedback that powers growth.",
  },
  {
    icon: "🏢",
    num: "04",
    title: "Employers",
    body: "Access verified graduate portfolios and make confident hiring decisions based on structured evidence — not just interviews and references.",
  },
];

export default function RolesSection() {
  return (
    <section id="roles" className="py-[120px] px-12 bg-k-primary overflow-hidden relative">
      {/* Watermark */}
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[18vw] font-light pointer-events-none select-none"
        style={{ color: "rgba(255,255,255,0.03)", letterSpacing: "-0.05em", whiteSpace: "nowrap" }}
      >
        Kosmè
      </span>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <Reveal className="mb-18 flex flex-col md:flex-row md:justify-between md:items-end gap-8 mb-16">
          <div>
            <SectionTag light>Built for everyone</SectionTag>
            <h2 className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] font-light leading-[1.1] text-k-white tracking-tight3">
              Four roles,<br />
              <em className="italic text-k-accent">one platform</em>
            </h2>
          </div>
          <p className="text-sm text-white/50 max-w-[280px] leading-relaxed text-right">
            Kosmè works because it connects every person in the education journey — not just the student.
          </p>
        </Reveal>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0.5 rounded-3xl overflow-hidden">
          {roles.map(({ icon, num, title, body }, i) => (
            <Reveal key={num} delay={i * 0.1}>
              <div
                className="group relative bg-white/[0.06] p-10 cursor-none h-full
                           transition-colors duration-300 hover:bg-white/[0.11]
                           after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0
                           after:h-[3px] after:bg-k-accent after:scale-x-0
                           after:transition-transform after:duration-400
                           hover:after:scale-x-100"
              >
                <div className="w-12 h-12 rounded-xl bg-k-accent/15 flex items-center justify-center text-2xl mb-6">
                  {icon}
                </div>
                <span className="absolute top-7 right-7 font-serif text-sm text-white/20">{num}</span>
                <h3 className="font-serif text-2xl font-normal text-k-white mb-3.5 tracking-tight">
                  {title}
                </h3>
                <p className="text-sm text-white/50 leading-[1.7] font-light">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
