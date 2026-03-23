import { Scissors, GraduationCap, Heart, Building2 } from "lucide-react";
import Reveal from "./Reveal";
import SectionTag from "./SectionTag";
import { type ReactNode } from "react";

const roles: { icon: ReactNode; num: string; title: string; body: string }[] = [
  {
    icon: <Scissors size={22} />,
    num: "01",
    title: "Students",
    body: "Document every session, build a verified portfolio, and graduate with proof of your skills that employers can actually assess.",
  },
  {
    icon: <GraduationCap size={22} />,
    num: "02",
    title: "Educators",
    body: "Guide, review, and verify student work through structured workflows. Track cohort progress and maintain academic standards with ease.",
  },
  {
    icon: <Heart size={22} />,
    num: "03",
    title: "Volunteer Clients",
    body: "Receive professional-quality services from supervised students, contribute to education, and provide structured feedback that powers growth.",
  },
  {
    icon: <Building2 size={22} />,
    num: "04",
    title: "Employers",
    body: "Access verified graduate portfolios and make confident hiring decisions based on structured evidence — not just interviews and references.",
  },
];

export default function RolesSection() {
  return (
    <section
      id="roles"
      className="relative overflow-hidden bg-k-primary px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]"
    >
      {/* Watermark */}
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-serif text-[30vw] font-light md:text-[18vw]"
        style={{
          color: "rgba(255,255,255,0.03)",
          letterSpacing: "-0.05em",
          whiteSpace: "nowrap",
        }}
      >
        Kosmè
      </span>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <Reveal className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <SectionTag light>Built for everyone</SectionTag>
            <h2 className="font-serif text-[clamp(2.3rem,10vw,3.5rem)] font-light leading-[1.05] tracking-tight3 text-k-white">
              Four roles,
              <br />
              <em className="italic text-k-accent">one platform</em>
            </h2>
          </div>
          <p className="max-w-[320px] text-sm leading-relaxed text-white/50 md:text-right">
            Kosmè works because it connects every person in the education
            journey — not just the student.
          </p>
        </Reveal>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0.5 rounded-3xl overflow-hidden">
          {roles.map(({ icon, num, title, body }, i) => (
            <Reveal key={num} delay={i * 0.1}>
              <div
                className="group relative h-full bg-white/[0.06] p-7 sm:p-8 lg:p-10
                           transition-colors duration-300 hover:bg-white/[0.11]
                           after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0
                           after:h-[3px] after:bg-k-accent after:scale-x-0
                           after:transition-transform after:duration-400
                           hover:after:scale-x-100"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-k-accent/15 text-k-accent sm:mb-6">
                  {icon}
                </div>
                <span className="absolute right-6 top-6 font-serif text-sm text-white/20 sm:right-7 sm:top-7">
                  {num}
                </span>
                <h3 className="mb-3 font-serif text-[1.75rem] font-normal tracking-tight text-k-white sm:mb-3.5 sm:text-2xl">
                  {title}
                </h3>
                <p className="text-sm text-white/50 leading-[1.7] font-light">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
